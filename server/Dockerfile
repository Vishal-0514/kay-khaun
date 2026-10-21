# Kya Khaun API for Google Cloud Run (built from this folder).
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
# Cloud Run sends traffic to $PORT (8080 by default).
ENV PORT=8080
USER node
CMD ["node", "src/index.js"]
