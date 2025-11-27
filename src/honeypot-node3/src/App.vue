<template>
  <div class="uploader-container">
    <h1>File Uploader</h1>
    <form @submit.prevent="handleUpload">
      <div class="form-group">
        <label for="file">Choose a file:</label>
        <input 
          type="file" 
          id="file" 
          @change="onFileChange"
        />
      </div>
      <button type="submit">Upload</button>
    </form>
    <p v-if="file">Selected file: {{ file.name }}</p>
    <small>Buffered: {{ bufferedCount }}</small>
  </div>
</template>

<script>
import { getGeoData, calculateSeverity, getPublicIP } from '../utils/helpers.js';
import { evaluateFileSeverity } from '../utils/severity-evaluator.js';
import DataBuffer from '../utils/buffer.js';
const buffer = new DataBuffer(100);

export default {
  name: 'App',
  data() {
    return {
      file: null,
      bufferedCount: 0
    };
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
    onFileChange(event) {
      this.file = event.target.files[0];
    },
    async handleUpload() {
      if (!this.file) return;
      
      const publicIp = await getPublicIP();
      const geoData = await getGeoData(publicIp);
      const fileExtension = this.file.name.split('.').pop();

      // Log file upload attempt
      const uploadData = {
        honeypotId: 'node3',
        sourceIp: publicIp,
        destinationPort: 3003,
        protocol: 'FTP',
        payload: JSON.stringify({
          fileName: this.file.name,
          fileExtension: fileExtension
        }),
        severity: await evaluateFileSeverity(fileExtension),
        timestamp: new Date().toISOString(),
        geoData: geoData
      };

      try {
        if (this.$socket && this.$socket.connected) {
          this.$socket.emit('honeypot_data', uploadData);
          console.log('File data sent via Socket.IO');
        } else {
          buffer.add(uploadData);
          this.bufferedCount = buffer.size();
          console.log(`Data buffered. Buffer size: ${this.bufferedCount}`);
        }

        alert('File uploaded successfully!');
        this.file = null;
      } catch (error) {
        console.error('Failed to send data to collector:', error);
        alert('Failed to upload file.');
      }
    }
  }
};
</script>

<style>
.uploader-container {
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