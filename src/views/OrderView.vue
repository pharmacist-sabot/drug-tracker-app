<!-- src/views/OrderView.vue -->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>รายการที่ต้องสั่งซื้อ</h1>
      <p class="subtitle">
        จัดการรายการยาที่ต้องสั่งซื้อ บันทึกวันที่สั่งเพื่อส่งต่อไปยังขั้นตอนรอรับของ
      </p>
    </header>

    <div v-if="loading" class="loading-state">กำลังโหลดข้อมูล...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="orders.length === 0" class="empty-state">
      ไม่มีรายการที่ต้องสั่งซื้อในขณะนี้ 🎉
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
              <input type="date" v-model="order.order_date_input" class="form-input date-input" />
            </td>
            <td>
              <button
                @click="markAsOrdered(order)"
                class="btn btn-primary"
                :disabled="!order.order_date_input || order.isSaving"
              >
                {{ order.isSaving ? 'กำลังบันทึก...' : 'บันทึกการสั่ง' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
// ... (script section remains unchanged)
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase/client'

const orders = ref([])
const loading = ref(true)
const error = ref(null)

const fetchOrdersToBuy = async () => {
  try {
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select('id, quantity, unit_count, price_per_unit, total_price, drugs (*), suppliers (*)')
      .eq('status', 'ต้องสั่งซื้อ')
      .order('created_at', { ascending: true })

    if (dbError) throw dbError
    orders.value = data.map((o) => ({ ...o, order_date_input: '', isSaving: false }))
  } catch (err) {
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`
  } finally {
    loading.value = false
  }
}

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
    orders.value = orders.value.filter((o) => o.id !== order.id)
  }
}

onMounted(fetchOrdersToBuy)
</script>

<style scoped>
.action-column {
  width: 180px;
}
.date-input {
  padding: 0.6rem;
}
.btn {
  width: 100%;
}
</style>
