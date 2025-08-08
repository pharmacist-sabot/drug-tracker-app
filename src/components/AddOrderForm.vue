<!-- src/components/AddOrderForm.vue -->
<template>
  <div class="card add-form-card">
    <h3>เพิ่มรายการสั่งซื้อด้วยตนเอง</h3>
    <form @submit.prevent="handleSubmit">
      <div class="form-grid">
        <div class="form-group">
          <label for="drugName">ชื่อยา</label>
          <input id="drugName" v-model="form.drugName" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label for="supplierName">บริษัท</label>
          <input id="supplierName" v-model="form.supplierName" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label for="form">รูปแบบยา</label>
          <input id="form" v-model="form.form" type="text" class="form-input" placeholder="เช่น Tablet, Capsule" />
        </div>
        <div class="form-group">
          <label for="strength">ความแรง</label>
          <input id="strength" v-model="form.strength" type="text" class="form-input" placeholder="เช่น 500 mg" />
        </div>
        <div class="form-group">
          <label for="quantity">จำนวน</label>
          <input id="quantity" v-model.number="form.quantity" type="number" class="form-input" required />
        </div>
        <div class="form-group">
          <label for="unitCount">หน่วยนับ</label>
          <input id="unitCount" v-model="form.unitCount" type="text" class="form-input" required placeholder="เช่น กล่อง, ขวด"/>
        </div>
        <div class="form-group">
          <label for="pricePerUnit">ราคาต่อหน่วย</label>
          <input id="pricePerUnit" v-model.number="form.pricePerUnit" type="number" step="0.01" class="form-input" required />
        </div>
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div class="button-container">
        <button type="button" @click="$emit('close')" class="btn btn-secondary">ยกเลิก</button>
        <button type="submit" class="btn btn-primary" :disabled="isLoading">
          {{ isLoading ? 'กำลังบันทึก...' : 'เพิ่มรายการ' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { supabase } from '../supabase/client'

const emit = defineEmits(['close', 'order-added'])

const form = reactive({
  drugName: '',
  form: '',
  strength: '',
  supplierName: '',
  quantity: 1,
  unitCount: '',
  pricePerUnit: 0,
})

const isLoading = ref(false)
const error = ref(null)

const handleSubmit = async () => {
  isLoading.value = true
  error.value = null

  try {
    // 1. Upsert Supplier (สร้างถ้ายังไม่มี, ใช้ที่มีอยู่ถ้าซ้ำ)
    const { data: supplierData, error: supplierError } = await supabase
      .from('suppliers')
      .upsert({ name: form.supplierName.trim() }, { onConflict: 'name' })
      .select()
      .single()
    if (supplierError) throw supplierError

    // 2. Upsert Drug
    const { data: drugData, error: drugError } = await supabase
      .from('drugs')
      .upsert(
        {
          name: form.drugName.trim(),
          form: form.form.trim() || null,
          strength: form.strength.trim() || null,
        },
        { onConflict: 'name,form,strength' }
      )
      .select()
      .single()
    if (drugError) throw drugError

    // 3. Insert Purchase Order
    const purchaseOrder = {
      supplier_id: supplierData.id,
      drug_id: drugData.id,
      quantity: form.quantity,
      unit_count: form.unitCount.trim(),
      price_per_unit: form.pricePerUnit,
      total_price: form.quantity * form.pricePerUnit,
      status: 'ต้องสั่งซื้อ',
    }
    const { error: orderError } = await supabase.from('purchase_orders').insert(purchaseOrder)
    if (orderError) throw orderError

    // 4. แจ้ง Parent Component ว่าเพิ่มสำเร็จ
    emit('order-added')
    emit('close')

  } catch (err) {
    error.value = `เกิดข้อผิดพลาด: ${err.message}`
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.add-form-card {
  margin-bottom: 2rem;
  border: 1px solid var(--primary-color);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}
.error-message {
  color: var(--status-pending-bg);
  margin-bottom: 1rem;
  text-align: center;
}
.button-container {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}
</style>