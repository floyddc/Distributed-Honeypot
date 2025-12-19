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
      backgroundColor: ['#5fbfbb', '#f59e0b', '#ef4444'],
      borderColor: '#5fbfbb',
      borderWidth: 2,
      data: [counts.low, counts.medium, counts.critical]
    }]
  }
})

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
    '2222': '#5fbfbb',
    '3001': '#5fbfbb',
    '3003': '#5fbfbb',
    'Unknown': '#6b7280'
  }
  
  const backgroundColors = sortedPorts.map(port => portColors[port] || '#5fbfbb')
  
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
      labels: { color: '#5fbfbb' }
    }
  },
  scales: {
    y: {
      ticks: { color: '#5fbfbb' },
      grid: { color: 'rgba(95,191,187,0.2)' }
    },
    x: {
      ticks: { color: '#5fbfbb' },
      grid: { color: 'rgba(95,191,187,0.2)' }
    }
  }
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#5fbfbb' }
    }
  },
  cutout: '70%'
}
const ipData = computed(() => {
  const counts = {}
  props.attacks.forEach(a => {
    const ip = a.sourceIp || 'Unknown'
    counts[ip] = (counts[ip] || 0) + 1
  })
  
  //Sort by count descending and take top 5
  const sortedIps = Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 5)

  //Function to generate deterministic color from IP string
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }
  
  const ipColors = sortedIps.map(ip => stringToColor(ip));

  return {
    labels: sortedIps,
    datasets: [{
      label: 'Attacks by IP',
      backgroundColor: ipColors,
      borderColor: ipColors,
      borderWidth: 1,
      data: sortedIps.map(ip => counts[ip])
    }]
  }
})
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
    <div class="bg-[rgba(22,21,21,0.9)] p-6 rounded-lg shadow-sm border border-[#5fbfbb]">
      <h3 class="text-[#5fbfbb] text-sm font-medium mb-4 uppercase">Threat Severity</h3>
      <div class="h-64">
        <Doughnut :data="severityData" :options="doughnutOptions" />
      </div>
    </div>

    <div class="bg-[rgba(22,21,21,0.9)] p-6 rounded-lg shadow-sm border border-[#5fbfbb]">
      <h3 class="text-[#5fbfbb] text-sm font-medium mb-4 uppercase">Traffic by Port</h3>
      <div class="h-64">
        <Bar :data="portData" :options="chartOptions" />
      </div>
    </div>

    <div class="bg-[rgba(22,21,21,0.9)] p-6 rounded-lg shadow-sm border border-[#5fbfbb] lg:col-span-1 md:col-span-2">
      <h3 class="text-[#5fbfbb] text-sm font-medium mb-4 uppercase">Top Attackers (IP)</h3>
      <div class="h-64">
        <Bar :data="ipData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>
