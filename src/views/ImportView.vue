<!-- src/views/ImportView.vue -->
<script setup lang="ts">
import Papa from 'papaparse';
import { ref } from 'vue';

import type {
  CsvHeaderMapping,
  CsvRow,
  ImportResult,
  PurchaseOrderInsert,
} from '@/types/database';

import { supabase } from '@/supabase/client';

// ─────────────────────────────────────────────
// Reactive state
// ─────────────────────────────────────────────

const isLoading = ref<boolean>(false);
const progressMessage = ref<string>('');
const importResult = ref<ImportResult | null>(null);
const selectedFileName = ref<string>('');
const isDragging = ref<boolean>(false);

// ─────────────────────────────────────────────
// CSV column name mapping (Thai headers)
// ─────────────────────────────────────────────

const csvHeaderMapping: CsvHeaderMapping = {
  supplier: 'บริษัทที่จัดซื้อ',
  drugName: 'ชื่อยา',
  form: 'รูปแบบยา',
  strength: 'ความแรง',
  quantity: 'ปริมาณที่ต้องจัดซื้อ',
  unitCount: 'หน่วยนับ',
  packaging: 'บรรจุภัณฑ์',
  pricePerUnit: 'ราคา (บาท)',
  totalPrice: 'ราคารวม',
} as const;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Parses a potentially comma-formatted numeric string into a float.
 * Returns `0` when the value is falsy or not a valid number.
 */
function parseNumeric(raw: string | undefined): number {
  if (!raw)
    return 0;
  const cleaned = String(raw).replace(/,/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ─────────────────────────────────────────────
// File handling
// ─────────────────────────────────────────────

/**
 * Central file ingestion — validates, parses CSV via PapaParse, then
 * calls `processData` to persist each row into Supabase.
 */
function parseAndProcessFile(file: File | undefined): void {
  if (!file) {
    isDragging.value = false;
    return;
  }

  selectedFileName.value = file.name;
  isLoading.value = true;
  importResult.value = null;
  progressMessage.value = 'กำลังอ่านและตรวจสอบไฟล์...';

  Papa.parse<CsvRow>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results: Papa.ParseResult<CsvRow>) => {
      progressMessage.value = 'ตรวจสอบไฟล์สำเร็จ! เริ่มนำเข้าข้อมูลสู่ฐานข้อมูล...';
      processData(results.data, file.name);
    },
    error: (parseError: Error) => {
      isLoading.value = false;
      importResult.value = {
        success: false,
        message: `เกิดข้อผิดพลาดในการอ่านไฟล์: ${parseError.message}`,
      };
    },
  });
}

function handleFileUpload(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file: File | undefined = target.files?.[0];
  parseAndProcessFile(file);
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false;
  const file: File | undefined = event.dataTransfer?.files[0];
  if (file && file.type === 'text/csv') {
    parseAndProcessFile(file);
  }
}

// ─────────────────────────────────────────────
// Data processing & Supabase persistence
// ─────────────────────────────────────────────

async function processData(data: CsvRow[], fileName: string): Promise<void> {
  const errors: string[] = [];

  try {
    // 1. Create an import batch record
    const { data: batchData, error: batchError } = await supabase
      .from('import_batches')
      .insert({ file_name: fileName })
      .select()
      .single();

    if (batchError)
      throw batchError;
    if (!batchData)
      throw new Error('ไม่สามารถสร้าง batch ได้');

    const totalRows = data.length;

    for (const [index, row] of data.entries()) {
      progressMessage.value = `กำลังประมวลผลรายการที่ ${index + 1} จาก ${totalRows}`;

      const supplierName: string | undefined = row[csvHeaderMapping.supplier];
      const drugName: string | undefined = row[csvHeaderMapping.drugName];

      // Validate required fields — skip row if missing
      if (!supplierName || !drugName) {
        errors.push(`ข้ามแถวที่ ${index + 2} ในไฟล์ CSV: ไม่มีข้อมูลชื่อยาหรือบริษัท`);
        continue;
      }

      // 2. Upsert supplier
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .upsert({ name: supplierName }, { onConflict: 'name' })
        .select()
        .single();

      if (supplierError)
        throw supplierError;
      if (!supplierData)
        throw new Error(`ไม่สามารถสร้างข้อมูลบริษัท: ${supplierName}`);

      // 3. Upsert drug
      const drugForm: string | null = row[csvHeaderMapping.form] || null;
      const drugStrength: string | null = row[csvHeaderMapping.strength] || null;

      const { data: drugData, error: drugError } = await supabase
        .from('drugs')
        .upsert(
          {
            name: drugName,
            form: drugForm,
            strength: drugStrength,
          },
          { onConflict: 'name,form,strength' },
        )
        .select()
        .single();

      if (drugError)
        throw drugError;
      if (!drugData)
        throw new Error(`ไม่สามารถสร้างข้อมูลยา: ${drugName}`);

      // 4. Build and insert the purchase order
      const quantity = parseNumeric(row[csvHeaderMapping.quantity]);
      const pricePerUnit = parseNumeric(row[csvHeaderMapping.pricePerUnit]);
      const totalPrice = parseNumeric(row[csvHeaderMapping.totalPrice]);

      const purchaseOrder: PurchaseOrderInsert = {
        import_batch_id: batchData.id,
        supplier_id: supplierData.id,
        drug_id: drugData.id,
        packaging: row[csvHeaderMapping.packaging] || null,
        quantity,
        unit_count: row[csvHeaderMapping.unitCount] ?? '',
        price_per_unit: pricePerUnit,
        total_price: totalPrice,
        status: 'ต้องสั่งซื้อ',
      };

      const { error: orderError } = await supabase
        .from('purchase_orders')
        .insert(purchaseOrder);

      if (orderError)
        throw orderError;
    }

    // All rows processed successfully
    isLoading.value = false;
    importResult.value = {
      success: true,
      message: `นำเข้าข้อมูลจำนวน ${totalRows - errors.length} รายการสำเร็จ!`,
      errors,
    };
  }
  catch (err: unknown) {
    isLoading.value = false;
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    importResult.value = {
      success: false,
      message: `หยุดการนำเข้า! เกิดข้อผิดพลาดร้ายแรง: ${message}`,
      errors,
    };
  }
}
</script>

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
        class="upload-box" :class="{ 'is-dragging': isDragging }" @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop"
      >
        <svg
          viewBox="0 0 1024 1024" class="upload-icon" version="1.1" xmlns="http://www.w3.org/2000/svg"
          fill="#000000"
        >
          <g id="SVGRepo_bgCarrier" stroke-width="0" />
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" />
          <g id="SVGRepo_iconCarrier">
            <path
              d="M736.68 435.86a173.773 173.773 0 0 1 172.042 172.038c0.578 44.907-18.093 87.822-48.461 119.698-32.761 34.387-76.991 51.744-123.581 52.343-68.202 0.876-68.284 106.718 0 105.841 152.654-1.964 275.918-125.229 277.883-277.883 1.964-152.664-128.188-275.956-277.883-277.879-68.284-0.878-68.202 104.965 0 105.842zM285.262 779.307A173.773 173.773 0 0 1 113.22 607.266c-0.577-44.909 18.09-87.823 48.461-119.705 32.759-34.386 76.988-51.737 123.58-52.337 68.2-0.877 68.284-106.721 0-105.842C132.605 331.344 9.341 454.607 7.379 607.266 5.417 759.929 135.565 883.225 285.262 885.148c68.284 0.876 68.2-104.965 0-105.841z"
              fill="#4A5699"
            />
            <path
              d="M339.68 384.204a173.762 173.762 0 0 1 172.037-172.038c44.908-0.577 87.822 18.092 119.698 48.462 34.388 32.759 51.743 76.985 52.343 123.576 0.877 68.199 106.72 68.284 105.843 0-1.964-152.653-125.231-275.917-277.884-277.879-152.664-1.962-275.954 128.182-277.878 277.879-0.88 68.284 104.964 68.199 105.841 0z"
              fill="#C45FA0"
            />
            <path
              d="M545.039 473.078c16.542 16.542 16.542 43.356 0 59.896l-122.89 122.895c-16.542 16.538-43.357 16.538-59.896 0-16.542-16.546-16.542-43.362 0-59.899l122.892-122.892c16.537-16.542 43.355-16.542 59.894 0z"
              fill="#F39A2B"
            />
            <path
              d="M485.17 473.078c16.537-16.539 43.354-16.539 59.892 0l122.896 122.896c16.538 16.533 16.538 43.354 0 59.896-16.541 16.538-43.361 16.538-59.898 0L485.17 532.979c-16.547-16.543-16.547-43.359 0-59.901z"
              fill="#F39A2B"
            />
            <path
              d="M514.045 634.097c23.972 0 43.402 19.433 43.402 43.399v178.086c0 23.968-19.432 43.398-43.402 43.398-23.964 0-43.396-19.432-43.396-43.398V677.496c0.001-23.968 19.433-43.399 43.396-43.399z"
              fill="#E5594F"
            />
          </g>
        </svg>
        <p class="upload-text">
          ลากไฟล์มาวางที่นี่ หรือ
        </p>
        <label for="file-upload" class="btn btn-secondary" :class="{ disabled: isLoading }">
          เลือกไฟล์จากเครื่อง
        </label>
        <span class="file-name">{{ selectedFileName || 'ยังไม่ได้เลือกไฟล์' }}</span>
        <input id="file-upload" type="file" accept=".csv" :disabled="isLoading" @change="handleFileUpload">
      </div>

      <div v-if="isLoading" class="progress-section">
        <div class="spinner" />
        <p class="progress-message">
          {{ progressMessage }}
        </p>
      </div>

      <div v-if="importResult" class="result-message" :class="importResult.success ? 'success' : 'error'">
        <span>{{ importResult.message }}</span>
        <ul v-if="importResult.errors && importResult.errors.length > 0">
          <li v-for="(err, index) in importResult.errors" :key="index">
            {{ err }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

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
  width: 80px;
  height: 80px;
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
