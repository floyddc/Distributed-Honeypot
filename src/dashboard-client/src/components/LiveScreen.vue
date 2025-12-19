<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSocketStore } from '../stores/socket'

const socketStore = useSocketStore()
const activeSession = ref(null)
const sessions = computed(() => socketStore.liveSessions)
const containerRef = ref(null)

watch(sessions, (newSessions) => {
  const sessionIds = Object.keys(newSessions)
  if (sessionIds.length > 0) {
    if (!activeSession.value || !newSessions[activeSession.value]) {
      activeSession.value = sessionIds[0]
    }
  } else {
    activeSession.value = null
  }
}, { immediate: true, deep: true })

onMounted(() => {
  const sessionIds = Object.keys(sessions.value)
  if (sessionIds.length > 0 && !activeSession.value) {
    activeSession.value = sessionIds[0]
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
    <div ref="containerRef" class="relative w-full bg-[rgba(22,21,21,0.95)] border-2 border-[#5fbfbb] rounded-lg shadow-lg overflow-hidden aspect-video">
      
      <div v-if="activeSession && sessions[activeSession]" class="w-full h-full relative">
        
        <!-- View: LOGIN PAGE -->
        <div v-if="!sessions[activeSession].currentView || sessions[activeSession].currentView === 'login'" 
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
        <div v-else-if="sessions[activeSession].currentView === 'dashboard'" 
             class="absolute inset-0 bg-[#f5f5f5] flex flex-col font-sans">
            <!-- Simulated Header -->
            <header class="bg-[#2c3e50] text-white p-4 flex justify-between items-center shadow-md">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-[#e74c3c] flex items-center justify-center font-bold">A</div>
                    <span class="font-bold text-lg">Restricted Access Area</span>
                </div>
                <button class="px-3 py-1 bg-[#c0392b] rounded text-sm hover:bg-[#a93226]">Logout</button>
            </header>

            <!-- Simulated Content -->
            <main class="flex-1 p-6 overflow-y-auto">
                <div class="max-w-4xl mx-auto">
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-6 rounded shadow-sm text-sm">
                        <strong class="font-bold">WARNING:</strong> Unauthorized access is strictly prohibited.
                    </div>

                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div class="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 class="font-semibold text-gray-700">Confidential Files</h3>
                            <span class="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Level 5 Clearance</span>
                        </div>
                        <table class="min-w-full divide-y divide-gray-200 text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th class="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                <tr v-for="file in ['passwords.txt', 'salary_report.xlsx', 'network_config.json', 'vpn_keys.zip']" :key="file" class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-gray-900 font-medium whitespace-nowrap flex items-center gap-2">
                                        📄 {{ file }}
                                    </td>
                                    <td class="px-4 py-2 text-gray-500">12 KB</td>
                                    <td class="px-4 py-2 text-gray-500">2024-12-10</td>
                                    <td class="px-4 py-2 text-right">
                                        <button class="text-blue-600 hover:text-blue-900 font-semibold px-2">Download</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
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
        <p class="text-sm text-gray-500">Node 1 Signal Lost</p>
      </div>
    </div>
  </div>
</template>