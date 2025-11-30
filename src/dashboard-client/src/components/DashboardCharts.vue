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
  const counts = { low: 0, medium: 0, critical: 0 }
  props.attacks.forEach(a => {
    if (a.severity === 'low' || a.severity === 'unknown' || !a.severity) {
      counts.low++
    } else if (a.severity === 'medium') {
      counts.medium++
    } else if (a.severity === 'critical') {
      counts.critical++
    }
  })
  
  return {
    labels: ['Low/Unknown', 'Medium', 'Critical'],
    datasets: [{
      backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444'],
      borderColor: '#ffffff',
      borderWidth: 2,
      data: [counts.low, counts.medium, counts.critical]
    }]
  }
})

// Compute Attacks by Port
const portData = computed(() => {
  const counts = {}
  props.attacks.forEach(a => {
    const port = a.port || 'Unknown'
    counts[port] = (counts[port] || 0) + 1
  })
  
  const sortedPorts = Object.keys(counts).sort((a, b) => {
    if (a === 'Unknown') return 1
    if (b === 'Unknown') return -1
    return Number(a) - Number(b)
  })
  
  const portColors = {
    '2222': '#8b5cf6', // viola
    '3001': '#3b82f6', // blu
    '3003': '#10b981', // verde
    'Unknown': '#6b7280' // grigio
  }
  
  const backgroundColors = sortedPorts.map(port => portColors[port] || '#a855f7')
  
  return {
    labels: sortedPorts,
    datasets: [{
      label: 'Attacks by Port',
      backgroundColor: backgroundColors,
      data: sortedPorts.map(port => counts[port])
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
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 class="text-gray-500 text-sm font-medium mb-4 uppercase">Threat Severity Distribution</h3>
      <div class="h-64">
        <Doughnut :data="severityData" :options="doughnutOptions" />
      </div>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 class="text-gray-500 text-sm font-medium mb-4 uppercase">Traffic Analysis by Port</h3>
      <div class="h-64">
        <Bar :data="portData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>
