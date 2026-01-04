<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['close'])
const authStore = useAuthStore()
const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)

const handleSubmit = async () => {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    toast.warning('All fields are required')
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    toast.error('New passwords do not match')
    return
  }

  isLoading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      })
    })

    const data = await response.json()

    if (response.ok) {
      toast.success('Password changed successfully')
      emit('close')
    } else {
      toast.error(data.message || 'Failed to change password')
    }
  } catch (error) {
    toast.error('Failed to change password')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-[rgba(22,21,21,0.95)] border border-[#5fbfbb] rounded-lg shadow-xl w-full max-w-md p-6 mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold text-[#5fbfbb]">Change Password</h3>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-200">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="currentPassword" class="block text-sm font-medium text-gray-300 mb-1">
            Current Password
          </label>
          <input
            v-model="currentPassword"
            type="password"
            id="currentPassword"
            class="w-full px-3 py-2 bg-[rgba(22,21,21,0.8)] border border-[#5fbfbb] rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5fbfbb]"
            required
          />
        </div>

        <div>
          <label for="newPassword" class="block text-sm font-medium text-gray-300 mb-1">
            New Password
          </label>
          <input
            v-model="newPassword"
            type="password"
            id="newPassword"
            class="w-full px-3 py-2 bg-[rgba(22,21,21,0.8)] border border-[#5fbfbb] rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5fbfbb]"
            required
          />
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-1">
            Confirm New Password
          </label>
          <input
            v-model="confirmPassword"
            type="password"
            id="confirmPassword"
            class="w-full px-3 py-2 bg-[rgba(22,21,21,0.8)] border border-[#5fbfbb] rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5fbfbb]"
            required
          />
        </div>

        <div class="flex gap-3 mt-6">
          <button
            type="submit"
            :disabled="isLoading"
            class="flex-1 px-4 py-2 bg-[#5fbfbb] text-[rgba(22,21,21,0.9)] rounded-md hover:bg-[#7fd9d5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Changing...' : 'Change Password' }}
          </button>
          <button
            type="button"
            @click="emit('close')"
            class="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
