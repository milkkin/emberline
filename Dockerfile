# Emberline server. No dependencies to install.
# Mount a persistent disk at /data so accounts and balances survive restarts.
FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY tools ./tools
ENV PORT=3000 DATA_DIR=/data
EXPOSE 3000
CMD ["node", "server.js"]
