name: dozzle-agent
services:
  dozzle-agent:
    image: amir20/dozzle:v10.6.2
    container_name: dozzle-agent
    restart: unless-stopped
    command: agent
    ports:
      - '${internal_ip}:7007:7007'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      DOZZLE_HOSTNAME: ${hostname}
    logging:
      driver: json-file
      options:
        max-size: '20m'
        max-file: '3'
