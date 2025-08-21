// src/stores/notification.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const message = ref('')
  const type = ref('success') // 'success' or 'error'
  const isVisible = ref(false)
  let timeoutId = null

  function showNotification(payload) {
    // Clear any existing timeout to reset the timer
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    message.value = payload.message
    type.value = payload.type || 'success'
    isVisible.value = true

    // Automatically hide after 3 seconds
    timeoutId = setTimeout(() => {
      hideNotification()
    }, 3000)
  }

  function hideNotification() {
    isVisible.value = false
    // Reset after transition ends (optional, good practice)
    setTimeout(() => {
      message.value = ''
      type.value = 'success'
    }, 500) // Match transition duration
  }

  return { message, type, isVisible, showNotification, hideNotification }
})