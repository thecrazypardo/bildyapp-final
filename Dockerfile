FROM node:22-slim AS base
WORKDIR /app

# Dependencias del sistema necesarias para sharp (procesado de imágenes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

RUN mkdir -p uploads
EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
