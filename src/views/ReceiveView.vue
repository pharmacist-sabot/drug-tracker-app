<!-- src/views/ReceiveView.vue -->
<template>
  <div>
    <h1>รายการรอรับของ</h1>
    <p>รายการเหล่านี้คือยาที่สั่งซื้อไปแล้วและกำลังรอการจัดส่ง</p>

    <div v-if="loading" class="loading-state">กำลังโหลดข้อมูล...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="orders.length === 0" class="empty-state">ไม่มีรายการที่รอรับของในขณะนี้</div>

    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>ชื่อยา</th>
            <th>บริษัท</th>
            <th>วันที่สั่งซื้อ</th>
            <th class="action-column">วันที่รับของ</th>
            <th class="action-column"></th>
          </tr>
        </thead>
        <tbody>
          <!-- วนลูปแสดงข้อมูลยาที่รอรับของ -->
          <tr v-for="order in orders" :key="order.id">
            <td>
              <div class="drug-name">{{ order.drugs.name }}</div>
              <div class="drug-detail">{{ order.drugs.form }} {{ order.drugs.strength }}</div>
            </td>
            <td>{{ order.suppliers.name }}</td>
            <!-- แสดงวันที่สั่งซื้อที่มีอยู่แล้ว -->
            <td>{{ formatDate(order.order_date) }}</td>
            <td>
              <!-- ช่องสำหรับกรอกวันที่ได้รับของ -->
              <input type="date" v-model="order.received_date_input" class="date-input" />
            </td>
            <td>
              <button
                @click="markAsReceived(order)"
                class="action-button"
                :disabled="!order.received_date_input || order.isSaving"
              >
                {{ order.isSaving ? '...' : 'บันทึกการรับของ' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase/client'

const orders = ref([])
const loading = ref(true)
const error = ref(null)

// ฟังก์ชันสำหรับดึงข้อมูลจาก Supabase
const fetchOrdersToReceive = async () => {
  try {
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select(
        `
          id, order_date,
          drugs (*),
          suppliers (*)
      `,
      )
      // ★★★ จุดแตกต่างที่ 1: ดึงข้อมูลเฉพาะรายการที่มีสถานะเป็น 'สั่งแล้ว' ★★★
      .eq('status', 'สั่งแล้ว')
      .order('order_date', { ascending: true }) // เรียงตามวันที่สั่ง

    if (dbError) throw dbError

    // เพิ่ม property สำหรับ v-model และสถานะการบันทึก
    orders.value = data.map((o) => ({ ...o, received_date_input: '', isSaving: false }))
  } catch (err) {
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`
  } finally {
    loading.value = false
  }
}

// ฟังก์ชันสำหรับอัปเดตสถานะเป็น "รับของแล้ว"
const markAsReceived = async (order) => {
  if (!order.received_date_input) {
    alert('กรุณาเลือกวันที่รับของ')
    return
  }

  order.isSaving = true

  // ★★★ จุดแตกต่างที่ 2: อัปเดต received_date และเปลี่ยน status เป็น 'รับของแล้ว' ★★★
  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({
      received_date: order.received_date_input,
      status: 'รับของแล้ว',
    })
    .eq('id', order.id)

  if (updateError) {
    alert(`เกิดข้อผิดพลาดในการบันทึก: ${updateError.message}`)
    order.isSaving = false
  } else {
    // นำรายการที่บันทึกแล้วออกจาก List ในหน้าจอทันที
    orders.value = orders.value.filter((o) => o.id !== order.id)
  }
}

// ฟังก์ชันช่วยจัดรูปแบบวันที่ให้อ่านง่าย
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(dateString).toLocaleDateString('th-TH', options)
}

// เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อคอมโพเนนต์พร้อมใช้งาน
onMounted(fetchOrdersToReceive)
</script>

<style scoped>
/* คุณสามารถคัดลอก <style> ทั้งหมดจากไฟล์ OrderView.vue มาวางที่นี่ได้เลย */
/* เพราะมีโครงสร้างตารางและปุ่มที่เหมือนกันเกือบทั้งหมด */
h1 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
p {
  color: #6c757d;
  margin-bottom: 2rem;
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
.error-state {
  color: #721c24;
  background-color: #f8d7da;
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
th {
  background-color: #f8f9fa;
  font-weight: 600;
}
.drug-name {
  font-weight: bold;
}
.drug-detail {
  font-size: 0.85rem;
  color: #6c757d;
}
.action-column {
  width: 180px;
}
.date-input {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ced4da;
}
.action-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}
.action-button:hover:not(:disabled) {
  background-color: #0056b3;
}
.action-button:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}
</style>
