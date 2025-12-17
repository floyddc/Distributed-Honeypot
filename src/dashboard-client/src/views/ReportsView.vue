<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { useSocketStore } from '../stores/socket'

const authStore = useAuthStore()
const toast = useToast()
const reports = ref([])
const loading = ref(false)
const clearing = ref(false)
const error = ref(null)

const fetchReports = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await fetch('http://localhost:3000/api/admin/reports', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (!res.ok) throw new Error(await res.text())
    reports.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load reports'
  } finally {
    loading.value = false
  }
}

const clearAllReports = async () => {
  if (!confirm('Clear all reports? This cannot be undone.')) return
  clearing.value = true
  try {
    const res = await fetch('http://localhost:3000/api/admin/reports', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    toast.success(data.message || 'Reports cleared')
    reports.value = []
  } catch (e) {
    console.error('Failed clearing reports:', e)
    toast.error('Failed to clear reports')
  } finally {
    clearing.value = false
  }
}

onMounted(fetchReports)
onMounted(() => {
  try { socketStore.unreadReports = 0 } catch (e) {}
})

const socketStore = useSocketStore()

const handleNewReport = (data) => {
  const normalized = {
    honeypotId: data.honeypotId || '',
    port: data.port || data.port || 0,
    reporterUsername: data.reporterUsername || data.reportedBy || null,
    message: data.message || '',
    createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
    _id: data._id || data.reportId || `${data.honeypotId || 'r'}-${data.port || 0}-${Date.now()}`
  }

  reports.value.unshift(normalized)
  if (reports.value.length > 200) reports.value = reports.value.slice(0, 200)
}

if (socketStore.socket && socketStore.socket.value) {
  socketStore.socket.value.on('honeypot_fault_report', handleNewReport)
}

const stopWatch = watch(() => socketStore.socket && socketStore.socket.value, (s, _old) => {
  if (s) {
    s.on('honeypot_fault_report', handleNewReport)
  }
})

onUnmounted(() => {
  try {
    const s = socketStore.socket && socketStore.socket.value
    if (s) s.off('honeypot_fault_report', handleNewReport)
    stopWatch()
  } catch (e) {}
})
</script>

<template>
  <DashboardLayout>
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-[#5fbfbb]">Reports</h2>
        <button
          v-if="authStore.user?.role === 'admin'"
          @click="clearAllReports"
          :disabled="clearing"
          class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-60"
        >
          {{ clearing ? 'Clearing...' : 'CLEAR' }}
        </button>
      </div>

      <div v-if="loading" class="text-gray-300">Loading...</div>
      <div v-if="error" class="text-red-400">{{ error }}</div>

      <div v-if="!loading && reports.length === 0" class="text-gray-400">No reports found.</div>

      <ul v-if="!loading && reports.length" class="space-y-3">
        <li v-for="r in reports" :key="r._id" class="p-3 border rounded bg-[rgba(22,21,21,0.95)] border-[rgba(95,191,187,0.15)]">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm text-gray-300 font-mono">{{ r.honeypotId }}:{{ r.port }}</div>
              <div class="text-sm text-gray-400">By: {{ r.reporterUsername || 'unknown' }} — {{ new Date(r.createdAt).toLocaleString() }}</div>
            </div>
            <div class="text-sm text-gray-400">{{ r._id }}</div>
          </div>
          <p class="mt-2 text-gray-200">{{ r.message }}</p>
        </li>
      </ul>
    </div>
  </DashboardLayout>
</template>