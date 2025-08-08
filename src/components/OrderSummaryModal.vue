<!-- src/components/OrderSummaryModal.vue -->
<template>
  <!-- Backdrop: พื้นหลังสีเทาโปร่งแสง เมื่อคลิกจะปิด Modal -->
  <div class="modal-backdrop" @click.self="$emit('close')">
    
    <!-- Modal Content: ตัวกล่อง Modal หลัก -->
    <div class="modal-content card">
      
      <!-- Modal Header: ส่วนหัวของ Modal -->
      <header class="modal-header">
        <h2>สรุปรายการสั่งซื้อ</h2>
        <button @click="$emit('close')" class="close-button" aria-label="ปิด">&times;</button>
      </header>
      
      <!-- Section: แสดงสถานะขณะกำลังส่งข้อมูล -->
      <div v-if="isSending" class="sending-state">
        <div class="spinner"></div>
        <p>กำลังส่งคำสั่งซื้อและแจ้งเตือนผ่าน Telegram...</p>
      </div>

      <!-- Section: แสดงรายการสรุป (จะแสดงเมื่อไม่ได้กำลังส่ง) -->
      <div v-else class="order-summary-list">
        <!-- วนลูปตามกลุ่มของบริษัทที่ถูกจัดกลุ่มมาจาก OrderView.vue -->
        <div v-for="(group, supplierName) in groupedOrders" :key="supplierName" class="supplier-group">
          <h4>
            เรียน บริษัท <strong>{{ supplierName }}</strong>
          </h4>
          <p class="order-request-text">โรงพยาบาลสระโบสถ์ ขอความอนุเคราะห์ในการจัดซื้อยาตามรายการต่อไปนี้:</p>
          <ul>
            <!-- วนลูปแสดงรายการยาในแต่ละบริษัท -->
            <li v-for="order in group.orders" :key="order.id">
              <span>{{ order.drugs.name }} ({{ order.drugs.strength || 'N/A' }})</span>
              <span>จำนวน {{ order.quantity }} {{ order.unit_count }}</span>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- Section: แสดงข้อความ Error หากการส่งล้มเหลว -->
      <div v-if="error" class="error-message">
        <strong>เกิดข้อผิดพลาด:</strong> {{ error }}
      </div>

      <!-- Modal Footer: ส่วนท้ายของ Modal -->
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

// รับ props ที่ส่งมาจาก Component แม่ (OrderView.vue)
const props = defineProps({
  groupedOrders: {
    type: Object,
    required: true,
  },
})

// ประกาศ event ที่จะส่งกลับไปให้ Component แม่
const emit = defineEmits(['close', 'orders-sent'])

// State สำหรับจัดการสถานะภายใน Modal
const isSending = ref(false)
const error = ref(null)

/**
 * ฟังก์ชันสำหรับ "escape" อักขระพิเศษในข้อความ
 * เพื่อให้ Telegram MarkdownV2 ประมวลผลได้อย่างถูกต้อง ป้องกัน error
 * @param {any} text - ข้อความที่ต้องการ escape
 * @returns {string} - ข้อความที่ผ่านการ escape แล้ว
 */
function escapeMarkdownV2(text) {
  // 1. แปลง input เป็น string และจัดการค่า null/undefined ไปเลย
  const str = String(text || ''); 
  // 2. ใช้ Regex ที่ครอบคลุมอักขระพิเศษทั้งหมดของ MarkdownV2
  // อักขระที่ต้องมี \ นำหน้าคือ: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return str.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * ฟังก์ชันหลัก: เมื่อผู้ใช้กดยืนยันการสั่งซื้อ
 * จะทำการสร้างข้อความ, ส่งไปที่ Edge Function, และอัปเดตฐานข้อมูล
 */
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
      message += `จาก: *โรงพยาบาลสระโบสถ์*\n`
      message += separator

      group.orders.forEach((order, index) => {
        const drugName = escapeMarkdownV2(order.drugs.name)
        const strength = escapeMarkdownV2(order.drugs.strength)
        const quantity = escapeMarkdownV2(order.quantity)

        // --- จุดแก้ไข ---
        // ตรวจสอบและแปลง unit_count ให้เป็นตัวเลขจำนวนเต็ม
        // ถ้าค่าเดิมเป็น "1.00" จะกลายเป็น 1
        // ถ้าค่าเดิมเป็น "กล่อง" หรือค่าอื่นๆ ที่ไม่ใช่ตัวเลข จะกลายเป็น 1 (เป็นค่าสำรอง)
        const unitCountAsNumber = parseInt(order.unit_count, 10) || 1;
        const unit = escapeMarkdownV2(unitCountAsNumber);
        
        message += `*${index + 1}\\. ${drugName}*`
        if (strength) {
          message += ` \\(${strength}\\)`
        }
        // แก้ไขการแสดงผลตรงนี้
        message += `\n   _จำนวน: ${quantity} x ${unit}_\n` 

        allOrderedIds.push(order.id)
      })

      message += separator

      // 2. เรียกใช้ Supabase Edge Function ที่เราสร้างไว้
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke('send-telegram-notify', {
        body: { message }, // ส่งข้อความที่เราสร้างไปเป็น body
      })

      // หาก function ส่งข้อความไม่สำเร็จ ให้หยุดทำงานและแสดงข้อผิดพลาด
      if (functionError) {
        // ดึง message จาก error ของ function มาแสดงผล จะได้ข้อมูลละเอียดขึ้น
        throw new Error(`Failed to send notification for ${supplierName}: ${functionError.message}`)
      }
      // ตรวจสอบเพิ่มเติมว่า function ทำงานสำเร็จจริงหรือไม่ (เผื่อกรณีที่ไม่ throw error แต่ทำงานผิดพลาด)
      if (functionResponse?.error) {
         throw new Error(`Edge function returned an error for ${supplierName}: ${functionResponse.error}`)
      }
    }

    // 3. เมื่อส่งแจ้งเตือนสำเร็จทั้งหมด ให้ Update สถานะในฐานข้อมูล
    const today = new Date().toISOString().split('T')[0] // วันที่ปัจจุบันในรูปแบบ YYYY-MM-DD
    const { error: dbError } = await supabase
      .from('purchase_orders')
      .update({ status: 'สั่งแล้ว', order_date: today })
      .in('id', allOrderedIds) // อัปเดตทุกรายการที่มี ID อยู่ใน list นี้
    
    // หากการอัปเดตฐานข้อมูลล้มเหลว
    if (dbError) {
      // นี่เป็นกรณีที่น่ากังวล เพราะแจ้งเตือนถูกส่งไปแล้วแต่ข้อมูลในระบบยังไม่อัปเดต
      // ควรมี Log หรือการแจ้งเตือนผู้ดูแลระบบเพิ่มเติมในอนาคต
      console.error("Critical Error: Notifications sent, but DB update failed!", dbError)
      throw new Error(`Notifications were sent, but failed to update database: ${dbError.message}`)
    }

    // 4. แจ้ง Component แม่ว่าทำทุกอย่างสำเร็จแล้ว
    emit('orders-sent')

  } catch (err) {
    // หากมีข้อผิดพลาดใดๆ เกิดขึ้นใน try block จะเข้ามาทำงานที่นี่
    // แสดงข้อผิดพลาดให้ผู้ใช้เห็น
    error.value = err.message
    // บันทึก error ลง console เพื่อการ debug ที่ง่ายขึ้น
    console.error("An error occurred in confirmAndSend:", err);
  } finally {
    // บล็อก finally จะทำงานเสมอ ไม่ว่า try จะสำเร็จหรือล้มเหลว
    // เพื่อคืนสถานะปุ่มให้กดได้อีกครั้ง
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
  flex-grow: 1; /* ทำให้ส่วนนี้ยืดขยายได้ */
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