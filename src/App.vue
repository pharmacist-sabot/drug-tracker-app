<!-- src/App.vue -->
<template>
  <div v-if="session" class="app-layout">
    <NavBar />
    <main class="content">
      <router-view />
    </main>
    <Notification />
  </div>
  <AuthView v-else />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './supabase/client'
import NavBar from './components/NavBar.vue'
import AuthView from './views/AuthView.vue'
import Notification from './components/Notification.vue'

const session = ref(null)

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
  })

  supabase.auth.onAuthStateChange((_event, _session) => {
    session.value = _session
  })
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-color);
  transition: background-color 0.3s ease;
}

.content {
  flex-grow: 1;
  padding-top: 30px;
}
</style>
