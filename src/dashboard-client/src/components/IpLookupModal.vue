<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  ip: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const loading = ref(true)
const error = ref(null)
const ipInfo = ref(null)

const fetchIpInfo = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`http://ip-api.com/json/${props.ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query`)
    const data = await response.json()

    if (data.status === 'fail') {
      throw new Error(data.message || 'Failed to fetch IP information')
    }

    ipInfo.value = data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchIpInfo()
})

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-[rgba(22,21,21,0.95)] border border-[#5fbfbb] rounded-lg shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div>
            <h3 class="text-xl font-semibold text-[#5fbfbb]">IP Lookup</h3>
            <p class="text-sm text-gray-400 font-mono">{{ ip }}</p>
          </div>
        </div>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-200">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5fbfbb] mb-4"></div>
        <p class="text-gray-400">Fetching IP information...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/30 border border-red-500 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <h4 class="text-red-400 font-semibold">Error</h4>
        </div>
        <p class="text-red-300 text-sm">{{ error }}</p>
      </div>

      <!-- IP Info -->
      <div v-else-if="ipInfo" class="space-y-4">
        <!-- Location Info -->
        <div class="bg-[rgba(95,191,187,0.1)] border border-[rgba(95,191,187,0.3)] rounded-lg p-4">
          <h4 class="text-[#5fbfbb] font-semibold mb-3 flex items-center gap-2">
            <span>Location</span>
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-gray-400 mb-1">Country</p>
              <p class="text-gray-200 flex items-center gap-2">
                {{ ipInfo.country }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">City</p>
              <p class="text-gray-200">{{ ipInfo.city || 'Unknown' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Region</p>
              <p class="text-gray-200">{{ ipInfo.regionName || 'Unknown' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Timezone</p>
              <p class="text-gray-200">{{ ipInfo.timezone || 'Unknown' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Coordinates</p>
              <p class="text-gray-200 text-xs font-mono">{{ ipInfo.lat }}, {{ ipInfo.lon }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">ZIP Code</p>
              <p class="text-gray-200">{{ ipInfo.zip || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <!-- Network Info -->
        <div class="bg-[rgba(95,191,187,0.1)] border border-[rgba(95,191,187,0.3)] rounded-lg p-4">
          <h4 class="text-[#5fbfbb] font-semibold mb-3 flex items-center gap-2">
            <span>Network</span>
          </h4>
          <div class="space-y-3">
            <div>
              <p class="text-xs text-gray-400 mb-1">ISP</p>
              <p class="text-gray-200">{{ ipInfo.isp || 'Unknown' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Organization</p>
              <p class="text-gray-200">{{ ipInfo.org || 'Unknown' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">AS Number</p>
              <p class="text-gray-200 font-mono text-sm">{{ ipInfo.as || 'Unknown' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">AS Name</p>
              <p class="text-gray-200">{{ ipInfo.asname || 'Unknown' }}</p>
            </div>
            <div v-if="ipInfo.reverse">
              <p class="text-xs text-gray-400 mb-1">Reverse DNS</p>
              <p class="text-gray-200 font-mono text-sm break-all">{{ ipInfo.reverse }}</p>
            </div>
          </div>
        </div>

        <!-- Other Info -->
        <div class="bg-[rgba(95,191,187,0.1)] border border-[rgba(95,191,187,0.3)] rounded-lg p-4">
          <h4 class="text-[#5fbfbb] font-semibold mb-3 flex items-center gap-2">
            <span>Other Info</span>
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <div class="text-center p-2 rounded">
              <p class="text-xs text-gray-400 mb-1">Mobile Connection</p>
              <p class="text-lg">{{ ipInfo.mobile ? '✅' : '❌' }}</p>
            </div>
            <div class="text-center p-2 rounded">
              <p class="text-xs text-gray-400 mb-1">Proxy Connection</p>
              <p class="text-lg">{{ ipInfo.proxy ? '⚠️' : '❌' }}</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <button
            @click="copyToClipboard(ip)"
            class="flex-1 px-4 py-2 bg-[rgba(95,191,187,0.2)] text-[#5fbfbb] hover:bg-[rgba(95,191,187,0.3)] rounded transition-colors text-sm font-medium"
          >
            📋 Copy IP
          </button>
          <a
            :href="`https://ip-api.com/#${ip}`"
            target="_blank"
            class="flex-1 px-4 py-2 bg-[rgba(95,191,187,0.2)] text-[#5fbfbb] hover:bg-[rgba(95,191,187,0.3)] rounded transition-colors text-sm font-medium text-center"
          >
            🔗 ip-api
          </a>
        </div>
      </div>

      <!-- Close Button -->
      <div class="mt-6 flex justify-end">
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
