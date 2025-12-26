#!/usr/bin/env python3
"""
Nebula DNS - Domain Category Loader

Loads domain categorization data into Redis for policy evaluation.
Supports multiple data sources and formats.

Usage:
    python category-loader.py --source=shallalist --redis-url=redis://localhost:6379
    python category-loader.py --source=file --file=categories.csv
"""

import argparse
import csv
import gzip
import logging
import os
import sys
import tarfile
import tempfile
import urllib.request
from typing import Dict, Generator, Tuple

import redis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Category mappings (normalize different sources to our categories)
CATEGORY_MAPPING = {
    # ==================== SHALLALIST MAPPINGS ====================
    'adv': 'ads',
    'aggressive': 'violence',
    'alcohol': 'alcohol',
    'anonvpn': 'vpn',
    'automobile': 'automotive',
    'chat': 'chat',
    'costtraps': 'scam',
    'dating': 'dating',
    'downloads': 'downloads',
    'drugs': 'drugs',
    'dynamic': 'dynamic_dns',
    'education': 'education',
    'finance': 'finance',
    'fortunetelling': 'occult',
    'forum': 'forums',
    'gamble': 'gambling',
    'government': 'government',
    'hacking': 'hacking',
    'hobby': 'hobbies',
    'homestyle': 'lifestyle',
    'hospitals': 'healthcare',
    'imagehosting': 'image_hosting',
    'isp': 'isp',
    'jobsearch': 'jobs',
    'library': 'reference',
    'military': 'military',
    'models': 'adult',
    'movies': 'streaming',
    'music': 'music',
    'news': 'news',
    'podcasts': 'podcasts',
    'politics': 'politics',
    'porn': 'adult',
    'radiotv': 'streaming',
    'recreation': 'recreation',
    'redirector': 'proxy',
    'religion': 'religion',
    'remoteaccess': 'remote_access',
    'ringtones': 'mobile',
    'science': 'science',
    'searchengines': 'search_engines',
    'sex': 'adult',
    'shopping': 'shopping',
    'socialnet': 'social_media',
    'spyware': 'malware',
    'tracker': 'tracking',
    'updatesites': 'software_updates',
    'urlshortener': 'url_shorteners',
    'violence': 'violence',
    'warez': 'piracy',
    'weapons': 'weapons',
    'webmail': 'email',
    'webphone': 'voip',
    'webradio': 'streaming',
    'webtv': 'streaming',

    # ==================== UT1 / TOULOUSE MAPPINGS ====================
    'adult': 'adult',
    'arjel': 'gambling',  # French gambling authority approved
    'associations_religieuses': 'religion',
    'astrology': 'occult',
    'audio-video': 'streaming',
    'bank': 'finance',
    'bitcoin': 'cryptocurrency',
    'blog': 'blogs',
    'celebrity': 'entertainment',
    'cooking': 'lifestyle',
    'cryptojacking': 'cryptominer',
    'ddos': 'malware',
    'dialer': 'malware',
    'filehosting': 'file_sharing',
    'financial': 'finance',
    'games': 'gaming',
    'lingerie': 'adult',
    'liste_blanche': 'allowlist',
    'malware': 'malware',
    'manga': 'entertainment',
    'marketingware': 'ads',
    'mixed_adult': 'adult',
    'mobile-phone': 'mobile',
    'phishing': 'phishing',
    'press': 'news',
    'publicite': 'ads',
    'reaffected': 'proxy',
    'sect': 'religion',
    'sexual_education': 'education',
    'shortener': 'url_shorteners',
    'social_networks': 'social_media',
    'sports': 'sports',
    'strict_redirector': 'proxy',
    'strong_redirector': 'proxy',
    'tricheur': 'scam',
    'vpn': 'vpn',
    'warez': 'piracy',

    # ==================== ADDITIONAL COMMON MAPPINGS ====================
    'advertisement': 'ads',
    'advertising': 'ads',
    'analytics': 'tracking',
    'anonymizer': 'proxy',
    'betting': 'gambling',
    'casino': 'gambling',
    'cryptocurrency': 'cryptocurrency',
    'crypto': 'cryptocurrency',
    'ecommerce': 'shopping',
    'filesharing': 'file_sharing',
    'gambling': 'gambling',
    'games': 'gaming',
    'instant_messaging': 'chat',
    'lottery': 'gambling',
    'marijuana': 'drugs',
    'nudity': 'adult',
    'online-games': 'gaming',
    'p2p': 'file_sharing',
    'pornography': 'adult',
    'proxy-avoidance': 'proxy',
    'remote-access': 'remote_access',
    'social': 'social_media',
    'social-network': 'social_media',
    'socialmedia': 'social_media',
    'sports': 'sports',
    'tobacco': 'drugs',
    'torrents': 'file_sharing',
    'video': 'streaming',
    'web-based-email': 'email',
}


def download_shallalist() -> str:
    """Download and extract Shallalist data."""
    url = "http://www.shallalist.de/Downloads/shallalist.tar.gz"
    
    logger.info(f"Downloading Shallalist from {url}")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_path = os.path.join(tmpdir, "shallalist.tar.gz")
        
        # Download
        urllib.request.urlretrieve(url, archive_path)
        logger.info(f"Downloaded to {archive_path}")
        
        # Extract
        extract_path = os.path.join(tmpdir, "extracted")
        os.makedirs(extract_path)
        
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(extract_path)
        
        return extract_path


def parse_shallalist(path: str) -> Generator[Tuple[str, str], None, None]:
    """Parse Shallalist directory structure."""
    bl_path = os.path.join(path, "BL")
    
    if not os.path.exists(bl_path):
        raise ValueError(f"BL directory not found in {path}")
    
    for category in os.listdir(bl_path):
        category_path = os.path.join(bl_path, category)
        
        if not os.path.isdir(category_path):
            continue
        
        # Map to our category
        mapped_category = CATEGORY_MAPPING.get(category, category)
        
        # Read domains file
        domains_file = os.path.join(category_path, "domains")
        if os.path.exists(domains_file):
            with open(domains_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    domain = line.strip().lower()
                    if domain and not domain.startswith('#'):
                        yield domain, mapped_category


def parse_csv_file(filepath: str) -> Generator[Tuple[str, str], None, None]:
    """Parse CSV file with domain,category format."""
    opener = gzip.open if filepath.endswith('.gz') else open
    
    with opener(filepath, 'rt', encoding='utf-8', errors='ignore') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                domain = row[0].strip().lower()
                category = row[1].strip().lower()
                if domain and not domain.startswith('#'):
                    yield domain, category


def load_to_redis(
    redis_client: redis.Redis,
    data: Generator[Tuple[str, str], None, None],
    batch_size: int = 10000,
    key_prefix: str = "category:"
) -> int:
    """Load domain categories to Redis."""
    count = 0
    pipeline = redis_client.pipeline()
    
    for domain, category in data:
        pipeline.set(f"{key_prefix}{domain}", category)
        count += 1
        
        if count % batch_size == 0:
            pipeline.execute()
            pipeline = redis_client.pipeline()
            logger.info(f"Loaded {count} domains...")
    
    # Execute remaining
    if count % batch_size != 0:
        pipeline.execute()
    
    logger.info(f"Total domains loaded: {count}")
    return count


def get_stats(redis_client: redis.Redis, key_prefix: str = "category:") -> Dict[str, int]:
    """Get category statistics from Redis."""
    stats = {}
    cursor = 0
    
    while True:
        cursor, keys = redis_client.scan(cursor, match=f"{key_prefix}*", count=10000)
        
        for key in keys:
            category = redis_client.get(key)
            if category:
                category = category.decode() if isinstance(category, bytes) else category
                stats[category] = stats.get(category, 0) + 1
        
        if cursor == 0:
            break
    
    return stats


def main():
    parser = argparse.ArgumentParser(description='Load domain categories to Redis')
    parser.add_argument('--source', choices=['shallalist', 'file'], default='shallalist',
                        help='Data source')
    parser.add_argument('--file', help='Path to CSV file (for file source)')
    parser.add_argument('--redis-url', default='redis://localhost:6379',
                        help='Redis URL')
    parser.add_argument('--key-prefix', default='category:',
                        help='Redis key prefix')
    parser.add_argument('--stats-only', action='store_true',
                        help='Only show statistics')
    
    args = parser.parse_args()
    
    # Connect to Redis
    redis_client = redis.from_url(args.redis_url)
    
    try:
        redis_client.ping()
        logger.info(f"Connected to Redis at {args.redis_url}")
    except redis.ConnectionError as e:
        logger.error(f"Failed to connect to Redis: {e}")
        sys.exit(1)
    
    if args.stats_only:
        stats = get_stats(redis_client, args.key_prefix)
        print("\nCategory Statistics:")
        print("-" * 40)
        for category, count in sorted(stats.items(), key=lambda x: -x[1]):
            print(f"  {category}: {count:,}")
        print("-" * 40)
        print(f"  Total: {sum(stats.values()):,}")
        return
    
    # Load data
    if args.source == 'shallalist':
        path = download_shallalist()
        data = parse_shallalist(path)
    elif args.source == 'file':
        if not args.file:
            logger.error("--file is required for file source")
            sys.exit(1)
        data = parse_csv_file(args.file)
    else:
        logger.error(f"Unknown source: {args.source}")
        sys.exit(1)
    
    # Load to Redis
    count = load_to_redis(redis_client, data, key_prefix=args.key_prefix)
    
    # Publish invalidation message
    redis_client.publish("nebula:invalidate", '{"type":"categories"}')
    logger.info("Published cache invalidation message")
    
    print(f"\nSuccessfully loaded {count:,} domain categories")


if __name__ == '__main__':
    main()
