<!-- src/views/HistoryView.vue -->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>ประวัติการสั่งซื้อทั้งหมด</h1>
      <p class="subtitle">ดูและค้นหารายการสั่งซื้อที่ผ่านมาทั้งหมดในระบบ</p>
    </header>

    <div class="card">
      <div class="controls">
        <input
          type="text"
          v-model="searchTerm"
          placeholder="ค้นหาตามชื่อยา..."
          class="form-input search-input"
        />
      </div>

      <div v-if="loading" class="loading-state">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="error-state">{{ error }}</div>

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
          <tbody v-if="filteredOrders.length > 0">
            <tr v-for="order in filteredOrders" :key="order.id">
              <td>
                <div class="drug-name">{{ order.drugs.name }}</div>
                <div class="drug-detail">
                  {{ order.drugs.form }} {{ order.drugs.strength }}
                  <span v-if="order.packaging">({{ order.packaging }})</span>
                </div>
              </td>
              <td>{{ order.suppliers.name }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(order.status)">
                  {{ order.status }}
                </span>
              </td>
              <td>{{ formatDate(order.order_date) }}</td>
              <td>{{ formatDate(order.received_date) }}</td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="filteredOrders.length === 0"
          class="empty-state"
          style="box-shadow: none; padding: 2rem"
        >
          ไม่พบข้อมูลที่ตรงกับการค้นหา
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase/client'

const allOrders = ref([])
const searchTerm = ref('')
const loading = ref(true)
const error = ref(null)

const fetchHistory = async () => {
  try {
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select('status, order_date, received_date, packaging, drugs (*), suppliers (*)') 
      .order('created_at', { ascending: false })
    if (dbError) throw dbError
    allOrders.value = data
  } catch (err) {
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`
  } finally {
    loading.value = false
  }
}

const filteredOrders = computed(() => {
  if (!searchTerm.value) {
    return allOrders.value
  }
  return allOrders.value.filter((order) =>
    order.drugs.name.toLowerCase().includes(searchTerm.value.toLowerCase()),
  )
})

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(dateString).toLocaleDateString('th-TH', options)
}

const getStatusClass = (status) => {
  if (status === 'รับของแล้ว') return 'status-received'
  if (status === 'สั่งแล้ว') return 'status-ordered'
  return 'status-pending'
}

onMounted(fetchHistory)
</script>

<style scoped>
.controls {
  margin-bottom: 1.5rem;
}
.search-input {
  max-width: 400px;
}

.status-badge {
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
}
.status-pending {
  background-color: var(--status-pending-bg);
}
.status-ordered {
  background-color: var(--status-ordered-bg);
  color: var(--text-color);
}
.status-received {
  background-color: var(--status-received-bg);
}
</style>