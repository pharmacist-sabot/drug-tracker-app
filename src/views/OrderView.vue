<!-- src/views/OrderView.vue -->
<template>
  <div>
    <h1>รายการที่ต้องสั่งซื้อ</h1>
    <div v-if="loading" class="loading-state">กำลังโหลดข้อมูล...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="orders.length === 0" class="empty-state">
      ไม่มีรายการที่ต้องสั่งซื้อในขณะนี้
    </div>

    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>ชื่อยา</th>
            <th>บริษัท</th>
            <th>จำนวน</th>
            <th>ราคาต่อหน่วย</th>
            <th>ราคารวม</th>
            <th class="action-column">วันที่สั่งซื้อ</th>
            <th class="action-column"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>
              <div class="drug-name">{{ order.drugs.name }}</div>
              <div class="drug-detail">{{ order.drugs.form }} {{ order.drugs.strength }}</div>
            </td>
            <td>{{ order.suppliers.name }}</td>
            <td>{{ order.quantity }} x {{ order.unit_count }}</td>
            <td>{{ order.price_per_unit.toFixed(2) }}</td>
            <td>{{ order.total_price.toFixed(2) }}</td>
            <td>
              <input type="date" v-model="order.order_date_input" class="date-input" />
            </td>
            <td>
              <button
                @click="markAsOrdered(order)"
                class="action-button"
                :disabled="!order.order_date_input || order.isSaving"
              >
                {{ order.isSaving ? '...' : 'บันทึกการสั่ง' }}
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

// ฟังก์ชันดึงข้อมูลจาก Supabase
const fetchOrdersToBuy = async () => {
  try {
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select(
        `
          id, quantity, unit_count, price_per_unit, total_price,
          drugs (*),
          suppliers (*)
      `,
      )
      .eq('status', 'ต้องสั่งซื้อ')
      .order('created_at', { ascending: true })

    if (dbError) throw dbError

    // เพิ่ม property สำหรับ v-model และสถานะการบันทึก
    orders.value = data.map((o) => ({ ...o, order_date_input: '', isSaving: false }))
  } catch (err) {
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`
  } finally {
    loading.value = false
  }
}

// ฟังก์ชันอัปเดตสถานะ
const markAsOrdered = async (order) => {
  if (!order.order_date_input) {
    alert('กรุณาเลือกวันที่สั่งซื้อ')
    return
  }

  order.isSaving = true

  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({
      order_date: order.order_date_input,
      status: 'สั่งแล้ว',
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

onMounted(fetchOrdersToBuy)
</script>

<style scoped>
/* สไตล์สำหรับตารางและสถานะต่างๆ */
h1 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
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
  width: 150px;
}
.date-input {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ced4da;
}
.action-button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}
.action-button:hover:not(:disabled) {
  background-color: #218838;
}
.action-button:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}
</style>
