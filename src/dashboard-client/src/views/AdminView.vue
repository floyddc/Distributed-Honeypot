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

const deleteUser = async (userId) => {
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return
  }
  
  try {
    const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    
    if (response.ok) {
      await fetchUsers()
    } else {
      const data = await response.json()
      error.value = data.message || 'Failed to delete user'
    }
  } catch (e) { 
    console.error(e)
    error.value = 'Failed to delete user'
  }
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
      <h2 class="text-2xl font-bold text-[#5fbfbb]">Admin Panel</h2>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-300">Loading...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-900 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div v-else>
      <!-- Global Controls -->
      <div class="bg-[rgba(22,21,21,0.9)] p-6 rounded-lg shadow-sm border border-[#5fbfbb] mb-8">
        <h3 class="text-lg font-medium text-[#5fbfbb] mb-4">Global Controls</h3>
        <div class="flex space-x-4 mb-4">
          <button @click="controlAllHoneypots('start')" 
                  :disabled="loading"
                  class="px-4 py-2 bg-[#5fbfbb] text-[rgba(22,21,21,0.9)] rounded hover:bg-[#4fa9a5] disabled:opacity-50 font-semibold">
            Start All
          </button>
          <button @click="controlAllHoneypots('stop')" 
                  :disabled="loading"
                  class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-semibold">
            Stop All
          </button>
        </div>
      </div>

      <!-- Honeypot Management -->
      <div class="bg-[rgba(22,21,21,0.9)] shadow-sm rounded-lg border border-[#5fbfbb] mb-8 overflow-hidden">
          <div class="px-6 py-4 border-b border-[#5fbfbb] bg-[rgba(22,21,21,0.95)] flex justify-between items-center">
              <h3 class="text-lg font-medium text-[#5fbfbb]">Honeypots ({{ honeypots.length }})</h3>
          </div>

          <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-[#5fbfbb]">
                  <thead class="bg-[rgba(22,21,21,0.95)]">
                      <tr>
                          <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Honeypot ID</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Port</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Status</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Last Seen</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Actions</th>
                      </tr>
                  </thead>
                  <tbody class="bg-[rgba(22,21,21,0.9)] divide-y divide-[rgba(95,191,187,0.3)]">
                      <tr v-for="hp in honeypots" :key="hp._id" class="hover:bg-[rgba(95,191,187,0.1)]">
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">{{ hp.honeypotId }}</td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{{ hp.port || 'N/A' }}</td>
                          <td class="px-6 py-4 whitespace-nowrap">
                              <span :class="hp.status === 'online' ? 'bg-[rgba(95,191,187,0.3)] text-[#5fbfbb]' : 'bg-red-900 text-red-200'" 
                                    class="px-2 py-1 rounded-full text-xs font-semibold">
                                  {{ hp.status }}
                              </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {{ hp.lastSeen ? new Date(hp.lastSeen).toLocaleString('it-IT') : 'Never' }}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button @click="controlHoneypot(hp._id, 'start')" 
                                      :disabled="loading"
                                      class="text-[#5fbfbb] hover:text-[#4fa9a5] disabled:opacity-50 font-semibold">
                                Start
                              </button>
                              <button @click="controlHoneypot(hp._id, 'stop')" 
                                      :disabled="loading"
                                      class="text-red-400 hover:text-red-300 disabled:opacity-50 font-semibold">
                                Stop
                              </button>
                          </td>
                      </tr>
                      <tr v-if="honeypots.length === 0">
                          <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-400">No honeypots registered.</td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </div>

      <!-- User Management -->
      <div class="bg-[rgba(22,21,21,0.9)] shadow-sm rounded-lg border border-[#5fbfbb] overflow-hidden">
        <div class="px-6 py-4 border-b border-[#5fbfbb] bg-[rgba(22,21,21,0.95)]">
          <h3 class="text-lg font-medium text-[#5fbfbb]">User Management</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#5fbfbb]">
            <thead class="bg-[rgba(22,21,21,0.95)]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Username</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-[rgba(22,21,21,0.9)] divide-y divide-[rgba(95,191,187,0.3)]">
              <tr v-for="user in users" :key="user._id" class="hover:bg-[rgba(95,191,187,0.1)]">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">{{ user.username }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{{ user.email }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span :class="user.role === 'admin' ? 'bg-[rgba(95,191,187,0.3)] text-[#5fbfbb]' : 'bg-gray-700 text-gray-300'" 
                        class="px-2 py-1 rounded-full text-xs font-semibold">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button v-if="user.role !== 'admin'" @click="promoteUser(user._id)" 
                          class="text-[#5fbfbb] hover:text-[#4fa9a5] font-semibold">
                    to Admin
                  </button>
                  <button v-if="user.role !== 'admin'" @click="deleteUser(user._id)" 
                          class="text-red-400 hover:text-red-300 font-semibold">
                    Delete
                  </button>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="4" class="px-6 py-4 text-center text-sm text-gray-400">No users found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
