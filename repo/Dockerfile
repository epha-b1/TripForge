FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json jest.config.js ./
COPY prisma/ ./prisma/
COPY src/ ./src/
COPY unit_tests/ ./unit_tests/
COPY API_tests/ ./API_tests/

RUN npm run build \
 && mkdir -p dist/models \
 && ln -s /app/src/models/prisma dist/models/prisma

EXPOSE 3000

CMD ["node", "dist/server.js"]
