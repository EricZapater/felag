# Build stage
FROM node:22-alpine AS builder
ARG VITE_API_URL=https://api.felag.app
ENV VITE_API_URL=$VITE_API_URL

RUN npm install -g pnpm@10
WORKDIR /app
COPY package.json .npmrc* ./
RUN pnpm install --registry=https://registry.npmjs.org/ --no-frozen-lockfile
COPY . .
RUN pnpm run build

# Serve stage with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
