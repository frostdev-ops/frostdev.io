# Kiln download statistics (stats/kiln-downloads.mjs): one collection per run, started once an hour by
# ops/kiln-stats.timer. Built by ops/deploy-kiln-stats.sh from a staged context with kiln-downloads.mjs and the page's three files.
# No dependencies. The token comes from a file the owner keeps on the server, never from this repository:
#   docker run --rm --name kiln-stats --env-file /etc/kiln-stats.env -v /var/lib/kiln-stats:/data \
#     -v /opt/frostdev-stats/kiln:/out -v /opt/frostdev-downloads/kiln/downloads:/files:ro kiln-stats
# /etc/kiln-stats.env (mode 600): CF_API_TOKEN=... (Zone > Analytics > Read for frostdev.io) and CF_ZONE_ID=...
# docs/kiln-download-stats.md has the rest.
FROM node:24-alpine
WORKDIR /app
COPY kiln-downloads.mjs page.html page.css page.js ./
USER node
ENV DATA_DIR=/data OUT_DIR=/out FILES_DIR=/files
VOLUME ["/data", "/out"]
CMD ["node", "kiln-downloads.mjs", "collect"]
