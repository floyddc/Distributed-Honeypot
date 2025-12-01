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
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-screen bg-gray-100 font-sans">
    
    <!-- Sidebar -->
    <aside :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col">
      
      <div class="flex items-center justify-center h-16 border-b border-gray-200 bg-gray-50">
        <h1 class="text-xl font-bold text-gray-800">
          Honeypot Dashboard
        </h1>
      </div>

        <nav class="mt-5 px-2 space-y-1">
          <router-link to="/" class="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            <svg class="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </router-link>

          <router-link v-if="authStore.user?.role === 'admin'" to="/admin" class="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            <svg class="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Admin Panel
          </router-link>
        </nav>

      <div class="p-4 border-t border-gray-200 bg-gray-50">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
            {{ authStore.user?.username.charAt(0).toUpperCase() }}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-700">{{ authStore.user?.username }}</p>
            <p class="text-xs text-gray-500">{{ authStore.user?.role || 'User' }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
        <button @click="sidebarOpen = !sidebarOpen" class="text-gray-500 focus:outline-none md:hidden">
          Menu
        </button>
        
        <div class="flex-1 flex justify-end items-center space-x-4">
          <div class="hidden md:flex items-center px-3 py-1 rounded-full border"
               :class="systemStatus === 'online' ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'">
            <span class="w-2 h-2 rounded-full mr-2 animate-pulse"
                  :class="systemStatus === 'online' ? 'bg-green-500' : 'bg-red-500'"></span>
            <span class="text-xs font-medium"
                  :class="systemStatus === 'online' ? 'text-green-700' : 'text-red-700'">
              System {{ systemStatus === 'online' ? 'Online' : 'Offline' }}
            </span>
          </div>

          <button @click="handleLogout" class="text-sm text-gray-600 hover:text-red-600 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-x-hidden overflow-y-auto p-6">
        <slot></slot>
      </main>
    </div>
  </div>
</template>
