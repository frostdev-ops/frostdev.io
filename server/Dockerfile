# The Glaze Looks gallery server (server/gallery.mjs). Built by ops/deploy-gallery.sh from a staged context with this
# layout: gallery.mjs, package*.json (server's dependencies), scripts/looks.mjs (the shared checks), vendor/glaze (Glaze's pinned
# decoder) and src/data/looks (the curated entries, for uniqueness and neighbours: rebuild after changing them).
# It runs on the host's network listening on 127.0.0.1 only, behind nginx on the same host, which puts the visitor's
# address in X-Real-IP; the proxy reaches it from 127.0.0.1, the only peer whose X-Real-IP counts (TRUSTED_PROXIES'
# default). Secrets come from a file the owner keeps on the server, never from this repository:
#   docker run -d --name glaze-gallery --restart unless-stopped --network host -v glaze-gallery:/data \
#     --env-file /etc/glaze-gallery.env glaze-gallery
# /etc/glaze-gallery.env (mode 600): OPENROUTER_API_KEY=…, and optionally DECISION_MODEL, ESCALATION_MODEL,
# REVIEWS_PER_DAY, MAIL_URL=smtps://…, MAIL_FROM, MAIL_TO, and BLOCKLIST_KEY (the owner's public key for the mod
# blocklist; it is public). docs/looks-gallery.md has the rest.
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY gallery.mjs mod-shell.mjs ./
COPY gallery-admin.mjs ./
COPY admin admin/
COPY scripts/looks.mjs scripts/
COPY vendor/glaze vendor/glaze/
COPY src/data/looks src/data/looks/
RUN mkdir /data && chown node /data
USER node
ENV HOST=127.0.0.1 PORT=8788 DB=/data/gallery.db IP_HEADER=x-real-ip SITE_ORIGIN=https://frostdev.io NODE_OPTIONS=--disable-warning=ExperimentalWarning
EXPOSE 8788
VOLUME /data
CMD ["node", "gallery.mjs"]
