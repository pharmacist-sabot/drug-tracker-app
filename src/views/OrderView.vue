<!-- src/views/OrderView.vue -->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>รายการที่ต้องสั่งซื้อ</h1>
      <p class="subtitle">
        เลือกรายการยาที่ต้องการสั่งซื้อ จากนั้นสร้างใบสั่งซื้อเพื่อส่งแจ้งเตือนผ่าน Telegram
      </p>
    </header>

    <!-- Section: ปุ่มและฟอร์มสำหรับเพิ่มรายการเอง -->
    <div class="header-actions">
      <button @click="showAddForm = !showAddForm" class="btn btn-secondary">
        {{ showAddForm ? 'ซ่อนฟอร์ม' : '+ เพิ่มรายการด้วยตนเอง' }}
      </button>
    </div>
    <AddOrderForm v-if="showAddForm" @close="showAddForm = false" @order-added="handleOrderAdded" />


    <!-- Section: แสดงสถานะต่างๆ -->
    <div v-if="loading" class="loading-state">กำลังโหลดข้อมูล...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="orders.length === 0" class="empty-state">
      ไม่มีรายการที่ต้องสั่งซื้อในขณะนี้ 🎉
    </div>

    <!-- Section: ตารางแสดงรายการยาที่ต้องสั่งซื้อ -->
    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th class="checkbox-col">
              <input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" title="เลือกทั้งหมด" />
            </th>
            <th>ชื่อยา</th>
            <th>บริษัท</th>
            <th>จำนวน</th>
            <th>ราคารวม</th>
          </tr>
        </thead>
        <tbody>
          <!-- วนลูปแสดงแต่ละรายการ -->
          <tr v-for="order in orders" :key="order.id" :class="{ 'selected-row': selectedOrderIds.has(order.id) }">
            <td class="checkbox-col">
                <input type="checkbox" :value="order.id" v-model="selectedOrderIds" />
            </td>
            <td>
              <div class="drug-name">{{ order.drugs.name }}</div>
              <div class="drug-detail">
                {{ order.drugs.form }} {{ order.drugs.strength }}
                <span v-if="order.packaging">({{ order.packaging }})</span>
              </div>
            </td>
            <td>{{ order.suppliers.name }}</td>
            <td>{{ order.quantity }} x {{ order.unit_count }}</td>
            <td>{{ order.total_price.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Section: แถบ Floating Action Bar ที่จะแสดงเมื่อมีการเลือกรายการ -->
    <div class="floating-bar" :class="{ 'visible': selectedOrderIds.size > 0 }">
        <span>เลือกแล้ว {{ selectedOrderIds.size }} รายการ</span>
        <button @click="openSummaryModal" class="btn btn-primary" :disabled="selectedOrderIds.size === 0">
            สร้างใบสั่งซื้อ
        </button>
    </div>

    <!-- Section: Modal สรุปรายการสั่งซื้อ (แสดงเมื่อ isModalVisible เป็น true) -->
    <OrderSummaryModal
        v-if="isModalVisible"
        :grouped-orders="groupedSelectedOrders"
        @close="isModalVisible = false"
        @orders-sent="handleOrdersSent"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase/client'
import AddOrderForm from '../components/AddOrderForm.vue'
import OrderSummaryModal from '../components/OrderSummaryModal.vue'

const orders = ref([])
const loading = ref(true)
const error = ref(null)
const showAddForm = ref(false)
const selectedOrderIds = ref(new Set())
const isModalVisible = ref(false)

const fetchOrdersToBuy = async () => {
  try {
    loading.value = true
    error.value = null
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select('id, quantity, unit_count, price_per_unit, total_price, packaging, drugs (*), suppliers (*)') // <-- เพิ่ม packaging
      .eq('status', 'ต้องสั่งซื้อ')
      .order('created_at', { ascending: true })

    if (dbError) throw dbError
    orders.value = data
  } catch (err) {
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`
  } finally {
    loading.value = false
  }
}

const isAllSelected = computed(() => {
    return orders.value.length > 0 && selectedOrderIds.value.size === orders.value.length;
});

const groupedSelectedOrders = computed(() => {
    const grouped = {}
    const selected = orders.value.filter(o => selectedOrderIds.value.has(o.id));
    
    selected.forEach(order => {
        const supplierName = order.suppliers.name
        if (!grouped[supplierName]) {
            grouped[supplierName] = { orders: [] }
        }
        grouped[supplierName].orders.push(order)
    })
    return grouped
})

const toggleSelectAll = (event) => {
    if (event.target.checked) {
        selectedOrderIds.value = new Set(orders.value.map(o => o.id));
    } else {
        selectedOrderIds.value.clear();
    }
}

const openSummaryModal = () => {
    if (selectedOrderIds.value.size > 0) {
      isModalVisible.value = true
    }
}

const handleOrderAdded = () => {
  showAddForm.value = false
  fetchOrdersToBuy()
}

const handleOrdersSent = () => {
    isModalVisible.value = false
    selectedOrderIds.value.clear()
    fetchOrdersToBuy()
}

onMounted(fetchOrdersToBuy)
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
}

.checkbox-col {
  width: 50px;
  text-align: center;
  vertical-align: middle;
}
.checkbox-col input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.selected-row {
  background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
}
.selected-row td {
  transition: background-color 0.2s ease-in-out;
}

.floating-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 120%);
  background-color: var(--card-bg-color);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 -4px 20px var(--shadow-color);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: transform 0.3s ease-in-out;
  z-index: 1500;
}

.floating-bar.visible {
    transform: translate(-50%, -20px);
}

.floating-bar span {
    font-weight: 500;
    color: var(--subtle-text-color);
}
</style>