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
          required
        />
      </div>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Uploading...' : 'Upload' }}
      </button>
    </form>
    <p v-if="file">Selected file: {{ file.name }}</p>
    <small>Uploads: {{ uploads }}</small>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data() {
    return {
      file: null,
      uploads: 0,
      loading: false
    };
  },
  methods: {
    onFileChange(event) {
      this.file = event.target.files[0];
    },
    async handleUpload() {
      if (!this.file) return;
      
      this.uploads++;
      this.loading = true;

      try {
        const formData = new FormData();
        formData.append('file', this.file);

        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        alert(response.data.message || 'File uploaded successfully!');
        
      } catch (error) {
        alert('Failed to upload file. Please try again.');   
      } finally {
        this.loading = false;
        this.file = null;
        const fileInput = document.getElementById('file');
        if (fileInput) fileInput.value = '';
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

button:disabled {
  background-color: grey;
  cursor: not-allowed;
}
</style>