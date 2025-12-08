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
    case 'critical': return 'bg-red-900 text-red-200'
    case 'medium': return 'bg-orange-900 text-orange-200'
    case 'low': return 'bg-[rgba(95,191,187,0.3)] text-[#5fbfbb]'
    default: return 'bg-[rgba(95,191,187,0.3)] text-[#5fbfbb]'
  }
}
</script>

<template>
  <div class="bg-[rgba(22,21,21,0.9)] shadow-sm rounded-lg border border-[#5fbfbb] overflow-hidden">
    <div class="px-6 py-4 border-b border-[#5fbfbb] bg-[rgba(22,21,21,0.95)]">
      <h3 class="text-lg font-medium text-[#5fbfbb]">
        Recent Attacks
      </h3>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-[#5fbfbb]">
        <thead class="bg-[rgba(22,21,21,0.95)]">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Time</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Source IP</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Honeypot:Port</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Description</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Severity</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-[#5fbfbb] uppercase tracking-wider">Location</th>
          </tr>
        </thead>
        <tbody class="bg-[rgba(22,21,21,0.9)] divide-y divide-[rgba(95,191,187,0.3)]">
          <tr v-for="(attack, index) in attacks" :key="index" class="hover:bg-[rgba(95,191,187,0.1)]">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{{ formatDate(attack.timestamp) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-[#5fbfbb] font-mono">{{ attack.sourceIp }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
              <span class="font-mono">{{ attack.honeypotId }}:{{ attack.port }}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">{{ attack.description || '-' }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getSeverityClass(attack.severity)">
                {{ attack.severity.toUpperCase() }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              <span v-if="attack.geoData?.city && attack.geoData?.country">
                {{ attack.geoData.city }}, {{ attack.geoData.country }}
              </span>
              <span v-else-if="attack.geoData?.country">
                {{ attack.geoData.country }}
              </span>
              <span v-else class="text-gray-500">Unknown</span>
            </td>
          </tr>
          <tr v-if="attacks.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400">
              No attacks detected yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
