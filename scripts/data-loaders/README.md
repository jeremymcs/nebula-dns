# Nebula DNS - Data Loaders

Scripts for loading domain categorization and threat intelligence data into Redis.

## Prerequisites

```bash
pip install -r requirements.txt
```

## Category Loader

Loads domain categorization data for content filtering.

### Using Shallalist (Free)

```bash
# Load Shallalist data
python category-loader.py --source=shallalist --redis-url=redis://localhost:4379

# Check statistics
python category-loader.py --stats-only
```

### Using Custom CSV

```bash
# Format: domain,category
python category-loader.py --source=file --file=categories.csv
```

### Categories

The loader normalizes categories to:
- `adult` - Adult/pornographic content
- `gambling` - Gambling sites
- `malware` - Known malware distribution
- `phishing` - Phishing sites
- `social_media` - Social networks
- `streaming` - Video/audio streaming
- `ads` - Advertising
- `tracking` - Analytics/tracking
- And many more...

## Threat Feed Loader

Loads threat intelligence for real-time blocking.

### Available Feeds

| Feed | Type | Description |
|------|------|-------------|
| **Malware** | | |
| `urlhaus` | malware | URLhaus malware URLs |
| `urlhaus_domains` | malware | URLhaus domains (hostfile) |
| `abuse_ch_ssl` | malware | Abuse.ch SSL Blacklist |
| `malwaredomains` | malware | Malware Domains List |
| `disconnect_malware` | malware | Disconnect Malware List |
| **Phishing** | | |
| `phishtank` | phishing | PhishTank verified phishing |
| `openphish` | phishing | OpenPhish community feed |
| `phishing_army` | phishing | Phishing Army Blocklist |
| **Botnet / C2** | | |
| `botvrij_ioc` | botnet | Botvrij botnet domains |
| `feodo_c2` | c2 | Feodo Tracker C2 domains |
| `threatfox_ioc` | c2 | ThreatFox IOC domains |
| **Ransomware** | | |
| `ransomware_tracker` | ransomware | Ransomware Tracker domains |
| **Cryptominer** | | |
| `coinblocker` | cryptominer | CoinBlocker cryptominer domains |
| `nocoin` | cryptominer | NoCoin cryptominer list |
| **Spam** | | |
| `spam_domains` | spam | Referrer spam domains |
| **Malvertising** | | |
| `disconnect_malvertising` | malvertising | Disconnect malvertising list |
| **Ads / Tracking** | | |
| `disconnect_tracking` | tracking | Disconnect tracking list |
| `disconnect_ads` | ads | Disconnect ad domains |
| `adguard_dns` | ads | AdGuard DNS filter |

### Usage

```bash
# Load specific feeds
python threat-feed-loader.py --feeds=urlhaus,phishtank

# Load all feeds
python threat-feed-loader.py --all-feeds

# Load from local file
python threat-feed-loader.py --feed-file=threats.txt --threat-type=malware

# Check statistics
python threat-feed-loader.py --stats-only

# List available feeds
python threat-feed-loader.py --list-feeds
```

### TTL

Threat data is loaded with a 24-hour TTL by default. Adjust with `--ttl-hours`:

```bash
python threat-feed-loader.py --feeds=urlhaus --ttl-hours=12
```

## Automation

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: threat-feed-update
  namespace: nebula-dns
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: loader
              image: python:3.11-slim
              command:
                - python
                - /scripts/threat-feed-loader.py
                - --all-feeds
                - --redis-url=redis://redis:6379
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
          volumes:
            - name: scripts
              configMap:
                name: data-loader-scripts
          restartPolicy: OnFailure
```

### Docker

```bash
docker run --rm \
  -v $(pwd):/app \
  -w /app \
  python:3.11-slim \
  sh -c "pip install redis && python threat-feed-loader.py --all-feeds --redis-url=redis://redis:6379"
```

## Commercial Data Sources

For production deployments, consider commercial threat intelligence:

- **Webshrinker** - Domain categorization API
- **zvelo** - URL/domain classification
- **VirusTotal** - Malware intelligence
- **DomainTools** - Domain reputation
- **Cisco Umbrella** - Investigate API

Contact these providers for API access and integrate with custom loaders.
