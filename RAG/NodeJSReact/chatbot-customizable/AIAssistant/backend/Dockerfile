# Build from this directory:
#   docker build -t embeddable-assistant-api .
#
# Default listen port comes from env (see config/env.js); EXPOSE matches .env.sample.
FROM node:22-alpine

WORKDIR /app

RUN addgroup -g 1001 appuser && adduser -S -G appuser -u 1001 appuser

COPY --chown=appuser:appuser package.json package-lock.json ./

USER appuser
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=appuser:appuser . .

ENV NODE_ENV=production

EXPOSE 3002

CMD ["node", "server.js"]
