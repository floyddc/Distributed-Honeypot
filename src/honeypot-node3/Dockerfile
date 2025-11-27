FROM node:22-alpine

WORKDIR /app

COPY utils ./utils

COPY honeypot-node3/package*.json ./

RUN npm install

COPY honeypot-node3 .

RUN npm run build

EXPOSE 3003

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "honeypot-file-upload.js"]