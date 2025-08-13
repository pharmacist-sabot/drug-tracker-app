<!-- src/components/OrderSummaryModal.vue -->
<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content card">
      <header class="modal-header">
        <h2>สรุปรายการสั่งซื้อ</h2>
        <button @click="$emit('close')" class="close-button" aria-label="ปิด">&times;</button>
      </header>
      
      <div v-if="isSending" class="sending-state">
        <div class="spinner"></div>
        <p>กำลังส่งคำสั่งซื้อและแจ้งเตือนผ่าน Telegram...</p>
      </div>

      <div v-else class="order-summary-list">
        <div v-for="(group, supplierName) in groupedOrders" :key="supplierName" class="supplier-group">
          <h4>
            เรียน บริษัท <strong>{{ supplierName }}</strong>
          </h4>
          <p class="order-request-text">โรงพยาบาลสระโบสถ์ ขอความอนุเคราะห์ในการจัดซื้อยาตามรายการต่อไปนี้:</p>
          <ul>
            <li v-for="order in group.orders" :key="order.id">
              <span>
                {{ order.drugs.name }}
                <template v-if="order.drugs.form"> [{{ order.drugs.form }}]</template>
                <template v-if="order.drugs.strength"> ({{ order.drugs.strength }})</template>
                <template v-if="order.packaging"> / {{ order.packaging }}</template>
              </span>
              <span>จำนวน {{ order.quantity }} x {{ order.unit_count }}</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div v-if="error" class="error-message">
        <strong>เกิดข้อผิดพลาด:</strong> {{ error }}
      </div>

      <footer class="modal-footer">
        <button @click="$emit('close')" class="btn btn-secondary" :disabled="isSending">
          ยกเลิก
        </button>
        <button @click="confirmAndSend" class="btn btn-primary" :disabled="isSending || Object.keys(groupedOrders).length === 0">
          {{ isSending ? 'กำลังส่ง...' : 'ยืนยันและส่งคำสั่งซื้อ' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase/client'

const props = defineProps({
  groupedOrders: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'orders-sent'])

const isSending = ref(false)
const error = ref(null)

function escapeMarkdownV2(text) {
  const str = String(text || ''); 
  return str.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

const confirmAndSend = async () => {
  isSending.value = true
  error.value = null
  const allOrderedIds = []

  try {
    const separator = '—'.repeat(35) + '\n'

    for (const supplierName in props.groupedOrders) {
      const group = props.groupedOrders[supplierName]
      const safeSupplierName = escapeMarkdownV2(supplierName)

      let message = `*📝 ใบสั่งซื้อยาถึง บ\\. ${safeSupplierName}*\n\n`
      message += `จาก: *โรงพยาบาลสระโบสถ์ จังหวัดลพบุรี*\n\n`

      group.orders.forEach((order, index) => {
        const drugName = escapeMarkdownV2(order.drugs.name)
        const form = escapeMarkdownV2(order.drugs.form)
        const strength = escapeMarkdownV2(order.drugs.strength)
        const packaging = escapeMarkdownV2(order.packaging)
        const quantity = escapeMarkdownV2(order.quantity)
        const unitCountAsNumber = parseInt(order.unit_count, 10) || 1;
        const unit = escapeMarkdownV2(unitCountAsNumber);
        
        message += `*${index + 1}\\. ${drugName}*`
        if (form) message += ` \\[${form}\\]`
        if (strength) message += ` \\(${strength}\\)`
        
        if (packaging) {
            message += `\n   _บรรจุภัณฑ์: ${packaging}_`
        }

        message += `\n   _จำนวน: ${quantity} x ${unit}_\n` 

        allOrderedIds.push(order.id)
      })

      const { data: functionResponse, error: functionError } = await supabase.functions.invoke('send-telegram-notify', {
        body: { message },
      })

      if (functionError) {
        throw new Error(`Failed to send notification for ${supplierName}: ${functionError.message}`)
      }
      if (functionResponse?.error) {
         throw new Error(`Edge function returned an error for ${supplierName}: ${functionResponse.error}`)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const { error: dbError } = await supabase
      .from('purchase_orders')
      .update({ status: 'สั่งแล้ว', order_date: today })
      .in('id', allOrderedIds)
    
    if (dbError) {
      console.error("Critical Error: Notifications sent, but DB update failed!", dbError)
      throw new Error(`Notifications were sent, but failed to update database: ${dbError.message}`)
    }

    emit('orders-sent')

  } catch (err) {
    error.value = err.message
    console.error("An error occurred in confirmAndSend:", err);
  } finally {
    isSending.value = false
  }
}
</script>

<style scoped>
/* Scoped styles สำหรับ Modal นี้โดยเฉพาะ */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 1rem;
}
.modal-content {
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
}
.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: var(--subtle-text-color);
}
.order-summary-list {
  overflow-y: auto;
  flex-grow: 1;
}
.supplier-group {
  margin-bottom: 2rem;
}
.supplier-group h4 {
  background-color: var(--bg-color);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  margin: 0 0 0.5rem 0;
}
.order-request-text {
  color: var(--subtle-text-color);
  font-size: 0.9rem;
  margin: 0.5rem 0;
}
.supplier-group ul {
  list-style: none;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}
.supplier-group li {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}
.supplier-group li:last-child {
  border-bottom: none;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
.sending-state {
  text-align: center;
  padding: 3rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
.spinner {
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.error-message {
  color: var(--status-pending-bg);
  background-color: color-mix(in srgb, var(--status-pending-bg) 20%, transparent);
  border: 1px solid var(--status-pending-bg);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  word-break: break-word;
}
</style>