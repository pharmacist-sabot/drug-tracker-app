<!-- src/views/HistoryView.vue -->
<template>
  <div>
    <h1>ประวัติการสั่งซื้อทั้งหมด</h1>
    <div class="controls">
      <!-- ช่องสำหรับค้นหาตามชื่อยา -->
      <input
        type="text"
        v-model="searchTerm"
        placeholder="ค้นหาตามชื่อยา..."
        class="search-input"
      />
    </div>

    <div v-if="loading" class="loading-state">กำลังโหลดข้อมูล...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="filteredOrders.length === 0" class="empty-state">
      ไม่พบข้อมูลที่ตรงกับการค้นหา
    </div>

    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>ชื่อยา</th>
            <th>บริษัท</th>
            <th>สถานะ</th>
            <th>วันที่สั่งซื้อ</th>
            <th>วันที่รับของ</th>
          </tr>
        </thead>
        <tbody>
          <!-- ★★★ จุดแตกต่างที่ 3: วนลูปจาก filteredOrders ที่ผ่านการค้นหาแล้ว ★★★ -->
          <tr v-for="order in filteredOrders" :key="order.id">
            <td>
              <div class="drug-name">{{ order.drugs.name }}</div>
              <div class="drug-detail">{{ order.drugs.form }} {{ order.drugs.strength }}</div>
            </td>
            <td>{{ order.suppliers.name }}</td>
            <td>
              <!-- แสดงสถานะพร้อมสีเพื่อความสวยงาม -->
              <span class="status-badge" :class="getStatusClass(order.status)">
                {{ order.status }}
              </span>
            </td>
            <td>{{ formatDate(order.order_date) }}</td>
            <td>{{ formatDate(order.received_date) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue' // เพิ่ม computed
import { supabase } from '../supabase/client'

const allOrders = ref([]) // เก็บข้อมูลทั้งหมดที่ดึงมา
const searchTerm = ref('') // เก็บค่าจากช่องค้นหา
const loading = ref(true)
const error = ref(null)

// ฟังก์ชันดึงข้อมูลจาก Supabase
const fetchHistory = async () => {
  try {
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select(
        `
          status, order_date, received_date,
          drugs (*),
          suppliers (*)
      `,
      )
      // ★★★ จุดแตกต่างที่ 1: ไม่มีการ .eq('status', ...) เพราะเราต้องการทุกสถานะ ★★★
      .order('created_at', { ascending: false }) // เรียงตามวันที่สร้างล่าสุดขึ้นก่อน

    if (dbError) throw dbError

    allOrders.value = data
  } catch (err) {
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`
  } finally {
    loading.value = false
  }
}

// ★★★ จุดแตกต่างที่ 2: ใช้ computed property เพื่อกรองข้อมูลแบบ Real-time ★★★
// ฟังก์ชันนี้จะทำงานใหม่ทุกครั้งที่ allOrders หรือ searchTerm เปลี่ยนค่า
const filteredOrders = computed(() => {
  if (!searchTerm.value) {
    return allOrders.value // ถ้าไม่มีอะไรในช่องค้นหา ก็แสดงทั้งหมด
  }
  return allOrders.value.filter((order) =>
    // ค้นหาโดยทำให้เป็นตัวพิมพ์เล็กทั้งคู่เพื่อจะได้ไม่สน case sensitive
    order.drugs.name.toLowerCase().includes(searchTerm.value.toLowerCase()),
  )
})

// ฟังก์ชันช่วยจัดรูปแบบวันที่ให้อ่านง่าย
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(dateString).toLocaleDateString('th-TH', options)
}

// ฟังก์ชันช่วยกำหนด class สีให้กับสถานะ
const getStatusClass = (status) => {
  if (status === 'รับของแล้ว') return 'status-received'
  if (status === 'สั่งแล้ว') return 'status-ordered'
  return 'status-pending' // สำหรับ 'ต้องสั่งซื้อ'
}

// เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อคอมโพเนนต์พร้อมใช้งาน
onMounted(fetchHistory)
</script>

<style scoped>
/* สไตล์ส่วนใหญ่เหมือนเดิม แต่เพิ่มของช่องค้นหาและป้ายสถานะ */
h1 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}
.controls {
  margin-bottom: 1.5rem;
}
.search-input {
  width: 300px;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #ced4da;
  font-size: 1rem;
}
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  margin-top: 2rem;
  background-color: #fff;
  border-radius: 8px;
}
.table-container {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}
.drug-name {
  font-weight: bold;
}
.drug-detail {
  font-size: 0.85rem;
  color: #6c757d;
}
/* สไตล์สำหรับป้ายสถานะ */
.status-badge {
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  color: white;
}
.status-pending {
  /* ต้องสั่งซื้อ */
  background-color: #dc3545;
}
.status-ordered {
  /* สั่งแล้ว */
  background-color: #ffc107;
  color: #212529;
}
.status-received {
  /* รับของแล้ว */
  background-color: #28a745;
}
</style>
