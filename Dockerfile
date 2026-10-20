FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
ENV PORT=3000 HOST=0.0.0.0
EXPOSE 3000
CMD ["node","src/server.mjs"]
