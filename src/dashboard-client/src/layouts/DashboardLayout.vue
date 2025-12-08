<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSocketStore } from '../stores/socket'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const socketStore = useSocketStore()
const router = useRouter()
const sidebarOpen = ref(false)

const systemStatus = computed(() => {
  const online = socketStore.honeypots.filter(h => h.status === 'online').length
  return online > 0 ? 'online' : 'offline'
})

const handleLogout = () => {
  socketStore.disconnect()
  authStore.logout()
  router.push('/login')
}

const handleDeleteAccount = async () => {
  const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.')
  if (!confirmed) return

  try {
    const response = await fetch('http://localhost:3000/api/auth/me', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (response.ok) {
      alert('Your account has been deleted successfully.')
      socketStore.disconnect()
      authStore.logout()
      router.push('/login')
    } else {
      const data = await response.json()
      alert(data.message || 'Failed to delete account')
    }
  } catch (error) {
    console.error('Error deleting account:', error)
    alert('Failed to delete account')
  }
}

import { onMounted } from 'vue'

onMounted(() => {
  if (authStore.token) {
    socketStore.connect()
  }
})
</script>

<template>
  <div class="flex h-screen bg-[rgba(22,21,21,0.8)] font-sans">
    
    <!-- Sidebar -->
    <aside :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      class="fixed inset-y-0 left-0 z-50 w-64 bg-[rgba(22,21,21,0.9)] border-r border-[#5fbfbb] transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col">
      
      <div class="flex items-center justify-center h-16 border-b border-[#5fbfbb] bg-[rgba(22,21,21,0.95)]">
        <h1 class="text-xl font-bold text-[#5fbfbb]">
          Honeypot Dashboard
        </h1>
      </div>

        <nav class="mt-5 px-2 space-y-1">
          <router-link to="/" class="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-300 hover:bg-[rgba(95,191,187,0.2)] hover:text-[#5fbfbb]">
            <svg class="mr-4 h-6 w-6 text-[#5fbfbb] group-hover:text-[#5fbfbb]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </router-link>

          <router-link v-if="authStore.user?.role === 'admin'" to="/admin" class="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-300 hover:bg-[rgba(95,191,187,0.2)] hover:text-[#5fbfbb]">
            <svg class="mr-4 h-6 w-6 text-[#5fbfbb] group-hover:text-[#5fbfbb]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Admin Panel
          </router-link>
        </nav>

      <div class="p-4 border-t border-[#5fbfbb] bg-[rgba(22,21,21,0.95)] mt-auto">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-[#5fbfbb] flex items-center justify-center text-xs font-bold text-[rgba(22,21,21,0.8)]">
            {{ authStore.user?.username.charAt(0).toUpperCase() }}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-200">{{ authStore.user?.username }}</p>
            <p class="text-xs text-gray-400">{{ authStore.user?.role || 'User' }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="flex items-center justify-between h-16 px-6 bg-[rgba(22,21,21,0.9)] border-b border-[#5fbfbb]">
        <button @click="sidebarOpen = !sidebarOpen" class="text-[#5fbfbb] focus:outline-none md:hidden">
          Menu
        </button>
        
        <div class="flex-1 flex justify-end items-center space-x-4">
          <div class="hidden md:flex items-center px-3 py-1 rounded-full border"
               :class="systemStatus === 'online' ? 'bg-[rgba(95,191,187,0.2)] border-[#5fbfbb]' : 'bg-[rgba(239,68,68,0.2)] border-red-500'">
            <span class="w-2 h-2 rounded-full mr-2 animate-pulse"
                  :class="systemStatus === 'online' ? 'bg-[#5fbfbb]' : 'bg-red-500'"></span>
            <span class="text-xs font-medium"
                  :class="systemStatus === 'online' ? 'text-[#5fbfbb]' : 'text-red-400'">
              System {{ systemStatus === 'online' ? 'Online' : 'Offline' }}
            </span>
          </div>

          <button @click="handleDeleteAccount" class="text-sm text-gray-300 hover:text-red-400 transition-colors">
            Delete Account
          </button>

          <button @click="handleLogout" class="text-sm text-gray-300 hover:text-red-400 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-[rgba(22,21,21,0.8)]">
        <slot></slot>
      </main>
    </div>
  </div>
</template>
