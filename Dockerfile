FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    BIND_HOST=0.0.0.0 \
    SERVE_DIST=1 \
    MOST_STATE_DIR=/var/lib/most
RUN install -d -m 0700 -o node -g node /var/lib/most
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
USER node
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --start-period=5s CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>{process.exitCode=1})"]
CMD ["node", "server/index.mjs"]
