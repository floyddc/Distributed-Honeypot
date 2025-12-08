<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  const result = await authStore.login(email.value, password.value)
  
  if (result.success) {
    router.push('/')
  } else {
    error.value = result.error
  }
  loading.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[rgba(22,21,21,0.8)] px-4">
    <div class="max-w-md w-full space-y-8 bg-[rgba(22,21,21,0.9)] p-8 rounded-lg shadow-md border border-[#5fbfbb]">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-bold text-[#5fbfbb]">
          Sign in to your account
        </h2>
        <p class="mt-2 text-sm text-gray-300">
          Or
          <router-link to="/register" class="font-medium text-[#5fbfbb] hover:text-[#4fa9a5]">
            register a new account
          </router-link>
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div class="mb-4">
            <label for="email-address" class="block text-sm font-medium text-[#5fbfbb] mb-1">Email address</label>
            <input id="email-address" name="email" type="email" autocomplete="email" required v-model="email"
              class="appearance-none rounded-md relative block w-full px-3 py-2 border border-[#5fbfbb] bg-[rgba(22,21,21,0.5)] placeholder-gray-500 text-gray-100 focus:outline-none focus:ring-[#5fbfbb] focus:border-[#5fbfbb] sm:text-sm"
              placeholder="Email address">
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-[#5fbfbb] mb-1">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required v-model="password"
              class="appearance-none rounded-md relative block w-full px-3 py-2 border border-[#5fbfbb] bg-[rgba(22,21,21,0.5)] placeholder-gray-500 text-gray-100 focus:outline-none focus:ring-[#5fbfbb] focus:border-[#5fbfbb] sm:text-sm"
              placeholder="Password">
          </div>
        </div>

        <div v-if="error" class="text-red-300 text-sm text-center bg-red-900 p-2 rounded border border-red-500">
          {{ error }}
        </div>

        <div>
          <button type="submit" :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-[rgba(22,21,21,0.9)] bg-[#5fbfbb] hover:bg-[#4fa9a5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5fbfbb] disabled:opacity-50 disabled:cursor-not-allowed">
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
