<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'

const props = defineProps({
  attack: {
    type: Object,
    default: null
  },
  honeypotId: {
    type: String,
    default: ''
  },
  port: {
    type: [String, Number],
    default: ''
  }
})

const emit = defineEmits(['close'])
const toast = useToast()
const authStore = useAuthStore()

const targetId = props.attack?.honeypotId || props.honeypotId
const targetPort = props.attack?.port || props.port

// Prepopulate the comment
const generateInitialComment = () => {
  if (props.attack) {
    return `Reporting suspicious activity:
- Time: ${new Date(props.attack.timestamp).toLocaleString()}
- Source IP: ${props.attack.sourceIp}
- Severity: ${props.attack.severity || 'Unknown'}
- Note: ${props.attack.description || 'No description'}

User Comment:
`
  } else {
    return `Reporting issue for Honeypot Node:
- Node ID: ${targetId}
- Port: ${targetPort}

Description of the issue:
`
  }
}

const comment = ref(generateInitialComment())
const isSubmitting = ref(false)

const handleSubmit = async () => {
  if (!comment.value.trim()) {
    toast.warning('Please add a comment describing the issue')
    return
  }

  isSubmitting.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/report-fault', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        honeypotId: targetId,
        port: targetPort,
        message: comment.value
      })
    })

    if (response.ok) {
      toast.success('Report sent to admins')
      emit('close')
    } else {
      const data = await response.json()
      toast.error(data.message || 'Failed to send report')
    }
  } catch (error) {
    console.error('Error reporting fault:', error)
    toast.error('Network error. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-[rgba(22,21,21,0.95)] border border-[#5fbfbb] rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold text-[#5fbfbb]">
          Report Honeypot Issue
        </h3>
        <button
          @click="emit('close')"
          class="text-gray-400 hover:text-gray-200 focus:outline-none transition-colors"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Info -->
      <div class="mb-4 p-3 bg-[rgba(95,191,187,0.1)] rounded border border-[rgba(95,191,187,0.3)]">
        <p class="text-sm text-gray-300">
          <span class="font-semibold text-[#5fbfbb]">Honeypot:</span> 
          <span class="font-mono">{{ targetId }}:{{ targetPort }}</span>
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="comment" class="block text-sm font-medium text-gray-300 mb-2">
            Describe the issue <span class="text-red-400">*</span>
          </label>
          <textarea
            id="comment"
            v-model="comment"
            rows="4"
            class="w-full px-3 py-2 bg-[rgba(22,21,21,0.9)] border border-[rgba(95,191,187,0.5)] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5fbfbb] focus:border-transparent resize-none"
            placeholder="Describe the problem..."
            :disabled="isSubmitting"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white border border-gray-600 rounded-md hover:bg-[rgba(95,191,187,0.1)] focus:outline-none focus:ring-2 focus:ring-[#5fbfbb] transition-colors"
            :disabled="isSubmitting"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-[#161515] bg-[#5fbfbb] rounded-md hover:bg-[#4fa9a5] focus:outline-none focus:ring-2 focus:ring-[#5fbfbb] focus:ring-offset-2 focus:ring-offset-[#161515] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Sending...' : 'Send Report' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>