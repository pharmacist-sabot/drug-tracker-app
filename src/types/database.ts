// Supabase Database schema types — auto-generated style, kept in sync manually.

// ─────────────────────────────────────────────
// Database schema definition
// ─────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      import_batches: {
        Row: {
          id: number;
          file_name: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          file_name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          file_name?: string;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: number;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string;
        };
      };
      drugs: {
        Row: {
          id: number;
          name: string;
          form: string | null;
          strength: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          form?: string | null;
          strength?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          form?: string | null;
          strength?: string | null;
          created_at?: string;
        };
      };
      purchase_orders: {
        Row: {
          id: number;
          import_batch_id: number;
          supplier_id: number;
          drug_id: number;
          packaging: string | null;
          quantity: number;
          unit_count: string;
          price_per_unit: number;
          total_price: number;
          status: PurchaseOrderStatus;
          order_date: string | null;
          received_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          import_batch_id: number;
          supplier_id: number;
          drug_id: number;
          packaging?: string | null;
          quantity: number;
          unit_count: string;
          price_per_unit: number;
          total_price: number;
          status?: PurchaseOrderStatus;
          order_date?: string | null;
          received_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          import_batch_id?: number;
          supplier_id?: number;
          drug_id?: number;
          packaging?: string | null;
          quantity?: number;
          unit_count?: string;
          price_per_unit?: number;
          total_price?: number;
          status?: PurchaseOrderStatus;
          order_date?: string | null;
          received_date?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      purchase_order_status: PurchaseOrderStatus;
    };
  };
};

// ─────────────────────────────────────────────
// Domain enums & union types
// ─────────────────────────────────────────────

export type PurchaseOrderStatus = 'ต้องสั่งซื้อ' | 'สั่งแล้ว' | 'รับของแล้ว';

// ─────────────────────────────────────────────
// Row shorthand aliases
// ─────────────────────────────────────────────

export type ImportBatchRow = Database['public']['Tables']['import_batches']['Row'];
export type SupplierRow = Database['public']['Tables']['suppliers']['Row'];
export type DrugRow = Database['public']['Tables']['drugs']['Row'];
export type PurchaseOrderRow = Database['public']['Tables']['purchase_orders']['Row'];

export type ImportBatchInsert = Database['public']['Tables']['import_batches']['Insert'];
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
export type DrugInsert = Database['public']['Tables']['drugs']['Insert'];
export type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];

export type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update'];

// ─────────────────────────────────────────────
// Joined / hydrated query result types
// ─────────────────────────────────────────────

/** Full purchase order with nested drug and supplier data (Supabase `select … drugs(*), suppliers(*)`) */
export type PurchaseOrderWithRelations =
  Pick<PurchaseOrderRow, 'id' | 'packaging' | 'quantity' | 'unit_count' | 'price_per_unit' | 'total_price' | 'status' | 'order_date' | 'received_date'>
  & {
    import_batch_id?: number;
    created_at?: string;
    drugs: DrugRow;
    suppliers: SupplierRow;
  };

// ─────────────────────────────────────────────
// View-specific partial query result types
// (each view only SELECTs certain columns)
// ─────────────────────────────────────────────

/** OrderView query: id, quantity, unit_count, price_per_unit, total_price, packaging, drugs(*), suppliers(*) */
export type OrderViewOrder =
  Pick<PurchaseOrderRow, 'id' | 'quantity' | 'unit_count' | 'price_per_unit' | 'total_price' | 'packaging'>
  & {
    drugs: DrugRow;
    suppliers: SupplierRow;
  };

/** ReceiveView query: id, order_date, packaging, drugs(*), suppliers(*) */
export type ReceiveViewOrder =
  Pick<PurchaseOrderRow, 'id' | 'order_date' | 'packaging'>
  & {
    drugs: DrugRow;
    suppliers: SupplierRow;
  };

/** HistoryView query: id, status, order_date, received_date, packaging, drugs(*), suppliers(*) */
export type HistoryViewOrder =
  Pick<PurchaseOrderRow, 'id' | 'status' | 'order_date' | 'received_date' | 'packaging'>
  & {
    drugs: DrugRow;
    suppliers: SupplierRow;
  };

/** Extended order used in the "Receive" view with local UI state */
export type ReceivableOrder = {
  received_date_input: string;
  isSaving: boolean;
} & ReceiveViewOrder;

// ─────────────────────────────────────────────
// Grouped orders (used in OrderSummaryModal)
// ─────────────────────────────────────────────

export type SupplierOrderGroup = {
  orders: OrderViewOrder[];
};

export type GroupedOrders = Record<string, SupplierOrderGroup>;

// ─────────────────────────────────────────────
// Notification store payload
// ─────────────────────────────────────────────

export type NotificationType = 'success' | 'error';

export type NotificationPayload = {
  message: string;
  type?: NotificationType;
};

// ─────────────────────────────────────────────
// CSV import types
// ─────────────────────────────────────────────

export type CsvHeaderMapping = {
  readonly supplier: string;
  readonly drugName: string;
  readonly form: string;
  readonly strength: string;
  readonly quantity: string;
  readonly unitCount: string;
  readonly packaging: string;
  readonly pricePerUnit: string;
  readonly totalPrice: string;
};

export type CsvRow = {
  [header: string]: string | undefined;
};

export type ImportResult = {
  success: boolean;
  message: string;
  errors?: string[];
};

// ─────────────────────────────────────────────
// Add-order form shape
// ─────────────────────────────────────────────

export type AddOrderFormData = {
  drugName: string;
  form: string;
  strength: string;
  supplierName: string;
  quantity: number;
  unitCount: string;
  pricePerUnit: number;
};
