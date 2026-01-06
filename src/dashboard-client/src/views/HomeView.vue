<script setup>
import { ref, computed } from 'vue'
import ActionPopup from '../components/ActionPopup.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import AttackTable from '../components/AttackTable.vue'
import DashboardCharts from '../components/DashboardCharts.vue'
import LiveTerminal from '../components/LiveTerminal.vue'
import LiveScreen from '../components/LiveScreen.vue'
import ReportModal from '../components/ReportModal.vue'
import { useSocketStore } from '../stores/socket'
import { useAuthStore } from '../stores/auth'

const socketStore = useSocketStore()
const authStore = useAuthStore()
const showTerminal = ref(false)
const showLiveScreen = ref(false)

const activeHoneypots = computed(() => {
  return socketStore.honeypots.filter(h => h.status === 'online').length
})

const onlineHoneypotsList = computed(() => {
  return socketStore.honeypots.filter(h => h.status === 'online')
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
      },
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

const showReportModal = ref(false)
const selectedHoneypot = ref({ honeypotId: '', port: '' })

const openReportModal = (honeypotId, port) => {
  selectedHoneypot.value = { honeypotId, port }
  showReportModal.value = true
}

const closeReportModal = () => {
  showReportModal.value = false
  selectedHoneypot.value = { honeypotId: '', port: '' }
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
        <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb] flex flex-col h-full bg-gradient-to-br from-[rgba(22,21,21,0.95)] to-[rgba(30,30,30,0.95)]">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-[#5fbfbb] text-xs font-medium uppercase tracking-wider">Active Nodes</h3>
            <span class="text-[10px] bg-[#5fbfbb] text-black px-1.5 py-0.5 rounded-full font-bold">{{ activeHoneypots }}/{{ totalHoneypots }}</span>
          </div>
          
          <div class="flex-1 overflow-y-auto pr-1 min-h-[100px]">
            <div v-if="onlineHoneypotsList.length > 0" class="grid grid-cols-3 gap-2">
              <div 
                v-for="hp in onlineHoneypotsList" 
                :key="hp.honeypotId" 
                @click="!isAdmin && openReportModal(hp.honeypotId, hp.port)"
                class="group relative flex flex-col items-center justify-center p-1.5 rounded border border-[rgba(95,191,187,0.3)] bg-[rgba(95,191,187,0.05)] hover:bg-[rgba(95,191,187,0.15)] hover:border-[#5fbfbb] transition-all cursor-pointer aspect-square"
                :class="{'opacity-50 cursor-not-allowed': isAdmin}"
                title="Click to Report"
              >
                <!-- Status Dot (Top Left) -->
                <div class="absolute top-1 left-1">
                   <span class="block w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse"></span>
                </div>

                <!-- Report Icon (Top Right) -->
                <div v-if="!isAdmin" class="absolute top-1 right-1 text-[10px] text-gray-500 group-hover:text-red-400 transition-colors">
                   🏳️
                </div>

                <!-- Main Icon -->
                <div class="mb-1 text-lg opacity-70 group-hover:scale-110 transition-transform">
                  🕸️
                </div>

                <!-- Info -->
                <div class="text-center w-full overflow-hidden leading-tight">
                  <div class="text-[9px] text-gray-400 uppercase tracking-tighter truncate font-mono w-full">{{ hp.honeypotId }}</div>
                  <div class="text-[10px] font-bold text-[#5fbfbb] font-mono">:{{ hp.port }}</div>
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center h-full text-gray-500 italic space-y-2">
              <span class="text-xl opacity-20">🚫</span>
              <span class="text-[10px]">No active nodes</span>
            </div>
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
    
    <ReportModal
      v-if="showReportModal"
      :honeypotId="selectedHoneypot.honeypotId"
      :port="selectedHoneypot.port"
      @close="closeReportModal"
    />
  </DashboardLayout>
</template>
