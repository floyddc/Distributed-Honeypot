<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useSocketStore } from '../stores/socket'

const socketStore = useSocketStore()
const sessions = ref({}) 
const activeSessionId = ref(null)
const terminalRefs = ref({}) 

const createSession = async (sessionId) => {
    if (sessions.value[sessionId]) return

    console.log(`Creating new terminal session: ${sessionId}`)
    
    sessions.value[sessionId] = {
        id: sessionId,
        term: null,
        fitAddon: null,
        buffer: ''
    }

    if (!activeSessionId.value) {
        activeSessionId.value = sessionId
    }

    await nextTick()

    const term = new Terminal({
        cursorBlink: true,
        theme: {
            background: '#1e1e1e',
            foreground: '#00ff00'
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    const container = terminalRefs.value[sessionId]
    if (container) {
        term.open(container)
        fitAddon.fit()
    }

    sessions.value[sessionId].term = term
    sessions.value[sessionId].fitAddon = fitAddon
    
    term.write(`--- Session Started: ${sessionId} ---\r\n`)
}

const setupListener = () => {
    if (socketStore.socket) {
        socketStore.socket.off('live_session_feed')
        socketStore.socket.on('live_session_feed', async (payload) => {
            console.log('[DEBUG] LiveTerminal received:', payload)
            
            const sessionId = payload.sessionId || 'default'
            
            if (!sessions.value[sessionId]) {
                await createSession(sessionId)
            }

            const session = sessions.value[sessionId]
            if (session && session.term) {
                session.term.write(payload.data)
            }
        })
    }
}

const switchTab = (sessionId) => {
    activeSessionId.value = sessionId
    nextTick(() => {
        const session = sessions.value[sessionId]
        if (session && session.fitAddon) {
            session.fitAddon.fit()
        }
    })
}

onMounted(() => {
    setupListener()

    watch(() => socketStore.socket, () => {
        setupListener()
    })

    window.addEventListener('resize', () => {
        if (activeSessionId.value && sessions.value[activeSessionId.value]) {
            sessions.value[activeSessionId.value].fitAddon.fit()
        }
    })
})

onUnmounted(() => {
    Object.values(sessions.value).forEach(session => {
        if (session.term) session.term.dispose()
    })
    if (socketStore.socket) {
        socketStore.socket.off('live_session_feed')
    }
})
</script>

<template>
    <div class="flex flex-col w-full h-96 bg-black rounded-lg overflow-hidden border border-gray-700 shadow-lg">
        <!-- Tabs -->
        <div class="flex bg-gray-900 border-b border-gray-700 overflow-x-auto">
            <button 
                v-for="(session, id) in sessions" 
                :key="id"
                @click="switchTab(id)"
                class="px-4 py-2 text-xs font-mono border-r border-gray-700 hover:bg-gray-800 transition-colors"
                :class="activeSessionId === id ? 'bg-gray-800 text-green-400' : 'text-gray-400'"
            >
                {{ id.slice(0, 8) }}...
            </button>
            <div v-if="Object.keys(sessions).length === 0" class="px-4 py-2 text-xs text-gray-500 font-mono">
                Waiting for connections...
            </div>
        </div>

        <!-- Terminal Containers -->
        <div class="relative flex-1 bg-[#1e1e1e] overflow-hidden">
            <div 
                v-for="(session, id) in sessions" 
                :key="id"
                :ref="(el) => { if (el) terminalRefs[id] = el }"
                class="absolute inset-0 w-full h-full"
                :class="{ 'z-10': activeSessionId === id, 'z-0 opacity-0': activeSessionId !== id }"
            ></div>
            
            <!-- Empty State -->
            <div v-if="Object.keys(sessions).length === 0" class="flex items-center justify-center h-full text-gray-500 font-mono text-sm">
                > No active sessions
            </div>
        </div>
    </div>
</template>

<style scoped>
:deep(.xterm-viewport) {
    overflow-y: auto;
}
</style>
