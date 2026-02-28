FROM powerdns/dnsdist-19:latest

# Copy configuration
COPY config/dnsdist/ /etc/dnsdist/

EXPOSE 53/udp 53/tcp 443/tcp 853/tcp

# The base image entrypoint (dnsdist-startup) already adds --supervised and
# --disable-syslog. CMD args are appended after those, so do NOT include the
# binary name here — it would be passed as a positional arg and crash dnsdist.
CMD ["--log-timestamps"]
