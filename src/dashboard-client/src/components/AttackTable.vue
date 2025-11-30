<script setup>
const props = defineProps({
  attacks: {
    type: Array,
    required: true
  }
})

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getSeverityClass = (severity) => {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800'
    case 'medium': return 'bg-orange-100 text-orange-800'
    case 'low': return 'bg-blue-100 text-blue-800'
    default: return 'bg-green-100 text-green-800'
  }
}
</script>

<template>
  <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <h3 class="text-lg font-medium text-gray-900">
        Recent Attacks
      </h3>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source IP</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Honeypot:Port</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(attack, index) in attacks" :key="index" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(attack.timestamp) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{{ attack.sourceIp }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <span class="font-mono">{{ attack.honeypotId }}:{{ attack.port }}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{{ attack.description || '-' }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getSeverityClass(attack.severity)">
                {{ attack.severity.toUpperCase() }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span v-if="attack.geoData?.city && attack.geoData?.country">
                {{ attack.geoData.city }}, {{ attack.geoData.country }}
              </span>
              <span v-else-if="attack.geoData?.country">
                {{ attack.geoData.country }}
              </span>
              <span v-else class="text-gray-400">Unknown</span>
            </td>
          </tr>
          <tr v-if="attacks.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
              No attacks detected yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
