FROM node:22-alpine

WORKDIR /app

COPY utils ./utils

COPY honeypot-node1/package*.json ./

RUN npm install

COPY honeypot-node1 .

RUN npm run build

EXPOSE 3001

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "honeypot-login.js"]