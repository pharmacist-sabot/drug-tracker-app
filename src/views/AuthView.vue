<!-- src/views/AuthView.vue -->
<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="title">DrugTracker System</h1>
      <p class="subtitle">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>

      <div v-if="message" class="message">{{ message }}</div>

      <form @submit.prevent>
        <div class="form-group">
          <label for="email">อีเมล</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label for="password">รหัสผ่าน</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="input-field"
          />
        </div>

        <div class="button-group">
          <button @click="handleLogin" class="btn-primary" :disabled="isLoading">
            {{ isLoading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ' }}
          </button>
          <button @click="handleRegister" class="btn-secondary" :disabled="isLoading">
            ลงทะเบียน
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase/client'
import { useRouter } from 'vue-router' // ★★★ นำ Router กลับมาใช้งาน

const email = ref('')
const password = ref('')
const message = ref('')
const isLoading = ref(false)
const router = useRouter() // ★★★ สร้างตัวแปร router

// ฟังก์ชัน Login
const handleLogin = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) throw error

    // ★★★ สั่งให้เปลี่ยนไปหน้าหลัก หลังล็อกอินสำเร็จ ★★★
    router.push('/')
  } catch (error) {
    message.value = `เกิดข้อผิดพลาด: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

// ฟังก์ชัน Register
const handleRegister = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    })
    if (error) throw error

    // ★★★ สั่งให้เปลี่ยนไปหน้าหลัก หลังลงทะเบียนสำเร็จ ★★★
    router.push('/')
  } catch (error) {
    message.value = `เกิดข้อผิดพลาด: ${error.message}`
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #e9ecef;
}
.auth-card {
  background: white;
  padding: 2.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}
.title {
  font-size: 1.8rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.5rem;
}
.subtitle {
  text-align: center;
  color: #6c757d;
  margin-bottom: 2rem;
}
.message {
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  word-break: break-all;
}
.form-group {
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
.input-field {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  box-sizing: border-box;
}
.button-group {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
button {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-primary {
  background-color: #007bff;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}
.btn-secondary {
  background-color: #6c757d;
  color: white;
}
.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}
button:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}
</style>
