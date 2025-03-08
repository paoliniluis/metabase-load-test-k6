FROM oven/bun:1.1.21-slim as base
WORKDIR /usr/src/app
COPY . .
RUN bun install

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "--watch", "index.js" ]
