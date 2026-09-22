FROM node:22-alpine
WORKDIR /app
COPY services/simulator/package.json ./package.json
RUN npm install --omit=dev
COPY services/simulator/src ./src
USER node
CMD ["node", "src/index.mjs"]
