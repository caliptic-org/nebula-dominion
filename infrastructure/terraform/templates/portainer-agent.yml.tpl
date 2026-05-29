name: portainer-agent
services:
  portainer_agent:
    image: portainer/agent:2.21.5
    container_name: portainer_agent
    restart: unless-stopped
    ports:
      - '${internal_ip}:9501:9001'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
      - /:/host
    logging:
      driver: json-file
      options:
        max-size: '20m'
        max-file: '3'
