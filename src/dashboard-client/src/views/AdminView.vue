<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../layouts/DashboardLayout.vue'

const authStore = useAuthStore()
const users = ref([])
const honeypots = ref([])
const loading = ref(false)
const error = ref('')

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3000/api/admin/users', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (response.ok) users.value = await response.json()
  } catch (e) { 
    console.error(e)
    error.value = 'Failed to load users'
  } finally {
    loading.value = false
  }
}

const fetchHoneypots = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3000/api/honeypots', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (response.ok) {
      honeypots.value = await response.json()
      console.log('Honeypots loaded:', honeypots.value)
    }
  } catch (e) { 
    console.error(e)
    error.value = 'Failed to load honeypots'
  } finally {
    loading.value = false
  }
}

const promoteUser = async (userId) => {
  try {
    const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ role: 'admin' })
    })
    if (response.ok) await fetchUsers()
  } catch (e) { console.error(e) }
}

const controlHoneypot = async (id, action) => {
  loading.value = true
  try {
    const response = await fetch(`http://localhost:3000/api/admin/honeypots/${id}/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ action })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log(result.message)
      
      setTimeout(() => {
        fetchHoneypots()
      }, 2000)
    }
  } catch (e) { 
    console.error(e)
    error.value = `Failed to ${action} honeypot`
  } finally {
    loading.value = false
  }
}

const controlAllHoneypots = async (action) => {
  await controlHoneypot('all', action)
}

onMounted(() => {
  console.log('AdminView mounted')
  fetchUsers()
  fetchHoneypots()
})

onActivated(() => {
  console.log('AdminView activated')
  fetchUsers()
  fetchHoneypots()
})
</script>

<template>
  <DashboardLayout>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Admin Panel</h2>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Loading...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div v-else>
      <!-- Global Controls -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Global Controls</h3>
        <div class="flex space-x-4">
          <button @click="controlAllHoneypots('start')" 
                  :disabled="loading"
                  class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            Start All
          </button>
          <button @click="controlAllHoneypots('stop')" 
                  :disabled="loading"
                  class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
            Stop All
          </button>
        </div>
      </div>

      <!-- Honeypot Management -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-8 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 class="text-lg font-medium text-gray-900">Honeypots ({{ honeypots.length }})</h3>
          </div>

          <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                      <tr>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Honeypot ID</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                      <tr v-for="hp in honeypots" :key="hp._id">
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ hp.honeypotId }}</td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ hp.port || 'N/A' }}</td>
                          <td class="px-6 py-4 whitespace-nowrap">
                              <span :class="hp.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" 
                                    class="px-2 py-1 rounded-full text-xs font-semibold">
                                  {{ hp.status }}
                              </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {{ hp.lastSeen ? new Date(hp.lastSeen).toLocaleString('it-IT') : 'Never' }}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button @click="controlHoneypot(hp._id, 'start')" 
                                      :disabled="loading"
                                      class="text-green-600 hover:text-green-900 disabled:opacity-50">
                                Start
                              </button>
                              <button @click="controlHoneypot(hp._id, 'stop')" 
                                      :disabled="loading"
                                      class="text-red-600 hover:text-red-900 disabled:opacity-50">
                                Stop
                              </button>
                          </td>
                      </tr>
                      <tr v-if="honeypots.length === 0">
                          <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No honeypots registered.</td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </div>

      <!-- User Management -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-medium text-gray-900">User Management</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="user in users" :key="user._id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ user.username }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.email }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span :class="user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'" 
                        class="px-2 py-1 rounded-full text-xs font-semibold">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button v-if="user.role !== 'admin'" 
                          @click="promoteUser(user._id)" 
                          class="text-indigo-600 hover:text-indigo-900">
                    Make Admin
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
