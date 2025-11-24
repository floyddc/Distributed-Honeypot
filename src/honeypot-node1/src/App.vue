<template>
  <div class="login-container">
    <h1>Login</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="username">Username:</label>
        <input 
          type="text" 
          id="username" 
          v-model="username" 
          placeholder="Enter your username"
        />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input 
          type="password" 
          id="password" 
          v-model="password" 
          placeholder="Enter your password"
        />
      </div>
      <button type="submit">Login</button>
    </form>
    <p>Forgot your password? <a href="#">Reset here</a></p>
    <small>Attempts: {{ attempts }} | Buffered: {{ bufferedCount }}</small>
  </div>
</template>

<script>
import axios from 'axios'; 
import DataBuffer from '../utils/buffer.js';

const buffer = new DataBuffer(100);

async function getGeoData(ip) {
    try {
        const response = await axios.get(`https://ipapi.co/${ip}/json/`);
        return {
            country: response.data.country_name || 'unknown',
            city: response.data.city || 'unknown',
            lat: response.data.latitude || null,
            lon: response.data.longitude || null
        };
    } catch (error) {
        console.error('Error fetching geo data:', error);
        return {
            country: 'unknown',
            city: 'unknown',
            lat: null,
            lon: null
        };
    }
}

function calculateSeverity(username, password) {
    if (username === 'admin' && password === 'admin123') {
        return 'high';
    }
    if (username === 'root') {
        return 'medium';
    }
    return 'low';
}

async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip; 
    } catch (error) {
        console.error('Error fetching public IP:', error);
        return 'unknown';
    }
}

export default {
  name: 'App',
  data() {
    return {
      username: '',
      password: '',
      attempts: 0,
      bufferedCount: 0
    }
  },
  mounted() {
    // Initialize socket connection
    this.$socket.on('connect', () => {
      console.log('Connected to collector server');
      const bufferedData = buffer.flush();
      bufferedData.forEach(data => {
        this.$socket.emit('honeypot_data', data);
      });
      
      if (bufferedData.length > 0) {
        console.log(`Flushed ${bufferedData.length} buffered items`);
      }
      
      this.bufferedCount = buffer.size();
    });
    
    this.$socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    this.$socket.on('disconnect', () => {
      console.log('Disconnected from collector - buffering data');
    });
  },
  methods: {
    async handleSubmit() {
      this.attempts++;
      const publicIp = await getPublicIP();
      
      // Log attack attempt
      const attackData = {
        honeypotId: 'node1', 
        sourceIp: publicIp,
        destinationPort: 3001, 
        protocol: 'HTTP', 
        payload: JSON.stringify({ 
          username: this.username.trim(),
          password: this.password.trim()
        }),
        severity: calculateSeverity(this.username, this.password), 
        timestamp: new Date().toISOString(), 
        geoData: await getGeoData(publicIp) 
      };

      try {
        // Send via Socket.IO or buffer
        if (this.$socket && this.$socket.connected) {
          this.$socket.emit('honeypot_data', attackData);
          console.log('Attack data sent via Socket.IO');
        } else {
          buffer.add(attackData);
          this.bufferedCount = buffer.size();
          console.log(`Data buffered. Buffer size: ${this.bufferedCount}`);
        }
        
        // Always show "Invalid credentials"
        alert('Invalid username or password');
        
        // Reset form
        this.username = '';
        this.password = '';
      } catch (error) {
        console.error('Failed to send data to collector:', error);
        alert('Invalid username or password');
      }
    }
  }
}
</script>

<style>
.login-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid grey;
  border-radius: 5px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid grey;
  border-radius: 3px;
}

button {
  width: 100%;
  padding: 10px;
  background-color: blue;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}
</style>