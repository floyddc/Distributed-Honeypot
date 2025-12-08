<template>
  <div class="login-container" @mousemove="trackMouseMove" @click="trackClick">
    <h1>Login</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="username">Username:</label>
        <input 
          type="text" 
          id="username" 
          v-model="username" 
          @input="trackInput('username', username)"
          placeholder="Enter your username"
          required
        />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input 
          type="password" 
          id="password" 
          v-model="password" 
          @input="trackInput('password', password)"
          placeholder="Enter your password"
          required
        />
      </div>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
    </form>
    <p>Forgot your password? <a href="#">Reset here</a></p>
    <small>Attempts: {{ attempts }}</small>
  </div>
</template>

<script>
import axios from 'axios';
import { io } from 'socket.io-client';

export default {
  name: 'App',
  data() {
    return {
      username: '',
      password: '',
      attempts: 0,
      loading: false,
      clientIp: '',
      socket: null,
      sessionId: null
    }
  },
  async created() {
    this.sessionId = this.generateSessionId();
    this.socket = io('http://localhost:3000');
    
    this.socket.on('connect', () => {
      console.log('Connected to collector server for live tracking');
      
      this.socket.emit('honeypot_interaction', {
        honeypotId: 'node1',
        sessionId: this.sessionId,
        type: 'session_start',
        timestamp: Date.now()
      });
    });

    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      this.clientIp = response.data.ip;
      console.log('Client IP:', this.clientIp);
    } catch (error) {
      console.error('Error fetching client IP:', error);
      this.clientIp = 'unknown';
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.emit('honeypot_interaction', {
        honeypotId: 'node1',
        sessionId: this.sessionId,
        type: 'session_end',
        timestamp: Date.now()
      });
      this.socket.disconnect();
    }
  },
  methods: {
    generateSessionId() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    
    trackMouseMove(e) {
      if (!this._mouseThrottle) {
        this._mouseThrottle = setTimeout(() => {
          if (this.socket && this.socket.connected) {
            const percentX = (e.clientX / window.innerWidth) * 100;
            const percentY = (e.clientY / window.innerHeight) * 100;
            
            this.socket.emit('honeypot_interaction', {
              honeypotId: 'node1',
              sessionId: this.sessionId,
              type: 'mousemove',
              x: percentX,
              y: percentY,
              timestamp: Date.now()
            });
          }
          this._mouseThrottle = null;
        }, 50); // 50ms
      }
    },
    
    trackClick(e) {
      if (this.socket && this.socket.connected) {
        const percentX = (e.clientX / window.innerWidth) * 100;
        const percentY = (e.clientY / window.innerHeight) * 100;
        
        this.socket.emit('honeypot_interaction', {
          honeypotId: 'node1',
          sessionId: this.sessionId,
          type: 'click',
          x: percentX,
          y: percentY,
          element: e.target.tagName,
          timestamp: Date.now()
        });
      }
    },
    
    trackInput(field, value) {
      if (this.socket && this.socket.connected) {
        this.socket.emit('honeypot_interaction', {
          honeypotId: 'node1',
          sessionId: this.sessionId,
          type: 'input',
          field: field,
          value: field === 'password' ? '*'.repeat(value.length) : value,
          timestamp: Date.now()
        });
      }
    },
    
    async handleSubmit() {
      this.attempts++;
      this.loading = true;

      if (this.socket && this.socket.connected) {
        this.socket.emit('honeypot_interaction', {
          honeypotId: 'node1',
          sessionId: this.sessionId,
          type: 'submit',
          timestamp: Date.now()
        });
      }

      try {
        // Send login attempt to node server
        await axios.post('/api/login', {
          username: this.username.trim(),
          password: this.password.trim(),
          clientIp: this.clientIp
        });

        alert('Invalid username or password');
        
      } catch (error) {
        alert('Invalid username or password');
        
      } finally {
        this.loading = false;
        this.username = '';
        this.password = '';
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

button:disabled {
  background-color: grey;
  cursor: not-allowed;
}
</style>