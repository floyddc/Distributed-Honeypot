<script setup>
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const props = defineProps({
  location: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const mapContainer = ref(null)
const isMapReady = ref(false)
let map = null
let marker = null

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const initMap = async () => {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (!mapContainer.value || !props.location) {
    console.error('Map container or location not available')
    return
  }

  const { lat, lon } = props.location
  
  console.log('Initializing map with coords:', lat, lon)

  try {
    if (map) {
      map.remove()
    }

    map = L.map(mapContainer.value, {
      center: [lat, lon],
      zoom: 10,
      zoomControl: true,
      attributionControl: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    marker = L.marker([lat, lon]).addTo(map)
      .bindPopup(`
        <div style="text-align: center; padding: 5px;">
          <strong>${props.location.sourceIp}</strong><br>
          ${props.location.city}, ${props.location.country}
        </div>
      `)
      .openPopup()

    setTimeout(() => {
      if (map) {
        map.invalidateSize()
        console.log('Map invalidated and ready')
        isMapReady.value = true
      }
    }, 250)
    
  } catch (error) {
    console.error('Error initializing map:', error)
  }
}

onMounted(() => {
  console.log('LocationMapModal mounted with location:', props.location)
  initMap()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

watch(() => props.location, (newLocation) => {
  if (map && marker && newLocation) {
    const { lat, lon } = newLocation
    map.setView([lat, lon], 10)
    marker.setLatLng([lat, lon])
      .bindPopup(`
        <div style="text-align: center; padding: 5px;">
          <strong>${newLocation.sourceIp}</strong><br>
          ${newLocation.city}, ${newLocation.country}
        </div>
      `)
      .openPopup()
  }
}, { deep: true })

const handleClose = () => {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
  emit('close')
}

const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <div 
      class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto"
      @click="handleBackdropClick"
    >
      <div 
        class="bg-[rgba(22,21,21,0.98)] border-2 border-[#5fbfbb] rounded-lg shadow-2xl w-full max-w-3xl my-auto"
        style="max-height: 90vh;"
        @click.stop
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b border-[#5fbfbb] flex justify-between items-center bg-[rgba(22,21,21,1)] flex-shrink-0">
          <div>
            <h3 class="text-xl font-semibold text-[#5fbfbb]">Attack Location</h3>
            <p class="text-sm text-gray-400 mt-1">
              {{ location.city }}, {{ location.country }} - {{ location.sourceIp }}
            </p>
          </div>
          <button
            @click="handleClose"
            class="text-gray-400 hover:text-[#5fbfbb] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5fbfbb] rounded p-1"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Map Container -->
        <div class="p-4 bg-[rgba(22,21,21,0.98)] flex-shrink-0">
          <div 
            ref="mapContainer" 
            class="map-container w-full rounded-lg border border-[rgba(95,191,187,0.3)] overflow-hidden"
            style="height: 450px;"
          >
            <div v-if="!isMapReady" class="flex items-center justify-center h-full text-[#5fbfbb] bg-[rgba(22,21,21,0.95)]">
              <div class="text-center">
                <div class="animate-pulse mb-2">Loading map...</div>
                <div class="text-sm text-gray-400">{{ location.lat }}, {{ location.lon }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-[#5fbfbb] bg-[rgba(22,21,21,1)] flex justify-end flex-shrink-0">
          <button
            @click="handleClose"
            class="px-4 py-2 bg-[#5fbfbb] text-black font-medium rounded hover:bg-[#7fd9d5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5fbfbb] focus:ring-offset-2 focus:ring-offset-[rgba(22,21,21,1)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.map-container {
  position: relative;
  background-color: #161515;
}

:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  border-radius: 0.5rem;
}

:deep(.leaflet-tile) {
  filter: none;
}

:deep(.leaflet-control-attribution) {
  background-color: rgba(255, 255, 255, 0.8) !important;
  font-size: 10px;
}
</style>