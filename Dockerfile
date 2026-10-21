# Kya Khaun API for Google Cloud Run. Built from the repository root, so the
# Cloud Build trigger can use the default "/Dockerfile"; only server/ is used.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/src ./src
# Cloud Run sends traffic to $PORT (8080 by default).
ENV PORT=8080
USER node
CMD ["node", "src/index.js"]
