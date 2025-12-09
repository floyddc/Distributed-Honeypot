<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useSocketStore } from '../stores/socket'

const socketStore = useSocketStore()
const activeSessionId = ref(null)
const terminalRefs = ref({})
const terminalInstances = ref({})

const sessions = computed(() => socketStore.terminalSessions)

const createSession = async (sessionId) => {
    if (terminalInstances.value[sessionId]) {
        console.log(`Terminal instance already exists for: ${sessionId}`)
        return
    }

    console.log(`Creating new terminal session: ${sessionId}`)
    await nextTick()
    const container = terminalRefs.value[sessionId]
    if (!container) {
        console.warn(`Container not found for session: ${sessionId}`)
        setTimeout(() => createSession(sessionId), 100)
        return
    }

    const term = new Terminal({
        cursorBlink: true,
        theme: {
            background: 'rgba(22, 21, 21, 0.95)',
            foreground: '#5fbfbb',
            cursor: '#5fbfbb',
            cursorAccent: 'rgba(22, 21, 21, 0.8)'
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        rows: 24,
        cols: 80
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(container)
    
    setTimeout(() => {
        try {
            fitAddon.fit()
        } catch (e) {
            console.warn('Failed to fit terminal:', e)
        }
    }, 50)

    const session = sessions.value[sessionId]
    const existingBuffer = session?.buffer || ''
    
    terminalInstances.value[sessionId] = {
        term,
        fitAddon,
        lastBufferLength: existingBuffer.length 
    }
    
    if (!activeSessionId.value) {
        activeSessionId.value = sessionId
    }
    
    term.write(`--- Session Started: ${sessionId} ---\r\n`)
    
    if (existingBuffer) {
        console.log(`Writing existing buffer (${existingBuffer.length} chars) to terminal ${sessionId}`)
        term.write(existingBuffer)
    }
}

const switchTab = (sessionId) => {
    activeSessionId.value = sessionId
    nextTick(() => {
        const instance = terminalInstances.value[sessionId]
        if (instance && instance.fitAddon) {
            try {
                instance.fitAddon.fit()
            } catch (e) {
                console.warn('Failed to fit terminal on tab switch:', e)
            }
        }
    })
}

watch(sessions, async (newSessions, oldSessions) => {
    console.log('[LiveTerminal] Sessions changed:', Object.keys(newSessions))
    
    for (const sessionId of Object.keys(newSessions)) {
        if (!terminalInstances.value[sessionId]) {
            await nextTick()
            await createSession(sessionId)
        }
    }
}, { deep: true })

watch(sessions, (newSessions) => {
    for (const [sessionId, session] of Object.entries(newSessions)) {
        const instance = terminalInstances.value[sessionId]
        if (instance && instance.term && session.buffer) {
            if (!instance.lastBufferLength) {
                instance.lastBufferLength = 0
            }
            
            const newData = session.buffer.substring(instance.lastBufferLength)
            if (newData.length > 0) {
                instance.term.write(newData)
                instance.lastBufferLength = session.buffer.length
            }
        }
    }
}, { deep: true })

onMounted(() => {
    console.log('[LiveTerminal] Component mounted')
    console.log('[LiveTerminal] Existing sessions from store:', Object.keys(sessions.value))
    
    nextTick(() => {
        for (const sessionId of Object.keys(sessions.value)) {
            createSession(sessionId)
        }
    })

    const handleResize = () => {
        if (activeSessionId.value && terminalInstances.value[activeSessionId.value]) {
            try {
                terminalInstances.value[activeSessionId.value].fitAddon.fit()
            } catch (e) {
                console.warn('Failed to fit terminal on resize:', e)
            }
        }
    }
    
    window.addEventListener('resize', handleResize)
    
    onUnmounted(() => {
        window.removeEventListener('resize', handleResize)
    })
})

onUnmounted(() => {
    console.log('[LiveTerminal] Component unmounting, disposing terminals')
    Object.values(terminalInstances.value).forEach(instance => {
        if (instance.term) {
            instance.term.dispose()
        }
    })
    terminalInstances.value = {}
})
</script>

<template>
    <div class="flex flex-col w-full h-96 bg-[rgba(22,21,21,0.95)] rounded-lg overflow-hidden border-2 border-[#5fbfbb] shadow-lg">
        <!-- Tabs -->
        <div class="flex bg-[rgba(22,21,21,0.98)] border-b-2 border-[#5fbfbb] overflow-x-auto">
            <button 
                v-for="(session, id) in sessions" 
                :key="id"
                @click="switchTab(id)"
                class="px-4 py-2 text-xs font-mono border-r border-[#5fbfbb] hover:bg-[rgba(95,191,187,0.2)] transition-colors whitespace-nowrap"
                :class="activeSessionId === id ? 'bg-[rgba(95,191,187,0.2)] text-[#5fbfbb]' : 'text-gray-400'"
            >
                {{ id.slice(0, 8) }}...
            </button>
            <div v-if="Object.keys(sessions).length === 0" class="px-4 py-2 text-xs text-gray-500 font-mono">
                Waiting for connections...
            </div>
        </div>

        <!-- Terminal Containers -->
        <div class="relative flex-1 bg-[rgba(22,21,21,0.95)] overflow-hidden">
            <div 
                v-for="(session, id) in sessions" 
                :key="id"
                :ref="(el) => { if (el) terminalRefs[id] = el }"
                class="absolute inset-0 w-full h-full"
                :class="{ 'z-10': activeSessionId === id, 'z-0 opacity-0 pointer-events-none': activeSessionId !== id }"
            ></div>
            
            <!-- Empty State -->
            <div v-if="Object.keys(sessions).length === 0" class="flex items-center justify-center h-full text-[#5fbfbb] font-mono text-sm">
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
