FROM powerdns/dnsdist-19:latest

# Copy configuration
COPY config/dnsdist/ /etc/dnsdist/

EXPOSE 53/udp 53/tcp 443/tcp 853/tcp

CMD ["dnsdist", "--supervised", "--disable-syslog", "--log-timestamps"]
