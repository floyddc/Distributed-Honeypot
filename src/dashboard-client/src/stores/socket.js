import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { io } from 'socket.io-client'
import { useToast } from 'vue-toastification'
import ReportToastContent from '../components/ReportToastContent.vue'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null)
  const attacks = ref([])
  const honeypots = ref([])
  const liveSessions = ref({})
  const terminalSessions = ref({})
  const unreadReports = ref(0)
  const reportToastIds = new Set()

  // fallback
  const loadSessionsFromStorage = () => {
    try {
      const savedLiveSessions = localStorage.getItem('liveSessions')
      const savedTerminalSessions = localStorage.getItem('terminalSessions')

      return {
        live: savedLiveSessions ? JSON.parse(savedLiveSessions) : {},
        terminal: savedTerminalSessions ? JSON.parse(savedTerminalSessions) : {}
      }
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error)
      return { live: {}, terminal: {} }
    }
  }

  try {
    const saved = loadSessionsFromStorage()
    liveSessions.value = saved.live || {}
    terminalSessions.value = saved.terminal || {}
    console.log('[SocketStore] Initialized sessions from localStorage:', Object.keys(liveSessions.value).length)
  } catch (e) {
    console.error('[SocketStore] Failed to initialize sessions from localStorage:', e)
  }

  const loadSessionsFromDB = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const sessions = await response.json()
        const saved = loadSessionsFromStorage()
        console.log('[SocketStore] Loaded sessions from DB:', sessions.length)

        const mergedTerminal = {}
        const mergedLive = {}

        sessions.filter(s => s.type === 'ssh').forEach(session => {
          mergedTerminal[session.sessionId] = {
            id: session.sessionId,
            honeypotId: session.honeypotId,
            buffer: (session.buffer != null && session.buffer.length) ? session.buffer : (saved.terminal && saved.terminal[session.sessionId] && saved.terminal[session.sessionId].buffer) || '',
            lastActivity: new Date(session.lastActivity).getTime()
          }
        })

        sessions.filter(s => s.type === 'login').forEach(session => {
          const savedEntry = (saved.live && saved.live[session.sessionId]) || {}
          mergedLive[session.sessionId] = {
            id: session.sessionId,
            honeypotId: session.honeypotId,
            events: session.events || savedEntry.events || [],
            mouseX: session.mouseX || savedEntry.mouseX || 0,
            mouseY: session.mouseY || savedEntry.mouseY || 0,
            fields: session.fields || savedEntry.fields || { username: '', password: '' },
            loggedIn: (savedEntry && savedEntry.loggedIn) || session.loggedIn || false,
            lastActivity: new Date(session.lastActivity).getTime()
          }
        })

        terminalSessions.value = mergedTerminal
        liveSessions.value = mergedLive

        return true
      }
      return false
    } catch (error) {
      console.error('[SocketStore] Failed to load sessions from DB:', error)
      return false
    }
  }

  // fallback
  watch(liveSessions, (newSessions) => {
    try {
      localStorage.setItem('liveSessions', JSON.stringify(newSessions))
    } catch (error) {
      console.error('Failed to save liveSessions to localStorage:', error)
    }
  }, { deep: true })

  watch(terminalSessions, (newSessions) => {
    try {
      localStorage.setItem('terminalSessions', JSON.stringify(newSessions))
    } catch (error) {
      console.error('Failed to save terminalSessions to localStorage:', error)
    }
  }, { deep: true })

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
    if (socket.value) {
      socket.value.removeAllListeners()
      socket.value.disconnect()
    }

    socket.value = io('http://localhost:3000')

    socket.value.on('connect', async () => {
      console.log('Connected to collector server')

      const loadedFromDB = await loadSessionsFromDB()

      if (!loadedFromDB) {
        console.log('[SocketStore] Failed to load from DB, using localStorage as fallback')
        const savedSessions = loadSessionsFromStorage()
        liveSessions.value = savedSessions.live
        terminalSessions.value = savedSessions.terminal
      }

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
        const toast = useToast()
        toast.error(data.message || 'Your account has been deleted by an admin', {
          timeout: 3000
        })
        setTimeout(() => {
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          localStorage.removeItem('liveSessions')
          localStorage.removeItem('terminalSessions')
          window.location.href = '/login'
        }, 3000)
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
            loggedIn: false,
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
        try { delete liveSessions.value[sessionId] } catch (e) {}
        try { delete terminalSessions.value[sessionId] } catch (e) {}
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
          loggedIn: false,
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
        case 'navigation':
          session.currentView = data.view
          if (data.view === 'dashboard') {
            session.loggedIn = true
          }
          break
      }
    })

    try { cleanupSessions() } catch(e) { }

    socket.value.on('live_session_feed', (payload) => {
      console.log('[SocketStore] Received live_session_feed:', payload)
      const sessionId = payload.sessionId || 'default'

      if (!terminalSessions.value[sessionId]) {
        terminalSessions.value[sessionId] = {
          id: sessionId,
          honeypotId: payload.honeypotId,
          buffer: '',
          lastActivity: Date.now()
        }
      }

      const session = terminalSessions.value[sessionId]
      session.buffer += payload.data
      session.lastActivity = Date.now()
    })

    socket.value.on('role_updated', (data) => {
      console.log('Role updated event received:', data)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

      if (currentUser._id === data.userId) {
        currentUser.role = data.newRole
        localStorage.setItem('user', JSON.stringify(currentUser))
        const toast = useToast()
        toast.success(data.message || `You have been promoted to ${data.newRole}`, {
          timeout: 3000
        })
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      }
    })

    socket.value.on('honeypot_fault_report', (data) => {
      console.log('Honeypot fault report received:', data)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

      if (currentUser.role === 'admin') {
        try { unreadReports.value = (unreadReports.value || 0) + 1 } catch (e) { }
        const reportId = `${data.honeypotId}-${data.port}-${data.reportedBy}-${Date.now()}`

        if (reportToastIds.has(reportId)) {
          return
        }
        reportToastIds.add(reportId)

        setTimeout(() => reportToastIds.delete(reportId), 1000)

        const toast = useToast()
        toast.warning({
          component: ReportToastContent,
          props: {
            report: data
          }
        }, {
          timeout: 0,
          closeButton: true
        })
      }
    })

    socket.value.on('disconnect', () => {
      console.log('Disconnected from collector server')
    })
  }

  const INACTIVITY_LIMIT_MS = 120 * 1000 // 120s
  let cleanupInterval = null

  const cleanupSessions = () => {
    try {
      const now = Date.now()
      for (const [id, s] of Object.entries(liveSessions.value)) {
        const last = Number(s.lastActivity) || 0
        if (last > 0 && now - last > INACTIVITY_LIMIT_MS) {
          console.log(`[SocketStore] Removing inactive live session ${id}`)
          delete liveSessions.value[id]
        }
      }
      for (const [id, s] of Object.entries(terminalSessions.value)) {
        const last = Number(s.lastActivity) || 0
        if (last > 0 && now - last > INACTIVITY_LIMIT_MS) {
          console.log(`[SocketStore] Removing inactive terminal session ${id}`)
          delete terminalSessions.value[id]
        }
      }
    } catch (e) {
      console.error('[SocketStore] cleanupSessions error', e)
    }
  }

  cleanupInterval = setInterval(cleanupSessions, 30 * 1000)

  const disconnect = () => {
    if (socket.value) {
      socket.value.removeAllListeners()
      socket.value.disconnect()
      socket.value = null
    }
    reportToastIds.clear()
    try { if (cleanupInterval) { clearInterval(cleanupInterval); cleanupInterval = null } } catch(e){}
  }

  const markReportsRead = () => {
    try { unreadReports.value = 0 } catch (e) { }
  }

  const clearAllSessions = () => {
    liveSessions.value = {}
    terminalSessions.value = {}
    localStorage.removeItem('liveSessions')
    localStorage.removeItem('terminalSessions')
    console.log('[SocketStore] All sessions cleared')
  }

  return {
    socket,
    attacks,
    honeypots,
    liveSessions,
    terminalSessions,
    unreadReports,
    connect,
    disconnect,
    clearAllSessions,
    markReportsRead
  }
})
