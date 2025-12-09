<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSocketStore } from '../stores/socket'

const socketStore = useSocketStore()
const activeSession = ref(null)
const sessions = computed(() => socketStore.liveSessions)

watch(sessions, (newSessions) => {
  const sessionIds = Object.keys(newSessions)
  console.log('[LiveScreen] Sessions watch triggered, session IDs:', sessionIds)
  
  if (sessionIds.length > 0) {
    if (!activeSession.value || !newSessions[activeSession.value]) {
      activeSession.value = sessionIds[0]
      console.log('[LiveScreen] Set active session to:', activeSession.value)
    }
  } else {
    activeSession.value = null
    console.log('[LiveScreen] No sessions available')
  }
}, { immediate: true, deep: true })

onMounted(() => {
  console.log('[LiveScreen] Component mounted')
  console.log('[LiveScreen] Sessions from store:', Object.keys(sessions.value))
  const sessionIds = Object.keys(sessions.value)
  if (sessionIds.length > 0 && !activeSession.value) {
    activeSession.value = sessionIds[0]
    console.log('[LiveScreen] Initialized active session to:', activeSession.value)
  }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Session Selector -->
    <div v-if="Object.keys(sessions).length > 0" class="flex gap-2 overflow-x-auto">
      <button 
        v-for="(session, id) in sessions" 
        :key="id"
        @click="activeSession = id"
        class="px-4 py-2 rounded text-sm whitespace-nowrap font-semibold"
        :class="activeSession === id ? 'bg-[#5fbfbb] text-[rgba(22,21,21,0.9)]' : 'bg-[rgba(22,21,21,0.8)] text-gray-300 border border-[#5fbfbb]'"
      >
        {{ session.honeypotId }} - {{ id.slice(0, 8) }}...
      </button>
    </div>
    
    <!-- Virtual Screen -->
    <div v-if="activeSession && sessions[activeSession]" 
         class="relative bg-white border-2 border-[#5fbfbb] rounded-lg shadow-lg mx-auto"
         style="width: 600px; height: 450px;">
      
      <!-- Login page -->
      <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#5fbfbb] to-[rgba(22,21,21,0.8)]">
        <div class="bg-white p-6 rounded-lg shadow-xl border-2 border-[#5fbfbb]" style="max-width: 300px; width: 100%;">
          <h2 class="text-xl font-bold mb-3 text-[rgba(22,21,21,0.9)]">Login</h2>
          
          <div class="form-group mb-3">
            <label class="block mb-1 text-xs text-gray-700">Username:</label>
            <input 
              :value="sessions[activeSession].fields?.username || ''"
              placeholder="Enter your username"
              class="w-full px-3 py-1.5 border-2 border-[#5fbfbb] rounded text-sm"
              readonly
            />
          </div>
          
          <div class="form-group mb-3">
            <label class="block mb-1 text-xs text-gray-700">Password:</label>
            <input 
              :value="sessions[activeSession].fields?.password || ''"
              type="text"
              placeholder="Enter your password"
              class="w-full px-3 py-1.5 border-2 border-[#5fbfbb] rounded text-sm"
              readonly
            />
          </div>
          
          <button class="w-full bg-[#5fbfbb] text-white py-1.5 rounded mb-3 text-sm font-semibold hover:bg-[#4fa9a5]">
            Login
          </button>
          
          <p class="text-xs text-gray-600">Forgot your password? <a href="#" class="text-[#5fbfbb] font-semibold">Reset here</a></p>
          <small class="text-xs text-gray-500">Attempts: 0</small>
        </div>
      </div>
      
      <!-- Mouse cursor overlay -->
      <div 
        v-if="(sessions[activeSession].mouseX || 0) > 0 || (sessions[activeSession].mouseY || 0) > 0"
        class="absolute w-3 h-3 bg-red-500 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-50"
        :style="{
          left: ((sessions[activeSession].mouseX || 0) * 6) + 'px',
          top: ((sessions[activeSession].mouseY || 0) * 4.5) + 'px',
          transition: 'left 50ms linear, top 50ms linear'
        }"
      >
        <div class="absolute w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></div>
      </div>
      
      <!-- Activity indicator -->
      <div class="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded-full text-xs animate-pulse z-10">
        🔴 LIVE
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else class="relative bg-[rgba(22,21,21,0.9)] border-2 border-dashed border-[#5fbfbb] rounded-lg mx-auto flex items-center justify-center"
         style="width: 500px; height: 350px;">
      <div class="text-center text-[#5fbfbb]">
        <svg class="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 class="text-base font-medium mb-2">Waiting for visitors...</h3>
        <p class="text-xs text-gray-400">Honeypot Node 1</p>
      </div>
    </div>
  </div>
</template>