# ---------- Môi trường phát triển (docker-compose dùng target này) ----------
FROM node:24-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8000
CMD ["npm", "run", "dev"]

# ---------- Build ----------
FROM dev AS build
RUN npm run build

# ---------- Production ----------
FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 8000
CMD ["node", "dist/server.js"]
