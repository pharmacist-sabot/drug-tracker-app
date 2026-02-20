<!-- src/views/OrderView.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import type { GroupedOrders, OrderViewOrder } from '@/types/database';

import AddOrderForm from '@/components/AddOrderForm.vue';
import OrderSummaryModal from '@/components/OrderSummaryModal.vue';
import { useNotificationStore } from '@/stores/notification';
import { supabase } from '@/supabase/client';

// ─────────────────────────────────────────────
// Stores
// ─────────────────────────────────────────────

const notificationStore = useNotificationStore();

// ─────────────────────────────────────────────
// Reactive state
// ─────────────────────────────────────────────

const orders = ref<OrderViewOrder[]>([]);
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const showAddForm = ref<boolean>(false);
const selectedOrderIds = ref<Set<number>>(new Set());
const isModalVisible = ref<boolean>(false);

// ─────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────

/** Whether every order in the list is currently selected. */
const isAllSelected = computed<boolean>(() => {
  return orders.value.length > 0 && selectedOrderIds.value.size === orders.value.length;
});

/**
 * Groups the currently selected orders by supplier name.
 * Used as the prop for `OrderSummaryModal`.
 */
const groupedSelectedOrders = computed<GroupedOrders>(() => {
  const grouped: GroupedOrders = {};

  const selected = orders.value.filter(o => selectedOrderIds.value.has(o.id));

  for (const order of selected) {
    const supplierName = order.suppliers.name;

    if (!grouped[supplierName]) {
      grouped[supplierName] = { orders: [] };
    }

    grouped[supplierName]!.orders.push(order);
  }

  return grouped;
});

// ─────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────

async function fetchOrdersToBuy(): Promise<void> {
  try {
    loading.value = true;
    error.value = null;

    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select('id, quantity, unit_count, price_per_unit, total_price, packaging, drugs (*), suppliers (*)')
      .eq('status', 'ต้องสั่งซื้อ')
      .order('created_at', { ascending: true });

    if (dbError)
      throw dbError;

    orders.value = (data ?? []) as unknown as OrderViewOrder[];
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    error.value = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${message}`;
  }
  finally {
    loading.value = false;
  }
}

// ─────────────────────────────────────────────
// Selection actions
// ─────────────────────────────────────────────

function toggleSelectAll(event: Event): void {
  const target = event.target as HTMLInputElement;

  if (target.checked) {
    selectedOrderIds.value = new Set(orders.value.map(o => o.id));
  }
  else {
    selectedOrderIds.value = new Set();
  }
}

function toggleSelection(id: number): void {
  const next = new Set(selectedOrderIds.value);

  if (next.has(id)) {
    next.delete(id);
  }
  else {
    next.add(id);
  }

  selectedOrderIds.value = next;
}

function openSummaryModal(): void {
  if (selectedOrderIds.value.size > 0) {
    isModalVisible.value = true;
  }
}

// ─────────────────────────────────────────────
// Event handlers from child components
// ─────────────────────────────────────────────

function handleOrderAdded(): void {
  showAddForm.value = false;
  notificationStore.showNotification({ message: 'เพิ่มรายการใหม่เรียบร้อย!', type: 'success' });
  fetchOrdersToBuy();
}

function handleOrdersSent(): void {
  isModalVisible.value = false;
  selectedOrderIds.value = new Set();
  notificationStore.showNotification({ message: 'ส่งคำสั่งซื้อสำเร็จ!', type: 'success' });
  fetchOrdersToBuy();
}

// ─────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────

onMounted(fetchOrdersToBuy);
</script>

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
      <button class="btn btn-secondary" @click="showAddForm = !showAddForm">
        {{ showAddForm ? 'ซ่อนฟอร์ม' : '+ เพิ่มรายการด้วยตนเอง' }}
      </button>
    </div>
    <AddOrderForm v-if="showAddForm" @close="showAddForm = false" @order-added="handleOrderAdded" />

    <!-- Section: แสดงสถานะต่างๆ -->
    <div v-if="loading" class="loading-state">
      กำลังโหลดข้อมูล...
    </div>
    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>
    <div v-else-if="orders.length === 0" class="empty-state">
      ไม่มีรายการที่ต้องสั่งซื้อในขณะนี้ 🎉
    </div>

    <!-- Section: ตารางแสดงรายการยาที่ต้องสั่งซื้อ -->
    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th class="checkbox-col">
              <input type="checkbox" :checked="isAllSelected" title="เลือกทั้งหมด" @change="toggleSelectAll">
            </th>
            <th>ชื่อยา</th>
            <th>บริษัท</th>
            <th>จำนวน</th>
            <th>ราคารวม</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id" :class="{ 'selected-row': selectedOrderIds.has(order.id) }">
            <td class="checkbox-col">
              <input type="checkbox" :checked="selectedOrderIds.has(order.id)" @change="toggleSelection(order.id)">
            </td>
            <td>
              <div class="drug-name">
                {{ order.drugs.name }}
              </div>
              <div class="drug-detail">
                {{ order.drugs.form }} {{ order.drugs.strength }}
                <span v-if="order.packaging">({{ order.packaging }})</span>
              </div>
            </td>
            <td>{{ order.suppliers.name }}</td>
            <td>{{ order.quantity }} x {{ order.unit_count }}</td>
            <td>{{ (order.total_price ?? 0).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Section: แถบ Floating Action Bar ที่จะแสดงเมื่อมีการเลือกรายการ -->
    <div class="floating-bar" :class="{ visible: selectedOrderIds.size > 0 }">
      <span>เลือกแล้ว {{ selectedOrderIds.size }} รายการ</span>
      <button class="btn btn-primary" :disabled="selectedOrderIds.size === 0" @click="openSummaryModal">
        สร้างใบสั่งซื้อ
      </button>
    </div>

    <!-- Section: Modal สรุปรายการสั่งซื้อ (แสดงเมื่อ isModalVisible เป็น true) -->
    <OrderSummaryModal v-if="isModalVisible" :grouped-orders="groupedSelectedOrders" @close="isModalVisible = false"
      @orders-sent="handleOrdersSent" />
  </div>
</template>

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
