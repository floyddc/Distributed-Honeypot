<script setup>
import { useAuthStore } from '../stores/auth'

defineProps({
  show: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])
const authStore = useAuthStore()
</script>

<template>
    <div 
      v-if="show" 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      @click="emit('close')"
    >
      <div 
        class="bg-[#1a1a2e] border border-[#5fbfbb] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        @click.stop
      >
        <!-- Header -->
        <div class="sticky top-0 bg-[#1a1a2e] border-b border-[#5fbfbb] p-4 flex justify-between items-center">
          <h2 class="text-2xl font-bold text-[#5fbfbb]">
            Help
          </h2>
          <button 
            @click="emit('close')"
            class="text-gray-400 hover:text-white transition-colors"
            aria-label="Chiudi"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 text-gray-300 space-y-6">
          <!-- Severity Section -->
          <section>
            <h3 class="text-xl font-semibold text-[#5fbfbb] mb-3">
              Severity Levels
            </h3>
            <div class="space-y-2">
              <div class="flex items-center space-x-3">
                <span class="px-3 py-1 rounded-full bg-red-900 text-red-200 text-sm font-medium">CRITICAL</span>
              </div>
              <div class="flex items-center space-x-3">
                <span class="px-3 py-1 rounded-full bg-orange-900 text-orange-200 text-sm font-medium">MEDIUM</span>
              </div>
              <div class="flex items-center space-x-3">
                <span class="px-3 py-1 rounded-full bg-[rgba(95,191,187,0.3)] text-[#5fbfbb] text-sm font-medium">LOW / UNKNOWN</span>
              </div>

            </div>
          </section>

          <!-- Honeypot Section-->
          <section>
            <h3 class="text-xl font-semibold text-[#5fbfbb] mb-3">
              Honeypots
            </h3>
            <div class="space-y-2 text-sm">
              <p><strong class="text-white">Node 1:</strong> Login Honeypot - localhost:3001 (<code class="font-mono bg-gray-800 px-2 py-1 rounded text-[#5fbfbb]">admin / password123</code> to login)</p>
              <p><strong class="text-white">Node 2:</strong> SSH Honeypot - localhost:2222 (
                <code class="font-mono bg-gray-800 px-2 py-1 rounded text-[#5fbfbb]">ssh -p 2222 root@localhost / 123456</code> to login)
              </p>
              <p><strong class="text-white">Node 3:</strong> File Uploader Honeypot - localhost:3003</p>
            </div>
          </section>

          <!-- Dashboard Features Section -->
          <section>
            <h3 class="text-xl font-semibold text-[#5fbfbb] mb-3">
              Dashboard Features
            </h3>
            <div class="space-y-3 text-sm">
              <div class="bg-[rgba(95,191,187,0.1)] p-3 rounded">
                <strong class="text-[#5fbfbb]">Attack Table:</strong>
                <p>Check in real time 💾 which attacks are captured.</p>
              </div>
              <div class="bg-[rgba(95,191,187,0.1)] p-3 rounded">
                <strong class="text-[#5fbfbb]">Statistics and Charts:</strong>
                <p>Check charts 📊 to easily analyze attacks.</p>
              </div>
              <div class="bg-[rgba(95,191,187,0.1)] p-3 rounded">
                <strong class="text-[#5fbfbb]">Live Login & SSH Honeypots:</strong>
                <p>Monitor in real time 🖥️ how an attacker is interacting with Honeypot Node 1-3.</p>
              </div>
              <div class="bg-[rgba(95,191,187,0.1)] p-3 rounded">
                <strong class="text-[#5fbfbb]">IP Lookup:</strong>
                <p>Click on 🔍 button to check info about a captured IP address.</p>
              </div>
              <div class="bg-[rgba(95,191,187,0.1)] p-3 rounded">
                <strong class="text-[#5fbfbb]">Report:</strong>
                <p>Click on 🚩 button to report a faulty Honeypot node (only for non-admin users).</p>
              </div>
              <div class="bg-[rgba(95,191,187,0.1)] p-3 rounded">
                <strong class="text-[#5fbfbb]">Geolocation:</strong>
                <p>Click on 📍 button to check the attacker geolocation.</p>
              </div>
            </div>
          </section>

          <!-- Admin Only Section -->
          <section v-if="authStore.user?.role === 'admin'" class="border-t-2 border-[#5fbfbb] pt-6">
            <div class="bg-gradient-to-r from-[rgba(95,191,187,0.2)] to-transparent p-4 rounded-lg mb-4">
              <h3 class="text-xl font-semibold text-[#5fbfbb] mb-2 flex items-center">
                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Admin Section
              </h3>
            </div>

            <div class="space-y-3 text-sm">
              <div class="bg-[rgba(95,191,187,0.1)] p-3 rounded border-l-4 border-yellow-500">
                <strong class="text-yellow-400">Admin Panel:</strong>
                <p>Here admin can manage users 👥 and Honeypot nodes 🔧.</p>
              </div>
              <div class="bg-[rgba(95,191,187,0.1)] p-3 rounded border-l-4 border-yellow-500">
                <strong class="text-yellow-400">Reports Panel:</strong>
                <p>Here admin can read reports 📬 about faulty Honeypot nodes.</p>
              </div>
            </div>
          </section>
        </div>

        <!-- Footer -->
        <div class="sticky bottom-0 bg-[#1a1a2e] border-t border-[#5fbfbb] p-4 flex justify-end">
          <button
            @click="emit('close')"
            class="px-4 py-2 bg-[#5fbfbb] text-black font-medium rounded hover:bg-[#7fd9d5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5fbfbb] focus:ring-offset-2 focus:ring-offset-[rgba(22,21,21,1)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
</template>