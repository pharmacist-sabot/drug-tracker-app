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
              <input type="date" v-model="order.received_date_input" class="form-input date-input" />
            </td>
            <td>
              <button @click="markAsReceived(order)" class="btn btn-primary"
                :disabled="!order.received_date_input || order.isSaving">
                {{ order.isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase/client'
import { useNotificationStore } from '@/stores/notification'
import type { ReceivableOrder, ReceiveViewOrder } from '@/types/database'

// ─────────────────────────────────────────────
// Stores
// ─────────────────────────────────────────────

const notificationStore = useNotificationStore()

// ─────────────────────────────────────────────
// Reactive state
// ─────────────────────────────────────────────

const orders = ref<ReceivableOrder[]>([])
const loading = ref<boolean>(true)
const error = ref<string | null>(null)

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Formats an ISO date string into a Thai locale short date.
 * Returns an em-dash when the value is falsy.
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }

  return new Date(dateString).toLocaleDateString('th-TH', options)
}

/**
 * Converts a raw `PurchaseOrderWithRelations` row into a `ReceivableOrder`
 * by augmenting it with local UI state fields.
 */
function toReceivableOrder(row: ReceiveViewOrder): ReceivableOrder {
  return {
    ...row,
    received_date_input: '',
    isSaving: false,
  }
}

// ─────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────

async function fetchOrdersToReceive(): Promise<void> {
  try {
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select('id, order_date, packaging, drugs (*), suppliers (*)')
      .eq('status', 'สั่งแล้ว')
      .order('order_date', { ascending: true })

    if (dbError) throw dbError

    orders.value = ((data ?? []) as unknown as ReceiveViewOrder[]).map(toReceivableOrder)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${message}`
  } finally {
    loading.value = false
  }
}

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────

/**
 * Marks a single order as received by updating its status and
 * received date in the database, then removes it from the local list.
 */
async function markAsReceived(order: ReceivableOrder): Promise<void> {
  if (!order.received_date_input) {
    notificationStore.showNotification({
      message: 'กรุณาเลือกวันที่รับของ',
      type: 'error',
    })
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
    notificationStore.showNotification({
      message: `เกิดข้อผิดพลาด: ${updateError.message}`,
      type: 'error',
    })
    order.isSaving = false
  } else {
    // Remove the order from the local list after successful update
    orders.value = orders.value.filter((o) => o.id !== order.id)
    notificationStore.showNotification({
      message: 'บันทึกการรับของเรียบร้อย!',
      type: 'success',
    })
  }
}

// ─────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────

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
