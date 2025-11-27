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

export default {
  name: 'App',
  data() {
    return {
      username: '',
      password: '',
      attempts: 0,
      loading: false
    }
  },
  methods: {
    async handleSubmit() {
      this.attempts++;
      this.loading = true;

      try {
        // Send login attempt to node server
        await axios.post('/api/login', {
          username: this.username.trim(),
          password: this.password.trim()
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