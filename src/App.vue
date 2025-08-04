<!-- src/App.vue -->
<template>
  <!-- ถ้ามี session (ล็อกอินแล้ว) ให้แสดง Layout หลัก -->
  <div v-if="session" class="app-layout">
    <NavBar />
    <main class="content">
      <!-- <router-view> คือพื้นที่ที่เนื้อหาของแต่ละหน้าจะถูกแสดง -->
      <router-view />
    </main>
  </div>
  <!-- ถ้ายังไม่ล็อกอิน ให้แสดงหน้า Auth เต็มจอ -->
  <AuthView v-else />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './supabase/client'
import NavBar from './components/NavBar.vue'
// ★★★ จุดแก้ไขที่ 2: เปลี่ยนชื่อตัวแปรตอน import ★★★
import AuthView from './views/AuthView.vue'

// สร้างตัวแปร session เพื่อเก็บสถานะการล็อกอิน
const session = ref(null)

// onMounted คือฟังก์ชันที่จะทำงานครั้งเดียวตอนคอมโพเนนต์ถูกสร้าง
onMounted(() => {
  // ตรวจสอบ session ครั้งแรกตอนเปิดแอป
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
  })

  // ★★★ ส่วนสำคัญ: ทำให้แอปรู้ทันทีเมื่อมีการ login/logout ★★★
  // onAuthStateChange จะคอยดักฟังการเปลี่ยนแปลงสถานะตลอดเวลา
  supabase.auth.onAuthStateChange((_event, _session) => {
    console.log('Auth state changed!', _session)
    session.value = _session
  })
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f9fa;
}

.content {
  padding: 1.5rem;
  flex-grow: 1;
}
</style>
