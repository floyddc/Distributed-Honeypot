<script setup>
import { ref, computed } from 'vue'
import ActionPopup from '../components/ActionPopup.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import AttackTable from '../components/AttackTable.vue'
import DashboardCharts from '../components/DashboardCharts.vue'
import LiveTerminal from '../components/LiveTerminal.vue'
import LiveScreen from '../components/LiveScreen.vue'
import { useSocketStore } from '../stores/socket'
import { useAuthStore } from '../stores/auth'

const socketStore = useSocketStore()
const authStore = useAuthStore()
const showTerminal = ref(false)
const showLiveScreen = ref(false)

const activeHoneypots = computed(() => {
  return socketStore.honeypots.filter(h => h.status === 'online').length
})

const totalHoneypots = computed(() => {
  return socketStore.honeypots.length
})

const isAdmin = computed(() => {
  return authStore.user?.role === 'admin'
})

const showConfirm = ref(false)
const confirmMessage = ref('')
let confirmResolve = null

const askConfirm = (msg) => new Promise((resolve) => {
  confirmMessage.value = msg
  showConfirm.value = true
  confirmResolve = resolve
})

const onConfirm = () => { if (confirmResolve) confirmResolve(true); confirmResolve = null }
const onCancel = () => { if (confirmResolve) confirmResolve(false); confirmResolve = null }

const clearAttacks = async () => {
  if (!(await askConfirm('Are you sure you want to delete ALL attacks?'))) {
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
    <div class="mb-4">
      <h2 class="text-xl font-bold text-[#5fbfbb]">Overview</h2>
    </div>

    <div class="grid grid-cols-1 gap-4 mb-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <!-- Total Attacks -->
        <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb]">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-[#5fbfbb] text-xs font-medium uppercase">Total Attacks</h3>
            <button 
              v-if="isAdmin"
              @click="clearAttacks"
              class="px-2 py-0.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Clear all attacks from database"
            >
              CLEAR
            </button>
          </div>
          <div class="mt-1">
            <p class="text-2xl font-bold text-gray-100">{{ socketStore.attacks.length }}</p>
          </div>
        </div>

        <!-- Active Honeypots -->
        <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb]">
          <h3 class="text-[#5fbfbb] text-xs font-medium uppercase">Active Honeypots</h3>
          <div class="mt-1">
            <p class="text-2xl font-bold text-gray-100">{{ activeHoneypots }} / {{ totalHoneypots }}</p>
          </div>
        </div>

        <!-- Live Terminal Button -->
        <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb]">
          <h3 class="text-[#5fbfbb] text-xs font-medium uppercase mb-2">Live SSH Honeypot</h3>
          <button 
            @click="showTerminal = !showTerminal"
            class="w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            :class="showTerminal 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-[#5fbfbb] hover:bg-[#4fa9a5] text-[rgba(22,21,21,0.9)]'"
          >
            {{ showTerminal ? '✕ Close' : '▶ Open' }}
          </button>
        </div>

        <!-- Live Login Screen Button -->
        <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb]">
          <h3 class="text-[#5fbfbb] text-xs font-medium uppercase mb-2">Live Login Honeypot</h3>
          <button 
            @click="showLiveScreen = !showLiveScreen"
            class="w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            :class="showLiveScreen 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-[#5fbfbb] hover:bg-[#4fa9a5] text-[rgba(22,21,21,0.9)]'"
          >
            {{ showLiveScreen ? '✕ Close' : '▶ Open' }}
          </button>
        </div>

      </div>
    </div>

    <!-- Live Terminal -->
    <div v-if="showTerminal" class="mb-6">
      <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb]">
        <h3 class="text-base font-medium text-[#5fbfbb] mb-3">Live SSH Sessions</h3>
        <LiveTerminal />
      </div>
    </div>

    <!-- Live Screen -->
    <div v-if="showLiveScreen" class="mb-6">
      <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb]">
        <h3 class="text-base font-medium text-[#5fbfbb] mb-3">Live Attacker Screen</h3>
        <LiveScreen />
      </div>
    </div>

    <DashboardCharts :attacks="socketStore.attacks" />

    <div class="grid grid-cols-1 gap-4 mt-6">
      <AttackTable :attacks="socketStore.attacks" />
    </div>
    <ActionPopup v-model="showConfirm" :message="confirmMessage" :confirm="true" @confirm="onConfirm" @cancel="onCancel" />
  </DashboardLayout>
</template>
