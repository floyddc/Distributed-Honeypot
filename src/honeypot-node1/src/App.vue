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
            <input 
              type="text" 
              id="username" 
              v-model="username" 
              @input="trackInput('username', username)"
              placeholder="Enter username"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-wrapper">
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

    <FileDashboard 
      v-else 
      :socket="socket" 
      :sessionId="sessionId" 
      :honeypotId="'node1'"
      :clientIp="clientIp"
      @logout="handleLogout"
    />
  </div>
</template>

<script>
import axios from 'axios';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
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
    const storedSession = sessionStorage.getItem('honeypot_session_id');
    if (storedSession) {
      this.sessionId = storedSession;
    } else {
      this.sessionId = this.generateSessionId();
      sessionStorage.setItem('honeypot_session_id', this.sessionId);
    }

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
          Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'Invalid username or password',
            confirmButtonColor: '#e74c3c'
          });
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'Invalid username or password';
        Swal.fire({
          icon: 'error',
          title: 'Access Denied',
          text: errorMsg,
          confirmButtonColor: '#e74c3c'
        });
      } finally {
        this.loading = false;
        if (!this.isLoggedIn) {
          this.password = '';
        }
      }
    },

    handleLogout() {
      this.isLoggedIn = false;
      this.username = '';
      this.password = '';
      
      if (this.socket && this.socket.connected) {
        this.socket.emit('honeypot_interaction', {
          honeypotId: 'node1',
          sessionId: this.sessionId,
          type: 'navigation',
          view: 'login',
          timestamp: Date.now()
        });
      }
    }
  }
}
</script>