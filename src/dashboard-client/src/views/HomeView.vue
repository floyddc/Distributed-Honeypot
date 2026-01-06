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
    <div class="grid grid-cols-1 gap-4 mb-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <!-- Total Attacks -->
        <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb] flex flex-col items-center justify-center relative">
          <button 
            v-if="isAdmin"
            @click="clearAttacks"
            class="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Clear all attacks from database"
          >
            CLEAR
          </button>
          <h3 class="text-[#5fbfbb] text-xs font-medium uppercase mb-2">Total Attacks</h3>
          <p class="text-3xl font-bold text-gray-100">{{ socketStore.attacks.length }}</p>
        </div>

        <!-- Active Honeypots -->
        <div class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border border-[#5fbfbb] flex flex-col h-full bg-gradient-to-br from-[rgba(22,21,21,0.95)] to-[rgba(30,30,30,0.95)]">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-[#5fbfbb] text-xs font-medium uppercase tracking-wider">Active Nodes</h3>
            <span class="text-[10px] bg-[#5fbfbb] text-black px-1.5 py-0.5 rounded-full font-bold">{{ activeHoneypots }}/{{ totalHoneypots }}</span>
          </div>
          
          <div class="flex-1 overflow-y-auto pr-1 min-h-[100px]">
            <div v-if="onlineHoneypotsList.length > 0" class="space-y-2">
              <div 
                v-for="hp in onlineHoneypotsList" 
                :key="hp.honeypotId" 
                @click="!isAdmin && openReportModal(hp.honeypotId, hp.port)"
                class="group relative flex items-center gap-3 p-2 rounded border border-[rgba(95,191,187,0.3)] bg-[rgba(95,191,187,0.05)] hover:bg-[rgba(95,191,187,0.15)] hover:border-[#5fbfbb] transition-all cursor-pointer"
                :class="{'opacity-50 cursor-not-allowed': isAdmin}"
                title="Click to Report"
              >
                <!-- Status Dot -->
                <div class="flex-shrink-0">
                   <span class="block w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse"></span>
                </div>

                <!-- Info -->
                <div class="flex-1 flex items-center gap-2 overflow-hidden">
                  <div class="text-sm text-gray-400 uppercase tracking-tight truncate font-mono">{{ hp.honeypotId }}</div>
                  <div class="text-base font-bold text-[#5fbfbb] font-mono">:{{ hp.port }}</div>
                </div>

                <!-- Report Icon -->
                <div v-if="!isAdmin" class="flex-shrink-0 text-sm text-gray-500 group-hover:text-red-400 transition-colors">
                   🚩
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
              <span class="text-xl opacity-20">❌</span>
              <span class="text-sm">No active nodes</span>
            </div>
          </div>
        </div>

        <!-- Live Terminal Button -->
        <div 
          @click="showTerminal = !showTerminal"
          class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-300 flex flex-col items-center justify-center group relative overflow-hidden h-full bg-gradient-to-br from-[rgba(22,21,21,0.95)] to-[rgba(30,30,30,0.95)]"
          :class="showTerminal ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-[#5fbfbb] hover:shadow-[0_0_15px_rgba(95,191,187,0.3)]'"
        >
          
          <div class="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(95,191,187,0.05)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
      
          <div class="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300 text-[#5fbfbb]">
            {{ showTerminal ? '⏸' : '▶' }}
          </div>
          
      
          <h3 class="text-[#5fbfbb] text-xs font-medium uppercase tracking-wider text-center group-hover:text-white transition-colors">
            SSH Honeypot
          </h3>
          <p class="text-[10px] text-gray-500 mt-1 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
            {{ showTerminal ? 'Close Live SSH Terminal' : 'Open Live SSH Terminal' }}
          </p>
        </div>

        <!-- Live Login Screen Button -->
        <div 
          @click="showLiveScreen = !showLiveScreen"
          class="bg-[rgba(22,21,21,0.9)] p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-300 flex flex-col items-center justify-center group relative overflow-hidden h-full bg-gradient-to-br from-[rgba(22,21,21,0.95)] to-[rgba(30,30,30,0.95)]"
          :class="showLiveScreen ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-[#5fbfbb] hover:shadow-[0_0_15px_rgba(95,191,187,0.3)]'"
        >
          
          <div class="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(95,191,187,0.05)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          
          <div class="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300 text-[#5fbfbb]">
             {{ showLiveScreen ? '⏸' : '▶' }}
          </div>
          
          
          <h3 class="text-[#5fbfbb] text-xs font-medium uppercase tracking-wider text-center group-hover:text-white transition-colors">
            Login Honeypot
          </h3>
          <p class="text-[10px] text-gray-500 mt-1 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
            {{ showLiveScreen ? 'Close Live Login Screen' : 'Open Live Login Screen' }}
          </p>
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
