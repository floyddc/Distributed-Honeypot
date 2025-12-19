<template>
  <div class="page-wrapper" @mousemove="trackMouseMove" @click="trackClick">
    <div class="login-card" v-if="!isLoggedIn">
      <div class="brand-section">
        <h1 class="logo-placeholder">ASW</h1>
        <p class="portal-subtitle">Protected Area</p>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="username">User ID</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input 
              type="text" 
              id="username" 
              v-model="username" 
              @input="trackInput('username', username)"
              placeholder="e.g. s123456"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input 
              type="password" 
              id="password" 
              v-model="password" 
              @input="trackInput('password', password)"
              placeholder="Enter password"
              required
            />
          </div>
        </div>

        <div class="form-options">
          <label>
            <input type="checkbox"> Remember me
          </label>
          <a href="#" style="color: #34495e;">Help?</a>
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? 'Processing...' : 'Login' }}
        </button>
      </form>

      <div class="footer-note">
      
        <p>© 2025 ASW 
        </p>
      </div>
    </div>

    <!-- Restricted Dashboard -->
    <FileDashboard 
      v-else 
      :socket="socket" 
      :sessionId="sessionId" 
      :honeypotId="'node1'"
      :clientIp="clientIp"
      @logout="isLoggedIn = false"
    />
  </div>
</template>

<script>
import axios from 'axios';
import { io } from 'socket.io-client';
import './style.css';
import FileDashboard from './FileDashboard.vue';

export default {
  name: 'App',
  components: {
    FileDashboard
  },
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      clientIp: '',
      socket: null,
      sessionId: null,
      isLoggedIn: false
    }
  },
  async created() {
    this.sessionId = this.generateSessionId();
    const collectorUrl = `http://${window.location.hostname}:3000`;
    this.socket = io(collectorUrl);
    
    this.socket.on('connect', () => {
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
    } catch (error) {
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
        }, 100);
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
        const response = await axios.post('/api/login', {
          username: this.username.trim(),
          password: this.password.trim(),
          clientIp: this.clientIp,
          sessionId: this.sessionId
        });

        if (response.data.success) {
          this.isLoggedIn = true;
        } else {
          alert('Invalid username or password');
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'Invalid username or password';
        alert(errorMsg);
      } finally {
        this.loading = false;
        if (!this.isLoggedIn) {
          this.password = '';
        }
      }
    }
  }
}
</script>