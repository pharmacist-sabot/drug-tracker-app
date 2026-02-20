<!-- src/views/HistoryView.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import type { HistoryViewOrder, PurchaseOrderStatus } from '@/types/database';

import { supabase } from '@/supabase/client';
import { formatDate } from '@/utils/date';

// ─────────────────────────────────────────────
// Reactive state
// ─────────────────────────────────────────────

const allOrders = ref<HistoryViewOrder[]>([]);
const searchTerm = ref<string>('');
const loading = ref<boolean>(true);
const error = ref<string | null>(null);

// ─────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────

/**
 * Filters orders by the search term against the drug name (case-insensitive).
 * Returns all orders when the search term is empty.
 */
const filteredOrders = computed<HistoryViewOrder[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();

  if (!term) {
    return allOrders.value;
  }

  return allOrders.value.filter(order =>
    order.drugs.name.toLowerCase().includes(term),
  );
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Maps a purchase order status to a CSS class for the status badge.
 */
function getStatusClass(status: PurchaseOrderStatus): string {
  switch (status) {
    case 'รับของแล้ว':
      return 'status-received';
    case 'สั่งแล้ว':
      return 'status-ordered';
    case 'ต้องสั่งซื้อ':
    default:
      return 'status-pending';
  }
}

// ─────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────

async function fetchHistory(): Promise<void> {
  try {
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .select('id, status, order_date, received_date, packaging, drugs (*), suppliers (*)')
      .order('created_at', { ascending: false });

    if (dbError)
      throw dbError;

    allOrders.value = (data ?? []) as unknown as HistoryViewOrder[];
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
// Lifecycle
// ─────────────────────────────────────────────

onMounted(fetchHistory);
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <h1>ประวัติการสั่งซื้อทั้งหมด</h1>
      <p class="subtitle">
        ดูและค้นหารายการสั่งซื้อที่ผ่านมาทั้งหมดในระบบ
      </p>
    </header>

    <div class="card">
      <div class="controls">
        <input v-model="searchTerm" type="text" placeholder="ค้นหาตามชื่อยา..." class="form-input search-input">
      </div>

      <div v-if="loading" class="loading-state">
        กำลังโหลดข้อมูล...
      </div>
      <div v-else-if="error" class="error-state">
        {{ error }}
      </div>

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
                <div class="drug-name">
                  {{ order.drugs.name }}
                </div>
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
        <div v-if="filteredOrders.length === 0" class="empty-state empty-state--flat">
          ไม่พบข้อมูลที่ตรงกับการค้นหา
        </div>
      </div>
    </div>
  </div>
</template>

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

.empty-state--flat {
  box-shadow: none;
  padding: 2rem;
}
</style>
