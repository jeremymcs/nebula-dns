FROM golang:1.23-alpine AS build
WORKDIR /src
COPY shield-blockpage/go.mod shield-blockpage/cmd/main.go ./shield-blockpage/
WORKDIR /src/shield-blockpage
RUN go mod download 2>/dev/null || true
RUN go build -o /shield-blockpage ./cmd/main.go

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /shield-blockpage /usr/local/bin/shield-blockpage
ENV SHIELD_BLOCKPAGE_HTTPS_ADDR=:9443
EXPOSE 9443
ENTRYPOINT ["/usr/local/bin/shield-blockpage"]
