import { Transaction, Order } from "../types";

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "TX-101",
    description: "Mensalidade SaaS de Automação",
    amount: 180.00,
    type: "expense",
    category: "Software",
    date: "2026-05-05",
    status: "paid",
    isRecurring: true,
    recurrencePeriod: "monthly"
  },
  {
    id: "TX-102",
    description: "Aluguel da Sede",
    amount: 2200.00,
    type: "expense",
    category: "Infraestrutura",
    date: "2026-05-10",
    status: "paid",
    isRecurring: true,
    recurrencePeriod: "monthly"
  },
  {
    id: "TX-103",
    description: "Serviço de Marketing Digital",
    amount: 600.00,
    type: "expense",
    category: "Marketing",
    date: "2026-05-12",
    status: "paid",
    isRecurring: true,
    recurrencePeriod: "monthly"
  },
  {
    id: "TX-104",
    description: "Faturamento Venda Física Direta",
    amount: 3200.00,
    type: "income",
    category: "Vendas",
    date: "2026-05-15",
    status: "paid",
    isRecurring: false,
    recurrencePeriod: "none"
  },
  {
    id: "TX-105",
    description: "Compra de Matéria-Prima (Fornecedor Sul)",
    amount: 1450.00,
    type: "expense",
    category: "Matéria-prima",
    date: "2026-05-18",
    status: "paid",
    isRecurring: false,
    recurrencePeriod: "none"
  },
  {
    id: "TX-106",
    description: "Fechamento Encomenda Integrada #E-1001",
    amount: 680.00,
    type: "income",
    category: "Vendas Online",
    date: "2026-05-20",
    status: "paid",
    isRecurring: false,
    recurrencePeriod: "none",
    orderId: "E-1001"
  },
  {
    id: "TX-107",
    description: "Fechamento Encomenda Integrada #E-1004",
    amount: 360.00,
    type: "income",
    category: "Vendas Online",
    date: "2026-05-24",
    status: "paid",
    isRecurring: false,
    recurrencePeriod: "none",
    orderId: "E-1004"
  },
  {
    id: "TX-108",
    description: "Fornecedor de Embalagens Kraft",
    amount: 350.00,
    type: "expense",
    category: "Logística",
    date: "2026-05-25",
    status: "paid",
    isRecurring: false,
    recurrencePeriod: "none"
  },
  {
    id: "TX-109",
    description: "Previsão Energia Elétrica Comercial",
    amount: 420.00,
    type: "expense",
    category: "Infraestrutura",
    date: "2026-05-28",
    status: "pending",
    isRecurring: true,
    recurrencePeriod: "monthly"
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "E-1001",
    customerName: "Marcos Silva",
    customerEmail: "marcos.silva@email.com",
    customerPhone: "923 456 789",
    items: [
      { name: "Kit Gourmet Especial Premium", quantity: 1, price: 680.00 }
    ],
    totalValue: 680.00,
    orderDate: "2026-05-19",
    deliveryStatus: "delivered",
    paymentStatus: "paid",
    deliveryAddress: "Av. Lenine, 1500, Apt 52 - Luanda, Angola",
    notes: "Entregue no horário comercial"
  },
  {
    id: "E-1002",
    customerName: "Ana Oliveira",
    customerEmail: "ana.oliveira@email.com",
    customerPhone: "912 345 678",
    items: [
      { name: "Cesta de Queijos Selecionados", quantity: 2, price: 325.00 },
      { name: "Vinho Tinto Reservado", quantity: 1, price: 300.00 }
    ],
    totalValue: 950.00,
    orderDate: "2026-05-22",
    deliveryStatus: "preparation",
    paymentStatus: "pending",
    deliveryAddress: "Rua Major Kanhangulo, 45 - Luanda, Angola",
    notes: "Cliente solicitou embalagem extra de presente"
  },
  {
    id: "E-1003",
    customerName: "Carlos Souza",
    customerEmail: "carlos.souza@gmail.com",
    customerPhone: "934 112 233",
    items: [
      { name: "Garrafa Vinho Tinto Chileno", quantity: 2, price: 210.00 }
    ],
    totalValue: 420.00,
    orderDate: "2026-05-25",
    deliveryStatus: "shipped",
    paymentStatus: "pending",
    deliveryAddress: "Avenida Comandante Valódia, 2030 - Luanda, Angola",
    notes: "Código de rastreio enviado"
  },
  {
    id: "E-1004",
    customerName: "Beatriz Santos",
    customerEmail: "beatriz.s@yahoo.com.br",
    customerPhone: "945 321 098",
    items: [
      { name: "Torta de Doce de Leite Artesanal", quantity: 3, price: 120.00 }
    ],
    totalValue: 360.00,
    orderDate: "2026-05-23",
    deliveryStatus: "delivered",
    paymentStatus: "paid",
    deliveryAddress: "Rua Direita de Cacuaco, 902 - Luanda, Angola",
    notes: "Pedir confirmação pelo WhatsApp."
  }
];

export const AVAILABLE_CATEGORIES = {
  income: ["Vendas Online", "Vendas", "Serviços", "Combos Promo", "Consultoria", "Outros"],
  expense: ["Infraestrutura", "Matéria-prima", "Software", "Marketing", "Logística", "Impostos", "Salários", "Outros"]
};
