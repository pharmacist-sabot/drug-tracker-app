// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase/client'

// Import ทุกหน้า (View) ที่เราจะสร้าง
import AuthView from '../views/AuthView.vue'
import ImportView from '../views/ImportView.vue'
import OrderView from '../views/OrderView.vue'
import ReceiveView from '../views/ReceiveView.vue'
import HistoryView from '../views/HistoryView.vue'

// กำหนดเส้นทาง (Route) ของแต่ละหน้า
const routes = [
  // หน้าสำหรับ Login / Register
  {
    path: '/auth',
    name: 'Auth',
    component: AuthView,
  },
  // หน้าหลัก (Import) ต้องล็อกอินก่อน (meta: { requiresAuth: true })
  {
    path: '/',
    name: 'Import',
    component: ImportView,
    meta: { requiresAuth: true },
  },
  // หน้ารายการต้องสั่งซื้อ
  {
    path: '/to-order',
    name: 'Order',
    component: OrderView,
    meta: { requiresAuth: true },
  },
  // หน้ารายการรอรับของ
  {
    path: '/to-receive',
    name: 'Receive',
    component: ReceiveView,
    meta: { requiresAuth: true },
  },
  // หน้าประวัติทั้งหมด
  {
    path: '/history',
    name: 'History',
    component: HistoryView,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ★★★ ส่วนสำคัญ: ยามตรวจการณ์ (Navigation Guard) ★★★
// ฟังก์ชันนี้จะทำงานทุกครั้งก่อนที่ผู้ใช้จะเปลี่ยนหน้า
router.beforeEach(async (to, from, next) => {
  // 1. ตรวจสอบสถานะ session กับ Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 2. เช็คว่าหน้าที่กำลังจะไป (to) ต้องมีการยืนยันตัวตนหรือไม่
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !session) {
    // 3. ถ้าหน้าที่ไป "ต้อง" ล็อกอิน แต่ "ยังไม่ได้" ล็อกอิน -> ส่งไปหน้า Auth
    next({ name: 'Auth' })
  } else if (to.name === 'Auth' && session) {
    // 4. ถ้าจะไปหน้า Auth แต่ "ล็อกอินแล้ว" -> ส่งไปหน้าหลัก (Import)
    next({ name: 'Import' })
  } else {
    // 5. กรณีอื่นๆ (เช่น ไปหน้าที่ต้องล็อกอิน และล็อกอินแล้ว) -> อนุญาตให้ไปต่อ
    next()
  }
})

export default router
