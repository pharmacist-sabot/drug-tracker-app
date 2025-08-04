<!-- src/views/ImportView.vue -->
<template>
  <div class="import-container">
    <h1>นำเข้าไฟล์จัดซื้อ (.csv)</h1>
    <p class="subtitle">เลือกไฟล์ CSV ที่มีข้อมูลการสั่งซื้อยาตามรูปแบบที่กำหนด</p>

    <!-- กล่องสำหรับอัปโหลดไฟล์ -->
    <div class="upload-box">
      <!-- 
        นี่คือเทคนิคการทำปุ่มอัปโหลดให้สวยงาม:
        1. เราสร้าง <label> ที่หน้าตาสวยงาม (class="upload-button")
        2. เราซ่อน <input type="file"> ของจริงที่หน้าตาไม่สวยทิ้งไป
        3. เมื่อผู้ใช้คลิก <label>, attribute 'for="file-upload"' จะไปสั่งให้ <input> ที่มี id="file-upload" ทำงาน
      -->
      <label for="file-upload" class="upload-button" :class="{ disabled: isLoading }">
        เลือกไฟล์
      </label>

      <!-- ส่วนที่ใช้แสดงชื่อไฟล์ที่ผู้ใช้เลือก -->
      <span class="file-name">{{ selectedFileName || 'ยังไม่ได้เลือกไฟล์' }}</span>

      <!-- ปุ่ม input สำหรับเลือกไฟล์จริงๆ ที่ถูกซ่อนไว้ -->
      <input
        id="file-upload"
        type="file"
        @change="handleFileUpload"
        accept=".csv"
        :disabled="isLoading"
      />
    </div>

    <!-- ส่วนที่จะแสดงขึ้นมา "เฉพาะตอนที่กำลังประมวลผล" (v-if="isLoading") -->
    <div v-if="isLoading" class="progress-section">
      <div class="spinner"></div>
      <p class="progress-message">{{ progressMessage }}</p>
    </div>

    <!-- ส่วนที่จะแสดง "ผลลัพธ์" หลังจากการนำเข้าเสร็จสิ้น (v-if="importResult") -->
    <div
      v-if="importResult"
      class="result-message"
      :class="importResult.success ? 'success' : 'error'"
    >
      <span>{{ importResult.message }}</span>
      <!-- แสดงรายการข้อผิดพลาดเล็กๆ น้อยๆ (ถ้ามี) -->
      <ul v-if="importResult.errors && importResult.errors.length > 0">
        <li v-for="(err, index) in importResult.errors" :key="index">{{ err }}</li>
      </ul>
    </div>
  </div>
</template>

<!-- ======================================================= -->
<!-- ส่วนที่ 2: สมองของหน้า (Script / JavaScript Logic) -->
<!-- ======================================================= -->
<script setup>
// --- Imports: นำเครื่องมือที่จำเป็นเข้ามาใช้งาน ---
import { ref } from 'vue' // 'ref' ใช้สร้างตัวแปรที่ Vue สามารถติดตามการเปลี่ยนแปลงได้
import Papa from 'papaparse' // 'Papa' คือไลบรารีสำหรับอ่านไฟล์ CSV ที่เก่งที่สุด
import { supabase } from '../supabase/client' // ตัวเชื่อมต่อ Supabase ที่เราสร้างไว้

// --- State Variables: ตัวแปรสำหรับเก็บสถานะต่างๆ ของหน้า ---
const isLoading = ref(false) // เก็บสถานะว่ากำลังโหลดอยู่หรือไม่ (true/false)
const progressMessage = ref('') // ข้อความที่แสดงตอนกำลังโหลด
const importResult = ref(null) // เก็บผลลัพธ์หลังการนำเข้า (สำเร็จ หรือ ล้มเหลว)
const selectedFileName = ref('') // เก็บชื่อไฟล์ที่ผู้ใช้เลือกมาแสดงผล

// ★★★ หัวใจของความยืดหยุ่น: ตัวแปลหัวตาราง (Mapping Object) ★★★
// ถ้าในอนาคตไฟล์ CSV เปลี่ยนชื่อคอลัมน์ เช่น จาก 'ชื่อยา' เป็น 'drug_name'
// เราก็แค่มาแก้ที่นี่ที่เดียว โดยไม่ต้องไปยุ่งกับโค้ดส่วนอื่นเลย
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

// --- Functions: การทำงานต่างๆ ---

/**
 * ฟังก์ชันนี้จะทำงานเมื่อผู้ใช้เลือกไฟล์เสร็จสิ้น
 * @param {Event} event - ข้อมูลของ event ที่เกิดขึ้น (มีไฟล์แนบมาด้วย)
 */
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  selectedFileName.value = file ? file.name : '' // อัปเดตชื่อไฟล์เพื่อแสดงผล

  if (!file) return // ถ้าผู้ใช้กด cancel ก็ไม่ต้องทำอะไรต่อ

  // รีเซ็ตสถานะต่างๆ เริ่มกระบวนการใหม่
  isLoading.value = true
  importResult.value = null
  progressMessage.value = 'กำลังอ่านและตรวจสอบไฟล์...'

  // ใช้ Papaparse เพื่ออ่านไฟล์ CSV
  Papa.parse(file, {
    header: true, // บอกให้รู้ว่าแถวแรกเป็น Header
    skipEmptyLines: true, // ข้ามแถวที่ว่างๆ ไป
    complete: (results) => {
      // เมื่ออ่านเสร็จสมบูรณ์...
      progressMessage.value = 'ตรวจสอบไฟล์สำเร็จ! เริ่มนำเข้าข้อมูลสู่ฐานข้อมูล...'
      processData(results.data, file.name) // เรียกใช้ฟังก์ชันประมวลผลหลัก
    },
    error: (error) => {
      // หากเกิดข้อผิดพลาดในการอ่านไฟล์...
      isLoading.value = false
      importResult.value = {
        success: false,
        message: `เกิดข้อผิดพลาดในการอ่านไฟล์: ${error.message}`,
      }
    },
  })
}

/**
 * ฟังก์ชันหลักในการประมวลผลข้อมูลและส่งไปยัง Supabase
 * @param {Array} data - ข้อมูลทั้งหมดที่อ่านได้จาก CSV (เป็น Array of Objects)
 * @param {string} fileName - ชื่อไฟล์ที่นำเข้ามา
 */
const processData = async (data, fileName) => {
  const errors = [] // สร้าง Array ไว้เก็บข้อผิดพลาดเล็กๆ น้อยๆ ระหว่างทาง

  try {
    // ขั้นตอนที่ 1: สร้าง "รอบการนำเข้า" (Batch) เพื่อใช้อ้างอิง
    const { data: batchData, error: batchError } = await supabase
      .from('import_batches')
      .insert({ file_name: fileName })
      .select()
      .single()
    if (batchError) throw batchError // ถ้าพลาดตรงนี้ ให้โยน Error ออกไปเลย

    // ขั้นตอนที่ 2: วนลูปข้อมูล (row) ทีละแถวเพื่อนำเข้า
    for (const [index, row] of data.entries()) {
      progressMessage.value = `กำลังประมวลผลรายการที่ ${index + 1} จาก ${data.length}`

      // ดึงข้อมูลจาก row โดยใช้ "ตัวแปล" ที่เราสร้างไว้
      const supplierName = row[csvHeaderMapping.supplier]
      const drugName = row[csvHeaderMapping.drugName]

      // ตรวจสอบข้อมูลสำคัญ: ถ้าไม่มีชื่อยาหรือชื่อบริษัท ให้ข้ามแถวนั้นไป
      if (!supplierName || !drugName) {
        errors.push(`ข้ามแถวที่ ${index + 2} ในไฟล์ CSV: ไม่มีข้อมูลชื่อยาหรือบริษัท`)
        continue // `continue` คือการข้ามไปทำงานลูปถัดไปทันที
      }

      // ขั้นตอนย่อย 2.1: จัดการข้อมูลบริษัท (Supplier)
      // .upsert() หมายถึง: ถ้ามีชื่อนี้อยู่แล้วให้ใช้ของเดิม, ถ้ายังไม่มีให้สร้างใหม่
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .upsert({ name: supplierName }, { onConflict: 'name' })
        .select()
        .single()
      if (supplierError) throw supplierError

      // ขั้นตอนย่อย 2.2: จัดการข้อมูลยา (Drug)
      const { data: drugData, error: drugError } = await supabase
        .from('drugs')
        .upsert(
          {
            name: drugName,
            form: row[csvHeaderMapping.form] || null, // ถ้าไม่มีค่าให้ใส่เป็น null
            strength: row[csvHeaderMapping.strength] || null,
          },
          { onConflict: 'name,form,strength' },
        )
        .select()
        .single()
      if (drugError) throw drugError

      // ขั้นตอนย่อย 2.3: สร้างรายการสั่งซื้อ (Purchase Order)
      const purchaseOrder = {
        import_batch_id: batchData.id,
        supplier_id: supplierData.id,
        drug_id: drugData.id,
        // แปลงค่าที่เป็นตัวเลข และจัดการกับ comma (,)
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

    // เมื่อทุกอย่างเสร็จสิ้นสมบูรณ์ (ไม่มี Error ใหญ่)
    isLoading.value = false
    importResult.value = {
      success: true,
      message: `นำเข้าข้อมูลจำนวน ${data.length - errors.length} รายการสำเร็จ!`,
      errors: errors, // แสดงข้อผิดพลาดเล็กๆ น้อยๆ ที่เก็บไว้
    }
  } catch (error) {
    // หากเกิด Error ใหญ่ใน `try` block
    isLoading.value = false
    importResult.value = {
      success: false,
      message: `หยุดการนำเข้า! เกิดข้อผิดพลาดร้ายแรง: ${error.message}`,
      errors: errors,
    }
  }
}
</script>

<!-- ======================================================= -->
<!-- ส่วนที่ 3: หน้าตาและสไตล์ (Style / CSS) -->
<!-- ======================================================= -->
<style scoped>
.import-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}
.import-container h1 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}
.subtitle {
  text-align: center;
  color: #6c757d;
  margin-bottom: 2rem;
}

.upload-box {
  border: 2px dashed #007bff;
  border-radius: 8px;
  padding: 2.5rem;
  background-color: #f8f9fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem; /* ระยะห่างระหว่างปุ่มกับชื่อไฟล์ */
}

/* ซ่อน input ของจริง */
input[type='file'] {
  display: none;
}

/* สไตล์ของปุ่มหลอกที่เราสร้างขึ้น */
.upload-button {
  display: inline-block;
  background-color: #007bff;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.upload-button:hover {
  background-color: #0056b3;
}

.upload-button.disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}

/* สไตล์ของข้อความที่แสดงชื่อไฟล์ */
.file-name {
  color: #495057;
  font-style: italic;
  font-size: 0.9rem;
}

/* สไตล์ของส่วนที่แสดงตอนกำลังโหลด */
.progress-section {
  margin-top: 2rem;
  text-align: center;
}
.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* สไตล์ของกล่องข้อความแสดงผลลัพธ์ */
.result-message {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 5px;
  border: 1px solid transparent;
}
.result-message.success {
  background-color: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}
.result-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}
.result-message ul {
  margin-top: 0.5rem;
  padding-left: 1.5rem;
  font-size: 0.9rem;
}
</style>
