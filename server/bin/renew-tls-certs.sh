#!/bin/bash

# renews the TLS certs for dragonarchitect.net and copies them to a location where the server/papika can access them.
# should be run as a cron job (as root) on the web server twice a day at a random minute.

/opt/certbot/certbot-auto renew --quiet --no-self-upgrade
mkdir -p /srv/certs
cp -aL /etc/letsencrypt/live/dragonarchitect.net/fullchain.pem /etc/letsencrypt/live/dragonarchitect.net/privkey.pem /srv/certs

