# Relazione Tecnica: Sistema Distributed Honeypot

## 1. Introduzione
Questa relazione descrive l'architettura e le implementazioni tecniche principali del sistema Distributed Honeypot. Il focus è sulla gestione dei dati, la configurazione del server centrale e la comunicazione in tempo reale con i client.

## 2. Database e Schemi (MongoDB)
Il sistema utilizza **MongoDB** come database NoSQL per la sua flessibilità nella gestione di log non strutturati e dati di eventi. L'interazione avviene tramite **Mongoose** (ODM).

### 2.1 Schemi Principali
Abbiamo definito 4 modelli principali per strutturare i dati.

**Modello Utente (`User.js`)**
Gestisce l'autenticazione degli amministratori. Include un hook `pre('save')` per l'hashing della password.
```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Password criptata
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
});

// Hashing della password prima del salvataggio
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
```

**Modello Attacco (`Attack.js`)**
Memorizza i dettagli degli attacchi rilevati dagli Honeypot. Questo è il cuore dell'analisi dati.
```javascript
const attackSchema = new mongoose.Schema({
  honeypotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Honeypot' },
  sourceIp: { type: String, required: true },
  destinationPort: { type: Number, required: true },
  protocol: { type: String }, // TCP, UDP, ICMP
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  timestamp: { type: Date, default: Date.now },
  geoData: { country: String, city: String } // Dati di geolocalizzazione
});
```

## 3. Infrastruttura e Gestione MongoDB
MongoDB è un database NoSQL orientato ai documenti. Invece di tabelle e righe, utilizza **collezioni** e **documenti** JSON-like (BSON).

### 3.1 Configurazione Docker (`docker-compose.yml`)
Il database viene eseguito in un container Docker isolato per facilitare il deployment.
```yaml
  mongo:
    image: mongo:latest
    container_name: mongo
    ports:
      - "27017:27017"
    volumes:
      - ./mongo-data:/data/db # Persistenza dei dati
    networks:
      - app-network
```

### 3.2 Accesso e Comandi Utili
È possibile interagire con il database direttamente tramite la shell `mongosh`.

**Accesso al Container:**
```bash
docker exec -it mongo mongosh
```

**Comandi Principali:**
```javascript
use distributed-honeypot // Seleziona il database
show collections         // Mostra le collezioni (users, attacks, etc.)
db.users.find()          // Visualizza tutti gli utenti
db.attacks.countDocuments() // Conta il numero totale di attacchi
```

## 4. Connessione al Database
La connessione è gestita in un modulo separato (`src/config/db.js`) per mantenere il codice pulito. Utilizziamo una funzione asincrona per gestire la connessione iniziale.

```javascript
const connectDB = async () => {
  try {
    // Connessione tramite URI definito nelle variabili d'ambiente
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Arresta il processo in caso di fallimento critico
  }
};
```

## 5. Configurazione del Server Collector
Il server è costruito su **Node.js** con **Express**. Svolge due funzioni principali: API REST per l'autenticazione e Server WebSocket per i dati in tempo reale.

### 4.1 Inizializzazione (`src/index.js`)
Qui configuriamo Express, i middleware e avviamo sia il server HTTP che l'istanza Socket.io.

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // Server HTTP necessario per Socket.io

// Configurazione Socket.io con CORS (Cross-Origin Resource Sharing)
const io = new Server(server, {
  cors: {
    origin: '*', // Permette connessioni da qualsiasi client (Dashboard/Honeypot)
    methods: ['GET', 'POST']
  }
});

// Connessione al DB
connectDB();

// Middleware Globali
app.use(cors());
app.use(express.json()); // Parsing del body JSON
```

## 6. Autenticazione e Sicurezza (JWT)
Per garantire che solo gli amministratori autorizzati possano accedere alla Dashboard, abbiamo implementato un sistema di autenticazione basato su **JSON Web Tokens (JWT)**.

### 6.1 Flusso di Login (`authController.js`)
Quando un utente effettua il login con credenziali valide, il server genera un token firmato che contiene l'ID dell'utente.

```javascript
const loginUser = async (req, res) => {
  // ... verifica email e password ...

  // Generazione del Token
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    token: token // Inviato al client per le richieste future
  });
};
```

### 6.2 Protezione delle Rotte (`authMiddleware.js`)
Un middleware intercetta le richieste protette e verifica la validità del token presente nell'header `Authorization`.

```javascript
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Estrae il token dall'header "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Decodifica e verifica il token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Aggiunge l'utente alla richiesta
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
};
```

## 7. Comunicazione Client-Server (WebSocket)
La caratteristica distintiva del progetto è la capacità di mostrare gli attacchi in tempo reale senza ricaricare la pagina. Questo è reso possibile da **Socket.io**.

### 5.1 Lato Server: Gestione Eventi
Il server ascolta gli eventi inviati dagli Honeypot (`honeypot_data`) e li "trasmette" (broadcast) a tutti i client connessi (la Dashboard) tramite l'evento `new_attack`.

```javascript
io.on('connection', (socket) => {
  console.log('Nuova connessione:', socket.id);

  // Ricezione dati da un Honeypot
  socket.on('honeypot_data', (data) => {
    // 1. Qui in futuro salveremo i dati su MongoDB: await Attack.create(data);
    
    // 2. Broadcast immediato alla Dashboard
    io.emit('new_attack', data);
  });
});
```

### 5.2 Lato Client: Store Pinia (`socket.js`)
Sulla Dashboard (Vue.js), utilizziamo uno store **Pinia** per gestire la connessione WebSocket in modo centralizzato. Questo permette a qualsiasi componente (Tabella, Grafici) di accedere agli stessi dati in tempo reale.

```javascript
import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useSocketStore = defineStore('socket', () => {
  const attacks = ref([]) // Array reattivo degli attacchi

  function connect() {
    // Connessione al server
    const socket = io('http://localhost:3000')

    // Ascolto dell'evento 'new_attack' trasmesso dal server
    socket.on('new_attack', (attack) => {
      // Aggiunge il nuovo attacco in cima alla lista
      attacks.value.unshift(attack)
      
      // Mantiene solo gli ultimi 50 attacchi per performance
      if (attacks.value.length > 50) {
        attacks.value.pop()
      }
    })
  }

  return { attacks, connect }
})
```

## 8. Elaborazione Dati Client (Tabelle e Grafici)
Il client Vue.js non si limita a ricevere i dati, ma li elabora in tempo reale per fornire visualizzazioni significative.

### 6.1 Grafici Dinamici (`DashboardCharts.vue`)
Utilizziamo `vue-chartjs` e le proprietà computate (`computed`) di Vue per trasformare l'array grezzo degli attacchi in dataset compatibili con Chart.js.

**Esempio: Calcolo Attacchi per Gravità**
```javascript
// Compute Attacks by Severity
const severityData = computed(() => {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 }
  
  // Itera su tutti gli attacchi ricevuti e conta le occorrenze
  props.attacks.forEach(a => {
    if (counts[a.severity] !== undefined) counts[a.severity]++
  })
  
  return {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [{
      backgroundColor: ['#0aff0a', '#00f3ff', '#ffae00', '#ff003c'], // Colori Cyberpunk
      data: [counts.low, counts.medium, counts.high, counts.critical]
    }]
  }
})
```

### 6.2 Tabella in Tempo Reale (`AttackTable.vue`)
La tabella utilizza il rendering condizionale per applicare stili diversi in base alla gravità dell'attacco.

```html
<tr v-for="(attack, index) in attacks" :key="index">
  <!-- ... altri dati ... -->
  <td>
    <!-- Classe dinamica basata sulla funzione getSeverityClass -->
    <span :class="getSeverityClass(attack.severity)">
      {{ attack.severity.toUpperCase() }}
    </span>
  </td>
</tr>
```

```javascript
const getSeverityClass = (severity) => {
  switch (severity) {
    case 'critical': return 'bg-cyber-danger/20 text-cyber-danger shadow-neon-red'
    case 'high': return 'bg-cyber-warning/20 text-cyber-warning'
    // ... altri casi
  }
}
```

## 9. Stile e Design System (TailwindCSS)
L'interfaccia utente adotta uno stile "Cyberpunk" moderno, caratterizzato da una modalità scura profonda, accenti neon e effetti di trasparenza (Glassmorphism).

### 9.1 Configurazione Tema (`src/style.css`)
Utilizziamo le variabili CSS native integrate con Tailwind v4 per definire la palette colori e gli effetti globali.

```css
@theme {
  /* Palette Cyberpunk */
  --color-cyber-black: #050505;
  --color-cyber-primary: #00f3ff; /* Neon Cyan */
  --color-cyber-secondary: #bc13fe; /* Neon Purple */
  --color-cyber-success: #0aff0a; /* Matrix Green */
  
  /* Effetti Ombra Neon */
  --shadow-neon-blue: 0 0 10px #00f3ff, 0 0 20px #00f3ff;
}
```

### 9.2 Componenti Riutilizzabili
Abbiamo creato classi di utilità personalizzate per mantenere il codice pulito e coerente.

**Glassmorphism Card:**
```css
.glass-card {
  @apply bg-cyber-gray/70 backdrop-blur-md border border-white/10 
         rounded-xl shadow-lg hover:border-cyber-primary/50 
         transition-all duration-300;
}
```

### 9.3 Implementazione nei Componenti Vue
Nei file `.vue`, applichiamo queste classi per creare interfacce reattive e visivamente impattanti.

**Esempio: Card Statistiche (`HomeView.vue`)**
```html
<div class="glass-card p-6 relative overflow-hidden group">
  <h3 class="text-gray-400 text-sm font-mono uppercase">Total Attacks</h3>
  <div class="flex items-baseline mt-2">
    <!-- Testo con ombra neon -->
    <p class="text-4xl font-bold text-white text-shadow-neon-blue">
      {{ socketStore.attacks.length }}
    </p>
    <span class="ml-2 text-sm text-cyber-primary animate-pulse">LIVE</span>
  </div>
</div>
```

## 10. Conclusione
Questa architettura garantisce:
1.  **Scalabilità**: MongoDB gestisce grandi volumi di log.
2.  **Reattività**: WebSockets permettono un monitoraggio istantaneo.
3.  **Modularità**: Separazione netta tra gestione dati (Server) e visualizzazione (Client).
