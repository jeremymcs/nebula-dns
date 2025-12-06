# Nebula DNS - Unbound Dockerfile
# Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>

FROM alpine:3.19

RUN apk add --no-cache unbound drill bind-tools

# Copy configuration
COPY unbound.conf /etc/unbound/unbound.conf

# Download root hints
RUN wget -q -O /etc/unbound/root.hints https://www.internic.net/domain/named.cache

# Create directory for DNSSEC keys
RUN unbound-anchor -a /etc/unbound/root.key || true

# Fix permissions
RUN chown -R unbound:unbound /etc/unbound

USER unbound

EXPOSE 53/tcp 53/udp

ENTRYPOINT ["/usr/sbin/unbound"]
CMD ["-d", "-v"]
