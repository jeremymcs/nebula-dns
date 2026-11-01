# Droplet image for shield-blockpage HTTPS block-page terminator
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY shield-blockpage/go.mod ./shield-blockpage/
COPY shield-blockpage/cmd ./shield-blockpage/cmd/
WORKDIR /src/shield-blockpage
RUN go mod download
RUN go build -o /shield-blockpage ./cmd/main.go

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /shield-blockpage /usr/local/bin/shield-blockpage
ENV SHIELD_BLOCKPAGE_HTTPS_ADDR=:9443
EXPOSE 9443
ENTRYPOINT ["/usr/local/bin/shield-blockpage"]
