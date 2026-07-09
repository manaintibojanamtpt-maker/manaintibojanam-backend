FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini curl
COPY infra/containers/health-server.mjs /app/health-server.mjs
ENV NODE_ENV=staging
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "health-server.mjs"]
