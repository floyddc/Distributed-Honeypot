<script setup>
import { ref, computed } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import AttackTable from '../components/AttackTable.vue'
import DashboardCharts from '../components/DashboardCharts.vue'
import LiveTerminal from '../components/LiveTerminal.vue'
import { useSocketStore } from '../stores/socket'
import { useAuthStore } from '../stores/auth'

const socketStore = useSocketStore()
const authStore = useAuthStore()
const showTerminal = ref(false)

const activeHoneypots = computed(() => {
  return socketStore.honeypots.filter(h => h.status === 'online').length
})

const totalHoneypots = computed(() => {
  return socketStore.honeypots.length
})

const isAdmin = computed(() => {
  return authStore.user?.role === 'admin'
})

const clearAttacks = async () => {
  if (!confirm('Are you sure you want to delete ALL attacks?')) {
    return
  }

  try {
    const response = await fetch('http://localhost:3000/api/admin/attacks', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (response.ok) {
      const result = await response.json()
      console.log(result.message)
      socketStore.attacks = []  
    } else {
      console.error('Failed to clear attacks')
    }
  } catch (error) {
    console.error('Error clearing attacks:', error)
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Overview</h2>
    </div>

    <div class="grid grid-cols-1 gap-6 mb-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Total Attacks -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-gray-500 text-sm font-medium uppercase">Total Attacks</h3>
            <button 
              v-if="isAdmin"
              @click="clearAttacks"
              class="px-3 py-1 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Clear all attacks from database"
            >
              CLEAR
            </button>
          </div>
          <div class="mt-2">
            <p class="text-3xl font-bold text-gray-900">{{ socketStore.attacks.length }}</p>
          </div>
        </div>

        <!-- Active Honeypots -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 class="text-gray-500 text-sm font-medium uppercase">Active Honeypots</h3>
          <div class="mt-2">
            <p class="text-3xl font-bold text-gray-900">{{ activeHoneypots }} / {{ totalHoneypots }}</p>
          </div>
        </div>

        <!-- Live Terminal Button -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 class="text-gray-500 text-sm font-medium uppercase">Live SSH Interactions</h3>
          <div class="mt-2">
            <button 
              @click="showTerminal = !showTerminal"
              class="w-full px-4 py-3 rounded-lg font-semibold transition-colors"
              :class="showTerminal 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'"
            >
              {{ showTerminal ? '✕ Close Terminal' : '▶ Open Terminal' }}
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Live Terminal -->
    <div v-if="showTerminal" class="mb-8">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Live Interactive Sessions</h3>
        <LiveTerminal />
      </div>
    </div>

    <DashboardCharts :attacks="socketStore.attacks" />

    <div class="grid grid-cols-1 gap-6 mt-8">
      <AttackTable :attacks="socketStore.attacks" />
    </div>
  </DashboardLayout>
</template>
