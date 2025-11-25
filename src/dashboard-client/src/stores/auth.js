import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(JSON.parse(localStorage.getItem('user')) || null)
    const token = ref(localStorage.getItem('token') || null)
    const router = useRouter()

    const API_URL = 'http://localhost:3000/api/auth'

    async function login(email, password) {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Login failed')
            }

            user.value = data
            token.value = data.token
            localStorage.setItem('user', JSON.stringify(data))
            localStorage.setItem('token', data.token)

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    async function register(username, email, password) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed')
            }

            user.value = data
            token.value = data.token
            localStorage.setItem('user', JSON.stringify(data))
            localStorage.setItem('token', data.token)

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function logout() {
        user.value = null
        token.value = null
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        // We can't use router here directly in setup store easily without providing it, 
        // but usually logout is called from a component which handles redirect
        window.location.href = '/login'
    }

    return { user, token, login, register, logout }
})
