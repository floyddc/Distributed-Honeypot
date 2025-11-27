<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../layouts/DashboardLayout.vue'

const authStore = useAuthStore()
const users = ref([])
const honeypots = ref([])
const loading = ref(false)
const error = ref('')

// Form data for new honeypot
const newHoneypot = ref({
  name: '',
  ipAddress: '',
  location: ''
})

const fetchUsers = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/users', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (response.ok) users.value = await response.json()
  } catch (e) { console.error(e) }
}

const fetchHoneypots = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/honeypots', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (response.ok) honeypots.value = await response.json()
  } catch (e) { console.error(e) }
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

const addHoneypot = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/honeypots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(newHoneypot.value)
    })
    if (response.ok) {
      await fetchHoneypots()
      newHoneypot.value = { name: '', ipAddress: '', location: '' } // Reset form
    }
  } catch (e) { console.error(e) }
}

const deleteHoneypot = async (id) => {
  if (!confirm('Are you sure?')) return
  try {
    const response = await fetch(`http://localhost:3000/api/admin/honeypots/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (response.ok) await fetchHoneypots()
  } catch (e) { console.error(e) }
}

const toggleHoneypot = async (id, action) => {
  try {
    await fetch(`http://localhost:3000/api/admin/honeypots/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ status: action })
    })
    // Optimistic update or refresh
    await fetchHoneypots()
  } catch (e) { console.error(e) }
}

const toggleAllHoneypots = async (action) => {
    await toggleHoneypot('all', action)
}

onMounted(() => {
  fetchUsers()
  fetchHoneypots()
})
</script>

<template>
  <DashboardLayout>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Admin Panel</h2>
    </div>

    <!-- Global Controls -->
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Global Controls</h3>
      <div class="flex space-x-4">
        <button @click="toggleAllHoneypots('start')" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Start All
        </button>
        <button @click="toggleAllHoneypots('stop')" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Stop All
        </button>
      </div>
    </div>

    <!-- Honeypot Management -->
    <div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-8 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-900">Honeypots</h3>
        </div>
        
        <!-- Add New Form -->
        <div class="p-6 border-b border-gray-200 bg-gray-50">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Register New Honeypot</h4>
            <div class="flex gap-4">
                <input v-model="newHoneypot.name" placeholder="Name" class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                <input v-model="newHoneypot.ipAddress" placeholder="IP Address" class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                <input v-model="newHoneypot.location" placeholder="Location" class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                <button @click="addHoneypot" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">Add</button>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="hp in honeypots" :key="hp._id">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ hp.name }}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ hp.ipAddress }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span :class="hp.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="px-2 py-1 rounded-full text-xs font-semibold">
                                {{ hp.status }}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button @click="toggleHoneypot(hp._id, 'start')" class="text-green-600 hover:text-green-900">Start</button>
                            <button @click="toggleHoneypot(hp._id, 'stop')" class="text-yellow-600 hover:text-yellow-900">Stop</button>
                            <button @click="deleteHoneypot(hp._id)" class="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                    </tr>
                    <tr v-if="honeypots.length === 0">
                        <td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">No honeypots registered.</td>
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
                <span :class="user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'" class="px-2 py-1 rounded-full text-xs font-semibold">
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button v-if="user.role !== 'admin'" @click="promoteUser(user._id)" class="text-indigo-600 hover:text-indigo-900">
                  Make Admin
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </DashboardLayout>
</template>
