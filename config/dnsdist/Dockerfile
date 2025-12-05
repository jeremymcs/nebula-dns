# dnsdist Dockerfile for SafeDNS

FROM powerdns/dnsdist-18:latest

# Install additional packages
USER root
RUN apk add --no-cache curl ca-certificates lua5.3-libs

# Copy configuration
COPY dnsdist.conf /etc/dnsdist/dnsdist.conf

# Create directory for certs
RUN mkdir -p /etc/dnsdist/certs && chown dnsdist:dnsdist /etc/dnsdist/certs

USER dnsdist

EXPOSE 443 853 8083

ENTRYPOINT ["/usr/bin/dnsdist"]
CMD ["--supervised", "--disable-syslog", "-C", "/etc/dnsdist/dnsdist.conf"]
