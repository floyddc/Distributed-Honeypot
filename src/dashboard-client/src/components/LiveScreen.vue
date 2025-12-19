<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSocketStore } from '../stores/socket'

const socketStore = useSocketStore()
const activeSession = ref(null)
const sessions = computed(() => socketStore.liveSessions)
const containerRef = ref(null)

watch(sessions, (newSessions) => {
  const entries = Object.entries(newSessions || {})
  if (entries.length === 0) {
    activeSession.value = null
    return
  }

  let latestId = null
  let latestTs = 0
  entries.forEach(([id, s]) => {
    const ts = Number(s && s.lastActivity) || 0
    if (ts > latestTs) { latestTs = ts; latestId = id }
  })

  if (!activeSession.value || !newSessions[activeSession.value]) {
    activeSession.value = latestId || entries[0][0]
  }
}, { immediate: true, deep: true })

onMounted(() => {
  const entries = Object.entries(sessions.value || {})
  if (entries.length > 0 && !activeSession.value) {
    let latestId = null
    let latestTs = 0
    entries.forEach(([id, s]) => {
      const ts = Number(s && s.lastActivity) || 0
      if (ts > latestTs) { latestTs = ts; latestId = id }
    })
    activeSession.value = latestId || entries[0][0]
  }
})
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <!-- Session Selector -->
    <div v-if="Object.keys(sessions).length > 0" class="flex gap-2 overflow-x-auto shrink-0">
      <button 
        v-for="(session, id) in sessions" 
        :key="id"
        @click="activeSession = id"
        class="px-4 py-2 rounded text-sm whitespace-nowrap font-semibold transition-colors"
        :class="activeSession === id ? 'bg-[#5fbfbb] text-[rgba(22,21,21,0.9)]' : 'bg-[rgba(22,21,21,0.8)] text-gray-300 border border-[#5fbfbb] hover:bg-[rgba(95,191,187,0.2)]'"
      >
        {{ session.honeypotId }} - {{ id.slice(0, 8) }}...
      </button>
    </div>
    
    <!-- Virtual Screen Container -->
    <div ref="containerRef" class="relative w-full max-w-xl mx-auto bg-[rgba(22,21,21,0.95)] border-2 border-[#5fbfbb] rounded-lg shadow-lg overflow-hidden" style="height:480px;">
      
      <div v-if="activeSession && sessions[activeSession]" class="w-full h-full relative">
        
        <!-- View: LOGIN PAGE -->
        <div v-if="!sessions[activeSession].loggedIn && (!sessions[activeSession].currentView || sessions[activeSession].currentView === 'login')" 
             class="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5fbfbb] to-[rgba(22,21,21,0.8)]">
          <div class="bg-white p-6 rounded-lg shadow-xl border-2 border-[#5fbfbb]" style="max-width: 300px; width: 100%;">
             <div class="mb-4 text-center">
                <h1 class="text-2xl font-bold text-[rgba(22,21,21,0.9)]">ASW</h1>
                <p class="text-xs text-gray-500 uppercase tracking-widest">Protected Area</p>
             </div>
             
            <h2 class="text-xl font-bold mb-3 text-[rgba(22,21,21,0.9)]">Login</h2>
            
            <div class="form-group mb-3">
              <label class="block mb-1 text-xs text-gray-700">Username:</label>
              <input 
                :value="sessions[activeSession].fields?.username || ''"
                class="w-full px-3 py-1.5 border-2 border-[#5fbfbb] rounded text-sm bg-white text-gray-900 font-mono"
                readonly
              />
            </div>
            
            <div class="form-group mb-3">
              <label class="block mb-1 text-xs text-gray-700">Password:</label>
              <input 
                :value="sessions[activeSession].fields?.password || ''"
                type="text"
                class="w-full px-3 py-1.5 border-2 border-[#5fbfbb] rounded text-sm bg-white text-gray-900 font-mono"
                readonly
              />
            </div>
            
            <button class="w-full bg-[#5fbfbb] text-white py-1.5 rounded mb-3 text-sm font-semibold">
              Login
            </button>
            <p class="text-xs text-center text-gray-400">© 2025 ASW</p>
          </div>
        </div>

        <!-- View: FILE DASHBOARD (Logged In) -->
        <div v-else-if="sessions[activeSession].loggedIn || sessions[activeSession].currentView === 'dashboard'" class="absolute inset-0 bg-[#f5f5f5] flex items-center justify-center font-sans">
          <div class="bg-white p-6 rounded-lg shadow-xl border-2 border-[#5fbfbb]" style="max-width: 600px; width: 100%;">
            <div class="dashboard-header flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h2 class="text-lg font-bold text-[#c0392b]">Restricted Access Area</h2>
            <button class="logout-btn bg-[#95a5a6] text-white px-2 py-1 rounded" @click="handleLogout">Logout</button>
          </div>

          <div class="alert-banner bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm font-bold text-center border border-red-200">
            WARNING: Do not download these documents.
          </div>

          <div class="file-list flex flex-col gap-3">
            <div class="file-item flex items-center p-3 border rounded" v-for="file in [{name:'passwords.txt',size:'12 KB',date:'2024-12-10'},{name:'salary_report_2024.xlsx',size:'1.2 MB',date:'2024-11-28'},{name:'network_config.json',size:'4 KB',date:'2025-01-15'},{name:'vpn_keys.zip',size:'45 MB',date:'2024-10-05'},{name:'admin_notes.docx',size:'24 KB',date:'2024-12-20'}]" :key="file.name">
            <div class="file-icon text-2xl mr-3">📄</div>
            <div class="file-details flex-grow">
              <div class="file-name font-semibold text-sm text-[#2c3e50]">{{ file.name }}</div>
              <div class="file-meta text-xs text-gray-500">{{ file.size }} • {{ file.date }}</div>
            </div>
            <button class="download-btn bg-[#3498db] text-white px-3 py-1 rounded text-sm">Download</button>
            </div>
          </div>
          </div>
        </div>

        <!-- Mouse Cursor -->
        <div 
          v-if="(sessions[activeSession].mouseX || 0) > 0 || (sessions[activeSession].mouseY || 0) > 0"
          class="absolute w-3 h-3 bg-red-500 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-50 shadow-sm"
          :style="{
            left: ((sessions[activeSession].mouseX || 0) + '%'),
            top: ((sessions[activeSession].mouseY || 0) + '%'),
            transition: 'left 50ms linear, top 50ms linear'
          }"
        >
          <div class="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
        </div>
        
        <!-- Live Badge -->
        <div class="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded-full text-xs animate-pulse z-50 font-bold shadow-sm">
          🔴 LIVE
        </div>

      </div>

      <!-- Empty State -->
      <div v-else class="w-full h-full flex flex-col items-center justify-center text-[#5fbfbb]">
        <svg class="h-16 w-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 class="text-lg font-medium mb-1">Waiting for connections...</h3>
        <p class="text-sm text-gray-500">Honeypot Node 1</p>
      </div>
    </div>
  </div>
</template>