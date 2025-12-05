FROM node:22-alpine

WORKDIR /app

COPY utils ./utils

COPY honeypot-node2/package*.json ./

RUN npm install

COPY honeypot-node2 .

EXPOSE 2222

CMD ["npm", "start"]