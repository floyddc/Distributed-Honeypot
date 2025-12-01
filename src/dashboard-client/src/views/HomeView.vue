<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import AttackTable from '../components/AttackTable.vue'
import DashboardCharts from '../components/DashboardCharts.vue'
import { useSocketStore } from '../stores/socket'

const socketStore = useSocketStore()

const activeHoneypots = computed(() => {
  return socketStore.honeypots.filter(h => h.status === 'online').length
})

const totalHoneypots = computed(() => {
  return socketStore.honeypots.length
})

onMounted(() => {
  socketStore.connect()
})

onUnmounted(() => {
  socketStore.disconnect()
})
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
          <h3 class="text-gray-500 text-sm font-medium uppercase">Total Attacks</h3>
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

        <!-- System Status -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 class="text-gray-500 text-sm font-medium uppercase">System Status</h3>
          <div class="mt-2">
            <p :class="activeHoneypots > 0 ? 'text-green-600' : 'text-red-600'" 
               class="text-3xl font-bold">
              {{ activeHoneypots > 0 ? 'OK' : 'OFFLINE' }}
            </p>
            <p class="text-sm text-gray-500 mt-1">
              {{ activeHoneypots > 0 ? 'Monitoring active' : 'No honeypots online' }}
            </p>
          </div>
        </div>

      </div>
    </div>

    <DashboardCharts :attacks="socketStore.attacks" />

    <div class="grid grid-cols-1 gap-6 mt-8">
      <AttackTable :attacks="socketStore.attacks" />
    </div>
  </DashboardLayout>
</template>
