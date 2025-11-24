FROM node:18-alpine

WORKDIR /app

# Copia i file package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il codice sorgente
COPY honeypot-ssh.js ./

# Espone la porta SSH
EXPOSE 2222

# Avvia il server SSH honeypot
CMD ["node", "honeypot-ssh.js"]