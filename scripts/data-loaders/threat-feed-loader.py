#!/usr/bin/env python3
"""
Nebula DNS - Threat Feed Loader

Loads threat intelligence data into Redis for real-time blocking.
Supports multiple threat feeds.

Usage:
    python threat-feed-loader.py --feeds=urlhaus,phishtank --redis-url=redis://localhost:6379
    python threat-feed-loader.py --feed-file=threats.txt --threat-type=malware
"""

import argparse
import csv
import gzip
import json
import logging
import os
import sys
import tempfile
import urllib.request
from datetime import datetime, timedelta
from typing import Dict, Generator, List, Set, Tuple
from urllib.parse import urlparse

import redis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Threat feed configurations
THREAT_FEEDS = {
    # ==================== MALWARE ====================
    'urlhaus': {
        'url': 'https://urlhaus.abuse.ch/downloads/csv_online/',
        'format': 'csv',
        'domain_column': 2,  # URL column (extract domain)
        'threat_type': 'malware',
        'description': 'URLhaus Malware URLs',
    },
    'urlhaus_domains': {
        'url': 'https://urlhaus.abuse.ch/downloads/hostfile/',
        'format': 'hostfile',
        'threat_type': 'malware',
        'description': 'URLhaus Malware Domains',
    },
    'abuse_ch_ssl': {
        'url': 'https://sslbl.abuse.ch/blacklist/sslblacklist.csv',
        'format': 'csv',
        'domain_column': 1,
        'threat_type': 'malware',
        'description': 'Abuse.ch SSL Blacklist',
    },
    'malwaredomains': {
        'url': 'https://mirror1.malwaredomains.com/files/justdomains',
        'format': 'domains',
        'threat_type': 'malware',
        'description': 'Malware Domains List',
    },
    'disconnect_malware': {
        'url': 'https://s3.amazonaws.com/lists.disconnect.me/simple_malware.txt',
        'format': 'domains',
        'threat_type': 'malware',
        'description': 'Disconnect Malware List',
    },

    # ==================== PHISHING ====================
    'phishtank': {
        'url': 'http://data.phishtank.com/data/online-valid.csv',
        'format': 'csv',
        'domain_column': 1,  # URL column
        'threat_type': 'phishing',
        'description': 'PhishTank Verified Phishing URLs',
    },
    'openphish': {
        'url': 'https://openphish.com/feed.txt',
        'format': 'urls',
        'threat_type': 'phishing',
        'description': 'OpenPhish Community Feed',
    },
    'phishing_army': {
        'url': 'https://phishing.army/download/phishing_army_blocklist.txt',
        'format': 'domains',
        'threat_type': 'phishing',
        'description': 'Phishing Army Blocklist',
    },

    # ==================== BOTNET / C2 ====================
    'botvrij_ioc': {
        'url': 'https://www.botvrij.eu/data/ioclist.domain.raw',
        'format': 'domains',
        'threat_type': 'botnet',
        'description': 'Botvrij IOC Domains',
    },
    'feodo_c2': {
        'url': 'https://feodotracker.abuse.ch/downloads/domainblocklist.txt',
        'format': 'domains',
        'threat_type': 'c2',
        'description': 'Feodo Tracker C2 Domains',
    },
    'threatfox_ioc': {
        'url': 'https://threatfox.abuse.ch/downloads/hostfile/',
        'format': 'hostfile',
        'threat_type': 'c2',
        'description': 'ThreatFox IOC Domains',
    },

    # ==================== RANSOMWARE ====================
    'ransomware_tracker': {
        'url': 'https://ransomwaretracker.abuse.ch/downloads/RW_DOMBL.txt',
        'format': 'domains',
        'threat_type': 'ransomware',
        'description': 'Ransomware Tracker Domains',
    },

    # ==================== CRYPTOMINER ====================
    'coinblocker': {
        'url': 'https://zerodot1.gitlab.io/CoinBlockerLists/hosts',
        'format': 'hostfile',
        'threat_type': 'cryptominer',
        'description': 'CoinBlocker Cryptominer Domains',
    },
    'nocoin': {
        'url': 'https://raw.githubusercontent.com/nickkrawczyk/no-coin-list/master/hosts',
        'format': 'hostfile',
        'threat_type': 'cryptominer',
        'description': 'NoCoin Cryptominer List',
    },

    # ==================== SPAM ====================
    'spam_domains': {
        'url': 'https://raw.githubusercontent.com/matomo-org/referrer-spam-list/master/spammers.txt',
        'format': 'domains',
        'threat_type': 'spam',
        'description': 'Referrer Spam Domains',
    },

    # ==================== MALVERTISING ====================
    'disconnect_malvertising': {
        'url': 'https://s3.amazonaws.com/lists.disconnect.me/simple_malvertising.txt',
        'format': 'domains',
        'threat_type': 'malvertising',
        'description': 'Disconnect Malvertising List',
    },

    # ==================== TRACKING / ADS (Optional) ====================
    'disconnect_tracking': {
        'url': 'https://s3.amazonaws.com/lists.disconnect.me/simple_tracking.txt',
        'format': 'domains',
        'threat_type': 'tracking',
        'description': 'Disconnect Tracking List',
    },
    'disconnect_ads': {
        'url': 'https://s3.amazonaws.com/lists.disconnect.me/simple_ad.txt',
        'format': 'domains',
        'threat_type': 'ads',
        'description': 'Disconnect Ad Domains',
    },
    'adguard_dns': {
        'url': 'https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt',
        'format': 'adblock',
        'threat_type': 'ads',
        'description': 'AdGuard DNS Filter',
    },
}


def extract_domain(url: str) -> str:
    """Extract domain from URL."""
    try:
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove port if present
        if ':' in domain:
            domain = domain.split(':')[0]
        return domain
    except Exception:
        return ''


def download_feed(url: str) -> str:
    """Download feed to temporary file."""
    logger.info(f"Downloading feed from {url}")
    
    with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.txt') as f:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Nebula-DNS-Threat-Loader/1.0'})
            with urllib.request.urlopen(req, timeout=60) as response:
                f.write(response.read())
            return f.name
        except Exception as e:
            logger.error(f"Failed to download {url}: {e}")
            return ''


def parse_csv_feed(filepath: str, domain_column: int) -> Generator[str, None, None]:
    """Parse CSV format feed."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) > domain_column:
                    # Skip comments
                    if row[0].startswith('#'):
                        continue
                    domain = extract_domain(row[domain_column])
                    if domain:
                        yield domain
    except Exception as e:
        logger.error(f"Failed to parse CSV: {e}")


def parse_urls_feed(filepath: str) -> Generator[str, None, None]:
    """Parse plain URLs format."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                domain = extract_domain(line)
                if domain:
                    yield domain


def parse_domains_feed(filepath: str) -> Generator[str, None, None]:
    """Parse plain domains format."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip().lower()
            if line and not line.startswith('#'):
                yield line


def parse_hostfile_feed(filepath: str) -> Generator[str, None, None]:
    """Parse hosts file format (0.0.0.0 domain or 127.0.0.1 domain)."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                parts = line.split()
                if len(parts) >= 2:
                    domain = parts[1].lower()
                    if domain and domain != 'localhost':
                        yield domain


def parse_adblock_feed(filepath: str) -> Generator[str, None, None]:
    """Parse AdBlock/AdGuard filter format (||domain^)."""
    import re
    domain_pattern = re.compile(r'^\|\|([a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9])\^')

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            # Skip comments and special rules
            if not line or line.startswith(('!', '[', '@', '/')):
                continue
            # Match ||domain^ pattern
            match = domain_pattern.match(line)
            if match:
                domain = match.group(1).lower()
                if domain:
                    yield domain


def load_feed(feed_name: str, feed_config: Dict) -> Set[str]:
    """Load a single feed and return domains."""
    domains = set()
    
    filepath = download_feed(feed_config['url'])
    if not filepath:
        return domains
    
    try:
        format_type = feed_config['format']
        
        if format_type == 'csv':
            parser = parse_csv_feed(filepath, feed_config.get('domain_column', 0))
        elif format_type == 'urls':
            parser = parse_urls_feed(filepath)
        elif format_type == 'domains':
            parser = parse_domains_feed(filepath)
        elif format_type == 'hostfile':
            parser = parse_hostfile_feed(filepath)
        elif format_type == 'adblock':
            parser = parse_adblock_feed(filepath)
        else:
            logger.error(f"Unknown format: {format_type}")
            return domains
        
        for domain in parser:
            domains.add(domain)
        
        logger.info(f"Loaded {len(domains)} domains from {feed_name}")
        
    finally:
        os.unlink(filepath)
    
    return domains


def load_to_redis(
    redis_client: redis.Redis,
    domains: Set[str],
    threat_type: str,
    ttl_hours: int = 24,
    key_prefix: str = "threat:"
) -> int:
    """Load threat domains to Redis with TTL."""
    count = 0
    ttl_seconds = ttl_hours * 3600
    pipeline = redis_client.pipeline()
    
    for domain in domains:
        pipeline.setex(f"{key_prefix}{domain}", ttl_seconds, threat_type)
        count += 1
        
        if count % 10000 == 0:
            pipeline.execute()
            pipeline = redis_client.pipeline()
            logger.info(f"Loaded {count} domains...")
    
    # Execute remaining
    if count % 10000 != 0:
        pipeline.execute()
    
    return count


def load_from_file(filepath: str) -> Set[str]:
    """Load domains from a local file."""
    domains = set()
    
    opener = gzip.open if filepath.endswith('.gz') else open
    with opener(filepath, 'rt', encoding='utf-8', errors='ignore') as f:
        for line in f:
            domain = line.strip().lower()
            if domain and not domain.startswith('#'):
                domains.add(domain)
    
    return domains


def get_stats(redis_client: redis.Redis, key_prefix: str = "threat:") -> Dict[str, int]:
    """Get threat statistics from Redis."""
    stats = {}
    cursor = 0
    
    while True:
        cursor, keys = redis_client.scan(cursor, match=f"{key_prefix}*", count=10000)
        
        for key in keys:
            threat_type = redis_client.get(key)
            if threat_type:
                threat_type = threat_type.decode() if isinstance(threat_type, bytes) else threat_type
                stats[threat_type] = stats.get(threat_type, 0) + 1
        
        if cursor == 0:
            break
    
    return stats


def main():
    parser = argparse.ArgumentParser(description='Load threat feeds to Redis')
    parser.add_argument('--feeds', help='Comma-separated list of feeds to load')
    parser.add_argument('--all-feeds', action='store_true', help='Load all available feeds')
    parser.add_argument('--feed-file', help='Load from local file')
    parser.add_argument('--threat-type', default='malware', help='Threat type for file source')
    parser.add_argument('--redis-url', default='redis://localhost:6379', help='Redis URL')
    parser.add_argument('--key-prefix', default='threat:', help='Redis key prefix')
    parser.add_argument('--ttl-hours', type=int, default=24, help='TTL in hours')
    parser.add_argument('--stats-only', action='store_true', help='Only show statistics')
    parser.add_argument('--list-feeds', action='store_true', help='List available feeds')
    
    args = parser.parse_args()
    
    if args.list_feeds:
        print("\nAvailable Threat Feeds:")
        print("-" * 60)
        for name, config in THREAT_FEEDS.items():
            print(f"  {name}:")
            print(f"    Type: {config['threat_type']}")
            print(f"    Description: {config['description']}")
            print()
        return
    
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
        print("\nThreat Statistics:")
        print("-" * 40)
        for threat_type, count in sorted(stats.items(), key=lambda x: -x[1]):
            print(f"  {threat_type}: {count:,}")
        print("-" * 40)
        print(f"  Total: {sum(stats.values()):,}")
        return
    
    total_count = 0
    
    # Load from file
    if args.feed_file:
        domains = load_from_file(args.feed_file)
        count = load_to_redis(
            redis_client, domains, args.threat_type,
            ttl_hours=args.ttl_hours, key_prefix=args.key_prefix
        )
        total_count += count
        logger.info(f"Loaded {count} domains from {args.feed_file}")
    
    # Load from feeds
    feeds_to_load = []
    if args.all_feeds:
        feeds_to_load = list(THREAT_FEEDS.keys())
    elif args.feeds:
        feeds_to_load = [f.strip() for f in args.feeds.split(',')]
    
    for feed_name in feeds_to_load:
        if feed_name not in THREAT_FEEDS:
            logger.warning(f"Unknown feed: {feed_name}")
            continue
        
        config = THREAT_FEEDS[feed_name]
        domains = load_feed(feed_name, config)
        
        if domains:
            count = load_to_redis(
                redis_client, domains, config['threat_type'],
                ttl_hours=args.ttl_hours, key_prefix=args.key_prefix
            )
            total_count += count
    
    # Publish invalidation message
    if total_count > 0:
        redis_client.publish("nebula:invalidate", '{"type":"threats"}')
        logger.info("Published cache invalidation message")
    
    print(f"\nSuccessfully loaded {total_count:,} threat domains")


if __name__ == '__main__':
    main()
