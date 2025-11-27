FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install 

COPY src/ ./src/

EXPOSE 3000

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "src/index.js"]