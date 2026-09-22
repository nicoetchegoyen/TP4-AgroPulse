FROM node:22-alpine
WORKDIR /app
COPY services/worker/package.json ./package.json
RUN npm install --omit=dev
COPY services/worker/src ./src
USER node
CMD ["node", "src/index.mjs"]
