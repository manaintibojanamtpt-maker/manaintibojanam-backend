# Infrastructure worker shell — health + metrics only.
# Wraps frozen M6/M7 runtime at deploy time; no SDK source changes in this image.
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini curl
COPY infra/containers/health-server.mjs /app/health-server.mjs
ENV NODE_ENV=staging
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "health-server.mjs"]
