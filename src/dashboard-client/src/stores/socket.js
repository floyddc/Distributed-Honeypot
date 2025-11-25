import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io } from 'socket.io-client'

export const useSocketStore = defineStore('socket', () => {
    const socket = ref(null)
    const isConnected = ref(false)
    const attacks = ref([])

    function connect() {
        if (socket.value) return

        socket.value = io('http://localhost:3000')

        socket.value.on('connect', () => {
            isConnected.value = true
            console.log('Socket connected')
        })

        socket.value.on('disconnect', () => {
            isConnected.value = false
            console.log('Socket disconnected')
        })

        socket.value.on('new_attack', (attack) => {
            console.log('New attack received:', attack)
            attacks.value.unshift(attack)
            if (attacks.value.length > 50) {
                attacks.value.pop()
            }
        })
    }

    function disconnect() {
        if (socket.value) {
            socket.value.disconnect()
            socket.value = null
        }
    }

    return { socket, isConnected, attacks, connect, disconnect }
})
