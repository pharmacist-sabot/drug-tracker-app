<!-- src/components/Notification.vue -->
<template>
  <Transition name="toast">
    <div v-if="notificationStore.isVisible" class="notification" :class="notificationStore.type">
      {{ notificationStore.message }}
      <button @click="notificationStore.hideNotification()" class="close-btn">&times;</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification'

const notificationStore = useNotificationStore()
</script>

<style scoped>
.notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 2rem;
  border-radius: 8px;
  color: var(--primary-text-color);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 9999;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid transparent;
}

.notification.success {
  background-color: var(--status-received-bg);
  border-color: #ffffff55;
}

.notification.error {
  background-color: var(--status-pending-bg);
  border-color: #ffffff55;
}

.close-btn {
  background: none;
  border: none;
  color: var(--primary-text-color);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

/* Vue Transition styles */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.5s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
