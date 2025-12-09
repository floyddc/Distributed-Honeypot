import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import { ref } from 'vue'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null)
  const attacks = ref([])
  const honeypots = ref([])
  const liveSessions = ref({}) 

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

    socket.value.on('user_deleted', (data) => {
      console.log('User deleted event received:', data)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      
      if (currentUser._id === data.userId) {
        alert(data.message || 'Your account has been deleted by an admin')
         setTimeout(() => {
            localStorage.removeItem('user')
            localStorage.removeItem('token')
            window.location.href = '/login'
          }, 3000) // 3s
      }
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

    socket.value.on('active_sessions', (activeSessions) => {
      console.log('[SocketStore] Received active sessions:', activeSessions.length)
      
      activeSessions.forEach(session => {
        if (!liveSessions.value[session.sessionId]) {
          liveSessions.value[session.sessionId] = {
            id: session.sessionId,
            honeypotId: session.honeypotId,
            events: [],
            mouseX: 0,
            mouseY: 0,
            fields: { username: '', password: '' },
            lastActivity: session.lastActivity
          }
        }
      })
    })

    socket.value.on('live_interaction', (data) => {
      console.log('[SocketStore] Received live_interaction:', data)
      const { sessionId } = data
      
      if (data.type === 'session_end') {
        console.log('[SocketStore] Session ended:', sessionId)
        delete liveSessions.value[sessionId]
        return
      }
      
      if (!liveSessions.value[sessionId]) {
        liveSessions.value[sessionId] = {
          id: sessionId,
          honeypotId: data.honeypotId,
          events: [],
          mouseX: 0,
          mouseY: 0,
          fields: { username: '', password: '' },
          lastActivity: Date.now()
        }
      }
      
      const session = liveSessions.value[sessionId]
      session.events.push(data)
      session.lastActivity = Date.now()
      
      switch (data.type) {
        case 'mousemove':
          session.mouseX = data.x
          session.mouseY = data.y
          break
        case 'input':
          session.fields[data.field] = data.value
          break
        case 'submit':
          console.log(`User submitted form in session ${sessionId}`)
          break
      }
    })

    socket.value.on('role_updated', (data) => {
      console.log('Role updated event received:', data)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      
      if (currentUser._id === data.userId) {
        currentUser.role = data.newRole
        localStorage.setItem('user', JSON.stringify(currentUser))
        alert(data.message || `You have been promoted to ${data.newRole}`)
        setTimeout(() => {
          window.location.reload()
        }, 3000) // 3s
      }
    })

    socket.value.on('honeypot_fault_report', (data) => {
      console.log('Honeypot fault report received:', data)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      
      if (currentUser.role === 'admin') {
        alert(`FAULT REPORT\n\nHoneypot: ${data.honeypotId}:${data.port}\nReported by: ${data.reportedBy}\n\n${data.message}`)
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

  const cleanupInactiveSessions = () => {
    const timeout = 30000
    const now = Date.now()
    
    for (const [sessionId, session] of Object.entries(liveSessions.value)) {
      if (now - session.lastActivity > timeout) {
        console.log('[SocketStore] Removing inactive session:', sessionId)
        delete liveSessions.value[sessionId]
      }
    }
  }

  setInterval(cleanupInactiveSessions, 10000)

  return {
    socket,
    attacks,
    honeypots,
    liveSessions,
    connect,
    disconnect
  }
})
