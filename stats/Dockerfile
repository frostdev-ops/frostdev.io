# frostdev HQ's numbers (stats/collect.mjs, docs/hq.md): one collection per run, started once an hour by
# ops/frostdev-stats.timer. Built by ops/deploy-stats.sh from a staged context with the four scripts; no dependencies.
# The Cloudflare token comes from a file the owner keeps on the server, never from this repository:
#   docker run --rm --name frostdev-stats --env-file /etc/frostdev-stats.env -v /var/lib/frostdev-stats:/data \
#     -v /opt/frostdev-downloads/kiln/downloads:/files:ro -v /opt/frostdev-public/current:/site:ro frostdev-stats
# /etc/frostdev-stats.env (mode 600): CF_API_TOKEN=... (Zone > Analytics > Read for frostdev.io), CF_ZONE_ID=...,
# optionally GITHUB_TOKEN=... (read-only, public repositories; without one GitHub allows 60 questions an hour).
FROM node:24-alpine
# The image is unused between runs; ops/frostdev-stats.service builds it again when a prune has removed it.
LABEL io.frostdev.keep="true"
WORKDIR /app
COPY kiln-downloads.mjs site-pages.mjs public-numbers.mjs collect.mjs ./
USER node
ENV DATA_DIR=/data OUT_DIR=/data/out FILES_DIR=/files SITE_DIR=/site
VOLUME ["/data"]
CMD ["node", "collect.mjs"]
