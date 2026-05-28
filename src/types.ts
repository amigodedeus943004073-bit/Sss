export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "pending";
export type RecurrencePeriod = "none" | "weekly" | "monthly";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  status: TransactionStatus;
  isRecurring: boolean;
  recurrencePeriod: RecurrencePeriod;
  orderId?: string; // Opt-in reference to associated order
}

export type DeliveryStatus = "preparation" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "paid" | "pending";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  totalValue: number;
  orderDate: string;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  deliveryAddress?: string;
  notes?: string;
}

export interface DashboardMetrics {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  pendingIncome: number;
  pendingExpense: number;
  activeOrders: number;
  projectedProfit: number;
}
