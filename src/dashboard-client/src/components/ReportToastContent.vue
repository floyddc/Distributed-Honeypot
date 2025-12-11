<script setup>
const props = defineProps({
  report: Object
})
</script>

<template>
  <div class="space-y-2">
    <div class="font-semibold text-orange-400">
      Honeypot Fault Report
    </div>
    
    <div class="text-sm space-y-1">
      <div>
        <span class="text-gray-400">Honeypot:</span>
        <span class="font-mono text-[#5fbfbb] ml-2">{{ report.honeypotId }}:{{ report.port }}</span>
      </div>
      <div>
        <span class="text-gray-400">Reported by:</span>
        <span class="text-gray-200 ml-2">{{ report.reportedBy }}</span>
      </div>
    </div>
    
    <div class="mt-3 p-3 bg-black/40 rounded border border-orange-700/30">
      <div class="text-xs text-orange-400 font-semibold mb-1">Message:</div>
      <div class="text-sm text-gray-200">{{ report.message }}</div>
    </div>
  </div>
</template>