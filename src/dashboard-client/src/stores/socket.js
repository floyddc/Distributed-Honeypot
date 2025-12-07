import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import { ref } from 'vue'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null)
  const attacks = ref([])
  const honeypots = ref([])

  const loadHoneypots = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/honeypots', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        honeypots.value = await response.json()
      }
    } catch (error) {
      console.error('Failed to load honeypots')
    }
  }

  const loadAttacks = async () => {
    try {
      const token = localStorage.getItem('token')
      console.log('Loading attacks with token:', token ? 'present' : 'missing')
      
      const response = await fetch('http://localhost:3000/api/attacks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log('Attack response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded attacks:', data.length)
        attacks.value = data
      } else {
        console.error('Failed to load attacks, status:', response.status)
      }
    } catch (error) {
      console.error('Failed to load attacks:', error)
    }
  }

  const connect = () => {
    socket.value = io('http://localhost:3000')

    socket.value.on('connect', () => {
      console.log('Connected to collector server')
      loadHoneypots()
      loadAttacks()
    })

    socket.value.on('new_attack', (data) => {
      console.log('New attack received:', data)
      attacks.value.unshift(data)

      if (attacks.value.length > 50) {
        attacks.value = attacks.value.slice(0, 50)
      }
    })

    socket.value.on('attacks_cleared', (data) => {
      console.log('Attacks cleared:', data.message)
      attacks.value = [] 
    })

    socket.value.on('honeypot_status_change', (data) => {
      console.log('Honeypot status changed:', data)
      const { honeypotId, status, port } = data

      const index = honeypots.value.findIndex(h => h.honeypotId === honeypotId)
      if (index !== -1) {
        honeypots.value[index].status = status
        if (port) honeypots.value[index].port = port
      } else {
        honeypots.value.push({ honeypotId, status, port })
      }
    })

    socket.value.on('disconnect', () => {
      console.log('Disconnected from collector server')
    })
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
    }
  }

  return {
    socket,
    attacks,
    honeypots,
    connect,
    disconnect
  }
})
