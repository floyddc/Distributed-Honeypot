<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const sidebarOpen = ref(false)

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

      <nav class="flex-1 px-4 py-6 space-y-2">
        <router-link to="/"
          class="group flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors"
          active-class="bg-blue-100 text-blue-700"
          :class="$route.path !== '/' ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' : ''">
          Dashboard
        </router-link>
        
        <a href="#" class="group flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          Analytics
        </a>
      </nav>

      <div class="p-4 border-t border-gray-200 bg-gray-50">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
            {{ authStore.user?.username.charAt(0).toUpperCase() }}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-700">{{ authStore.user?.username }}</p>
            <p class="text-xs text-gray-500">Admin</p>
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
          <div class="hidden md:flex items-center px-3 py-1 rounded-full bg-green-100 border border-green-200">
            <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            <span class="text-xs font-medium text-green-700">System Online</span>
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
