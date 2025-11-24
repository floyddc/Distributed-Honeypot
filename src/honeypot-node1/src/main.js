import { createApp } from 'vue'
import App from './App.vue'
import { io } from 'socket.io-client' 

const app = createApp(App)

// Global socket instance
app.config.globalProperties.$socket = io('http://localhost:3000')

app.mount('#app')