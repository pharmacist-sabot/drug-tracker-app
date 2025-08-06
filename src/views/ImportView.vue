<!-- src/views/ImportView.vue -->
<template>
  <div class="page-container">
    <header class="page-header" style="text-align: center; margin: 0 auto">
      <h1>นำเข้าไฟล์จัดซื้อ (.csv)</h1>
      <p class="subtitle" style="margin: 0 auto 2rem">
        เลือกไฟล์ CSV ที่มีข้อมูลการสั่งซื้อยาตามรูปแบบที่กำหนด เพื่อนำเข้าสู่ระบบ
      </p>
    </header>

    <div class="card import-card">
      <div
        class="upload-box"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        :class="{ 'is-dragging': isDragging }"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="upload-icon"
        >
          <path
            d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.4-3.4-4-6.2-3.3-1.4.3-2.5 1.1-3.2 2.1-.8-1.4-2.8-2.2-4.6-1.6-2.5.8-3.9 3.2-3.3 5.8.5 2 2.1 3.4 4.1 3.9M12 12v9"
          />
          <path d="m16 16-4-4-4 4" />
        </svg>
        <p class="upload-text">ลากไฟล์มาวางที่นี่ หรือ</p>
        <label for="file-upload" class="btn btn-secondary" :class="{ disabled: isLoading }">
          เลือกไฟล์จากเครื่อง
        </label>
        <span class="file-name">{{ selectedFileName || 'ยังไม่ได้เลือกไฟล์' }}</span>
        <input
          id="file-upload"
          type="file"
          @change="handleFileUpload"
          accept=".csv"
          :disabled="isLoading"
        />
      </div>

      <div v-if="isLoading" class="progress-section">
        <div class="spinner"></div>
        <p class="progress-message">{{ progressMessage }}</p>
      </div>

      <div
        v-if="importResult"
        class="result-message"
        :class="importResult.success ? 'success' : 'error'"
      >
        <span>{{ importResult.message }}</span>
        <ul v-if="importResult.errors && importResult.errors.length > 0">
          <li v-for="(err, index) in importResult.errors" :key="index">{{ err }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
// ... (script section remains unchanged)
import { ref } from 'vue'
import Papa from 'papaparse'
import { supabase } from '../supabase/client'

const isLoading = ref(false)
const progressMessage = ref('')
const importResult = ref(null)
const selectedFileName = ref('')
const isDragging = ref(false)

const csvHeaderMapping = {
  supplier: 'บริษัทที่จัดซื้อ',
  drugName: 'ชื่อยา',
  form: 'รูปแบบยา',
  strength: 'ความแรง',
  quantity: 'ปริมาณที่ต้องจัดซื้อ',
  unitCount: 'หน่วยนับ',
  pricePerUnit: 'ราคา',
  totalPrice: 'ราคารวม',
}

const parseAndProcessFile = (file) => {
  if (!file) {
    isDragging.value = false
    return
  }
  selectedFileName.value = file.name

  isLoading.value = true
  importResult.value = null
  progressMessage.value = 'กำลังอ่านและตรวจสอบไฟล์...'

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      progressMessage.value = 'ตรวจสอบไฟล์สำเร็จ! เริ่มนำเข้าข้อมูลสู่ฐานข้อมูล...'
      processData(results.data, file.name)
    },
    error: (error) => {
      isLoading.value = false
      importResult.value = {
        success: false,
        message: `เกิดข้อผิดพลาดในการอ่านไฟล์: ${error.message}`,
      }
    },
  })
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  parseAndProcessFile(file)
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type === 'text/csv') {
    parseAndProcessFile(file)
  }
}

const processData = async (data, fileName) => {
  const errors = []

  try {
    const { data: batchData, error: batchError } = await supabase
      .from('import_batches')
      .insert({ file_name: fileName })
      .select()
      .single()
    if (batchError) throw batchError

    for (const [index, row] of data.entries()) {
      progressMessage.value = `กำลังประมวลผลรายการที่ ${index + 1} จาก ${data.length}`

      const supplierName = row[csvHeaderMapping.supplier]
      const drugName = row[csvHeaderMapping.drugName]

      if (!supplierName || !drugName) {
        errors.push(`ข้ามแถวที่ ${index + 2} ในไฟล์ CSV: ไม่มีข้อมูลชื่อยาหรือบริษัท`)
        continue
      }

      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .upsert({ name: supplierName }, { onConflict: 'name' })
        .select()
        .single()
      if (supplierError) throw supplierError

      const { data: drugData, error: drugError } = await supabase
        .from('drugs')
        .upsert(
          {
            name: drugName,
            form: row[csvHeaderMapping.form] || null,
            strength: row[csvHeaderMapping.strength] || null,
          },
          { onConflict: 'name,form,strength' },
        )
        .select()
        .single()
      if (drugError) throw drugError

      const purchaseOrder = {
        import_batch_id: batchData.id,
        supplier_id: supplierData.id,
        drug_id: drugData.id,
        quantity: parseFloat(String(row[csvHeaderMapping.quantity] || '0').replace(/,/g, '')),
        unit_count: row[csvHeaderMapping.unitCount],
        price_per_unit: parseFloat(
          String(row[csvHeaderMapping.pricePerUnit] || '0').replace(/,/g, ''),
        ),
        total_price: parseFloat(String(row[csvHeaderMapping.totalPrice] || '0').replace(/,/g, '')),
        status: 'ต้องสั่งซื้อ',
      }

      const { error: orderError } = await supabase.from('purchase_orders').insert(purchaseOrder)
      if (orderError) throw orderError
    }

    isLoading.value = false
    importResult.value = {
      success: true,
      message: `นำเข้าข้อมูลจำนวน ${data.length - errors.length} รายการสำเร็จ!`,
      errors: errors,
    }
  } catch (error) {
    isLoading.value = false
    importResult.value = {
      success: false,
      message: `หยุดการนำเข้า! เกิดข้อผิดพลาดร้ายแรง: ${error.message}`,
      errors: errors,
    }
  }
}
</script>

<style scoped>
.import-card {
  max-width: 700px;
  margin: 0 auto;
}

.upload-box {
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 2.5rem;
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  transition:
    border-color 0.3s,
    background-color 0.3s;
}
.upload-box.is-dragging {
  border-color: var(--primary-color);
  background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.upload-icon {
  color: var(--primary-color);
  margin-bottom: 0.5rem;
  transition: color 0.3s;
}

.upload-text {
  color: var(--subtle-text-color);
  margin: 0;
}

input[type='file'] {
  display: none;
}

.upload-button.disabled {
  background-color: var(--subtle-text-color);
  cursor: not-allowed;
}

.file-name {
  color: var(--subtle-text-color);
  font-size: 0.9rem;
  margin-top: 0.5rem;
  word-break: break-all;
}

.progress-section {
  margin-top: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.result-message {
  margin-top: 2rem;
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid transparent;
}
.result-message.success {
  background-color: color-mix(in srgb, var(--status-received-bg) 20%, transparent);
  color: var(--status-received-bg);
  border-color: var(--status-received-bg);
}
.result-message.error {
  background-color: color-mix(in srgb, var(--status-pending-bg) 20%, transparent);
  color: var(--status-pending-bg);
  border-color: var(--status-pending-bg);
}
.result-message ul {
  margin-top: 0.5rem;
  padding-left: 1.5rem;
  font-size: 0.9rem;
  color: var(--subtle-text-color);
}
</style>
