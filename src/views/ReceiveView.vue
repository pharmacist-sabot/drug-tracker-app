<!-- src/views/ReceiveView.vue -->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>รายการรอรับของ</h1>
      <p class="subtitle">
        รายการยาที่สั่งซื้อไปแล้วและกำลังรอการจัดส่ง บันทึกวันที่รับของเพื่อย้ายไปยังประวัติ
      </p>
    </header>

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
          <tr v-for="order in orders" :key="order.id">
            <td>
              <div class="drug-name">{{ order.drugs.name }}</div>
              <div class="drug-detail">
                {{ order.drugs.form }} {{ order.drugs.strength }}
                <span v-if="order.packaging">({{ order.packaging }})</span>
              </div>
            </td>
            <td>{{ order.suppliers.name }}</td>
            <td>{{ formatDate(order.order_date) }}</td>
            <td>
              <input
                type="date"
                v-model="order.received_date_input"
                class="form-input date-input"
              />
            </td>
            <td>
              <button
                @click="markAsReceived(order)"
                class="btn btn-primary"
                :disabled="!order.received_date_input || order.isSaving"
              >
                {{ order.isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
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

const fetchOrdersToReceive = async () => {
  try {
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select('id, order_date, packaging, drugs (*), suppliers (*)') 
      .eq('status', 'สั่งแล้ว')
      .order('order_date', { ascending: true })

    if (dbError) throw dbError
    orders.value = data.map((o) => ({ ...o, received_date_input: '', isSaving: false }))
  } catch (err) {
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`
  } finally {
    loading.value = false
  }
}

const markAsReceived = async (order) => {
  if (!order.received_date_input) {
    alert('กรุณาเลือกวันที่รับของ')
    return
  }

  order.isSaving = true

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
    orders.value = orders.value.filter((o) => o.id !== order.id)
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(dateString).toLocaleDateString('th-TH', options)
}

onMounted(fetchOrdersToReceive)
</script>

<style scoped>
.action-column {
  width: 200px;
}
.date-input {
  padding: 0.6rem;
}
.btn {
  width: 100%;
}
</style>