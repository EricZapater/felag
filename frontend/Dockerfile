# Build stage
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY frontend/package.json ./frontend/
RUN pnpm install --filter frontend... --registry=https://registry.npmjs.org/
COPY frontend ./frontend
RUN pnpm --filter frontend build

# Serve stage with nginx
FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
