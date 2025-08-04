<!-- src/components/NavBar.vue -->
<template>
  <header class="navbar">
    <div class="navbar-brand">DrugTracker</div>
    <nav class="nav-links">
      <!-- <router-link> คือวิธีสร้างลิงก์ที่ถูกต้องของ Vue Router -->
      <router-link to="/">นำเข้าไฟล์</router-link>
      <router-link to="/to-order">รายการต้องสั่งซื้อ</router-link>
      <router-link to="/to-receive">รายการรอรับของ</router-link>
      <router-link to="/history">ประวัติ</router-link>
    </nav>
    <div class="user-info">
      <span v-if="user">{{ user.email }}</span>
      <button @click="handleLogout" class="logout-button">ออกจากระบบ</button>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase/client'
import { useRouter } from 'vue-router'

const user = ref(null)
const router = useRouter()

// ดึงข้อมูล user มาแสดง email
onMounted(async () => {
  const { data } = await supabase.auth.getUser()
  user.value = data.user
})

// ฟังก์ชันสำหรับออกจากระบบ
const handleLogout = async () => {
  await supabase.auth.signOut()
  // หลังจาก signOut, onAuthStateChange ใน App.vue จะทำงาน
  // และส่งผู้ใช้ไปหน้า Auth อัตโนมัติ
  // แต่เราสามารถ push เพื่อความแน่นอนก็ได้
  router.push('/auth')
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 60px;
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  /* สไตล์สำหรับลิงก์ที่กำลังใช้งาน */
  color: #007bff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logout-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
.logout-button:hover {
  background-color: #c82333;
}
</style>
