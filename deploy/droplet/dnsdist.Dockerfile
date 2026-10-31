# Droplet image for dnsdist with production compose config
FROM powerdns/dnsdist-19:latest

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates getent \
    && rm -rf /var/lib/apt/lists/*

COPY deploy/droplet/dnsdist.conf /etc/dnsdist/dnsdist.conf
RUN mkdir -p /etc/dnsdist/certs

EXPOSE 53/udp 53/tcp 853/tcp 8443/tcp 8083/tcp

ENTRYPOINT ["/usr/local/bin/dnsdist"]
CMD ["--supervised", "--disable-syslog", "-C", "/etc/dnsdist/dnsdist.conf"]
