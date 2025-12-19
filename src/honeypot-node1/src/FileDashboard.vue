<template>
  <div class="file-dashboard">
    <div class="dashboard-header">
      <h2>Restricted Access Area</h2>
      <button class="logout-btn" @click="$emit('logout')">Logout</button>
    </div>
    
    <div class="alert-banner">
      WARNING: Do not download these files.
    </div>

    <div class="file-list">
      <div v-for="file in files" :key="file.name" class="file-item">
        <div class="file-icon">📄</div>
        <div class="file-details">
          <div class="file-name">{{ file.name }}</div>
          <div class="file-meta">{{ file.size }} • {{ file.date }}</div>
        </div>
        <button class="download-btn" @click="downloadFile(file)">
          Download
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import Swal from 'sweetalert2';

export default {
  name: 'FileDashboard',
  props: ['socket', 'sessionId', 'honeypotId', 'clientIp'],
  data() {
    return {
      files: [
        { name: 'passwords.txt', size: '12 KB', date: '2024-12-10' },
        { name: 'salary_report_2024.xlsx', size: '1.2 MB', date: '2024-11-28' },
        { name: 'network_config.json', size: '4 KB', date: '2025-01-15' },
        { name: 'vpn_keys.zip', size: '45 MB', date: '2024-10-05' },
        { name: 'admin_notes.docx', size: '24 KB', date: '2024-12-20' }
      ]
    }
  },
  methods: {
    async downloadFile(file) {
      try {
        await axios.post('/api/download', {
          filename: file.name,
          clientIp: this.clientIp
        });
      } catch (error) {
        console.error('Error logging exfiltration attack:', error);
      }

      if (this.socket && this.socket.connected) {
        this.socket.emit('honeypot_interaction', {
          honeypotId: this.honeypotId || 'node1',
          sessionId: this.sessionId,
          type: 'input',
          field: 'file_download',
          value: file.name,
          timestamp: Date.now()
        });
      }

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent('nothing here :)'));
      element.setAttribute('download', file.name);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  }
}
</script>

<style scoped>
.file-dashboard {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 600px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.dashboard-header h2 {
  margin: 0;
  color: #c0392b;
  font-size: 1.2rem;
}

.logout-btn {
  background: #95a5a6;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.alert-banner {
  background-color: #fce4ec;
  color: #c0392b;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid #e57373;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: #f8f9fa;
}

.file-icon {
  font-size: 24px;
  margin-right: 15px;
}

.file-details {
  flex-grow: 1;
}

.file-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #2c3e50;
}

.file-meta {
  font-size: 0.75rem;
  color: #7f8c8d;
}

.download-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.download-btn:hover {
  background-color: #2980b9;
}
</style>
