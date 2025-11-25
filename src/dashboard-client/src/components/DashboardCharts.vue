<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const props = defineProps({
  attacks: {
    type: Array,
    required: true
  }
})

// Compute Attacks by Severity
const severityData = computed(() => {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 }
  props.attacks.forEach(a => {
    if (counts[a.severity] !== undefined) counts[a.severity]++
  })
  
  return {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [{
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
      borderColor: '#ffffff',
      borderWidth: 2,
      data: [counts.low, counts.medium, counts.high, counts.critical]
    }]
  }
})

// Compute Attacks by Protocol
const protocolData = computed(() => {
  const counts = {}
  props.attacks.forEach(a => {
    counts[a.protocol] = (counts[a.protocol] || 0) + 1
  })
  
  return {
    labels: Object.keys(counts),
    datasets: [{
      label: 'Attacks by Protocol',
      backgroundColor: '#8b5cf6',
      data: Object.values(counts)
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#374151' }
    }
  },
  scales: {
    y: {
      ticks: { color: '#374151' },
      grid: { color: '#e5e7eb' }
    },
    x: {
      ticks: { color: '#374151' },
      grid: { color: '#e5e7eb' }
    }
  }
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#374151' }
    }
  },
  cutout: '70%'
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <!-- Severity Chart -->
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 class="text-gray-500 text-sm font-medium mb-4 uppercase">Threat Severity Distribution</h3>
      <div class="h-64">
        <Doughnut :data="severityData" :options="doughnutOptions" />
      </div>
    </div>

    <!-- Protocol Chart -->
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 class="text-gray-500 text-sm font-medium mb-4 uppercase">Protocol Traffic Analysis</h3>
      <div class="h-64">
        <Bar :data="protocolData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>
