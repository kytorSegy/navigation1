FROM node:20-alpine3.20 AS frontend-builder
WORKDIR /app
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

FROM node:20-alpine3.20 AS production
RUN apk add --no-cache sqlite git bash sed tzdata && rm -rf /var/cache/apk/*
ENV TZ=Asia/Shanghai
WORKDIR /app
RUN mkdir -p database/uploads web/dist
COPY package*.json ./
RUN npm install --production
COPY app.js config.js db.js ./
COPY routes/ ./routes/
COPY --from=frontend-builder /app/dist ./web/dist
COPY backup.sh entrypoint.sh ./
RUN sed -i 's/\r$//' backup.sh entrypoint.sh && chmod +x backup.sh entrypoint.sh
ENV NODE_ENV=production
EXPOSE 3000/tcp
ENTRYPOINT ["./entrypoint.sh"]
