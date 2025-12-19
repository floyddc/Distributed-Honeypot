<template>
  <div class="app-container">
    <header class="navbar">
      <div class="logo">
        <span class="logo-icon">☁️</span>
        <span class="logo-text">SecureTransfer</span>
      </div>
      <div class="user-info">
        <span class="status-dot"></span>
        System Online
      </div>
    </header>

    <main class="main-content">
      <div class="upload-card">
        <div class="card-header">
          <h2>Internal File Upload</h2>
          <p class="subtitle">Secure channel for sensitive data transfer.</p>
        </div>
        
        <form @submit.prevent="handleUpload" class="upload-form">
          <div 
            class="drop-zone" 
            :class="{ 'dragging': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <div class="drop-content">
              <span class="upload-icon">📤</span>
              <p v-if="file" class="selected-filename">{{ file.name }}</p>
              <p v-else class="upload-instruction">
                <strong>Drag & drop</strong> sensitive files here<br>
                or click to browse
              </p>
              <p class="file-limits">Max scan size: 50MB • Encrypted files allowed</p>
            </div>
            <input 
              type="file" 
              id="fileInput" 
              ref="fileInput"
              @change="onFileChange"
              style="display: none"
            />
          </div>

          <button type="submit" class="submit-btn" :disabled="loading || !file">
            {{ loading ? 'Encrypting & Uploading...' : 'Secure Transfer' }}
          </button>
        </form>
      </div>

      <div class="history-card">
        <h3>Recent Transfer Log</h3>
        <table class="history-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, index) in fakeHistory" :key="index">
              <td class="file-col">
                <span class="file-type-icon">📄</span> {{ log.name }}
              </td>
              <td><span class="badge success">Verified</span></td>
              <td class="time-col">{{ log.time }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script>
import axios from 'axios';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import './style.css';

export default {
  name: 'App',
  data() {
    return {
      file: null,
      uploads: 0,
      loading: false,
      isDragging: false,
      clientIp: '',
      fakeHistory: [
        { name: 'Q4_Financial_Report.pdf', time: '10 mins ago' },
        { name: 'HR_Employee_List.xlsx', time: '1 hour ago' },
        { name: 'Server_Backup_Log.txt', time: '2 hours ago' },
        { name: 'Project_Alpha_Specs.docx', time: 'Yesterday' }
      ]
    };
  },
  async created() {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      this.clientIp = response.data.ip;
    } catch (error) {
      this.clientIp = 'unknown';
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    onFileChange(event) {
      this.file = event.target.files[0];
    },
    handleDrop(event) {
      this.isDragging = false;
      this.file = event.dataTransfer.files[0];
    },
    async handleUpload() {
      if (!this.file) return;
      
      this.uploads++;
      this.loading = true;

      try {
        const formData = new FormData();
        formData.append('file', this.file);
        formData.append('clientIp', this.clientIp); 

        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        Swal.fire({
          icon: 'success',
          title: 'Transfer Complete',
          text: 'File successfully encrypted and stored in secure vault.',
          confirmButtonColor: '#2ecc71',
          background: '#f8f9fa',
          color: '#2c3e50'
        });
        
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Security Alert',
          text: 'Firewall rejected the file. Suspicious pattern detected.',
          confirmButtonColor: '#e74c3c'
        });
      } finally {
        this.loading = false;
        this.file = null;
        if (this.$refs.fileInput) this.$refs.fileInput.value = '';
      }
    }
  }
};
</script>
