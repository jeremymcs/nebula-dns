# Nebula DNS - dnsdist Dockerfile
# Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>

FROM powerdns/dnsdist-19:latest

# Install additional packages (Debian-based image)
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration
COPY dnsdist.conf /etc/dnsdist/dnsdist.conf

# Create directory for certs (keep root ownership for simplicity)
RUN mkdir -p /etc/dnsdist/certs

EXPOSE 443 853 8083

ENTRYPOINT ["/usr/local/bin/dnsdist"]
CMD ["--supervised", "--disable-syslog", "-C", "/etc/dnsdist/dnsdist.conf"]
