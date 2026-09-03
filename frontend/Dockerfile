# Build stage
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json .npmrc* ./
RUN pnpm install --registry=https://registry.npmjs.org/ --config.minimum-release-age=0
COPY . .
RUN pnpm run build

# Serve stage with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
