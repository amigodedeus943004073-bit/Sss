/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  FileText, 
  Plus, 
  RefreshCw, 
  Filter, 
  Check, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  AlertTriangle, 
  ChevronRight, 
  X,
  Sparkles,
  Award,
  ArrowRight,
  User,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

import { Transaction, Order, DashboardMetrics, TransactionType, TransactionStatus, DeliveryStatus, PaymentStatus } from "./types";
import { INITIAL_TRANSACTIONS, INITIAL_ORDERS, AVAILABLE_CATEGORIES } from "./utils/initialData";

export default function App() {
  // Application states
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("nexus_transactions");
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem("nexus_orders");
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [currentTab, setCurrentTab] = useState<string>("dashboard"); // dashboard, cashflow, orders, ai-reports
  
  // Modals / Input states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // New Transaction form fields
  const [newTxDescription, setNewTxDescription] = useState("");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxType, setNewTxType] = useState<TransactionType>("income");
  const [newTxCategory, setNewTxCategory] = useState(AVAILABLE_CATEGORIES.income[0]);
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTxStatus, setNewTxStatus] = useState<TransactionStatus>("paid");
  const [newTxIsRecurring, setNewTxIsRecurring] = useState(false);
  const [newTxRecurrence, setNewTxRecurrence] = useState<"none" | "weekly" | "monthly">("none");

  // New Order form fields
  const [newOrderCustomer, setNewOrderCustomer] = useState("");
  const [newOrderEmail, setNewOrderEmail] = useState("");
  const [newOrderPhone, setNewOrderPhone] = useState("");
  const [newOrderAddress, setNewOrderAddress] = useState("");
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [newOrderItems, setNewOrderItems] = useState<Array<{ name: string; qty: number; price: number }>>([
    { name: "", qty: 1, price: 0 }
  ]);
  const [newOrderPayment, setNewOrderPayment] = useState<PaymentStatus>("pending");

  // AI intelligence states
  const [aiReport, setAiReport] = useState<string>("");
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>("all");
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<string>("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>("all");

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("nexus_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("nexus_orders", JSON.stringify(orders));
  }, [orders]);

  // Handle Order payments sync dynamically with cashflow (automated flow)
  const syncOrderToCashflow = (order: Order, paymentStatus: PaymentStatus) => {
    if (paymentStatus === "paid") {
      // Check if cash flow transaction already exists for this order
      const exists = transactions.some(tx => tx.orderId === order.id);
      if (!exists) {
        const newTx: Transaction = {
          id: `TX-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
          description: `Recebimento Automático: Encomenda Integrada ${order.id}`,
          amount: order.totalValue,
          type: "income",
          category: "Vendas Online",
          date: new Date().toISOString().split('T')[0],
          status: "paid",
          isRecurring: false,
          recurrencePeriod: "none",
          orderId: order.id
        };
        setTransactions(prev => [newTx, ...prev]);
        showActionNotification(`Sucesso: Faturamento da Encomenda ${order.id} integrado automaticamente ao fluxo de caixa!`);
      }
    } else {
      // If payment was reverted back to pending, check if automated transaction exists and remove or change to pending
      setTransactions(prev => prev.filter(tx => tx.orderId !== order.id));
    }
  };

  const [notification, setNotification] = useState<string | null>(null);
  const showActionNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Metrics calculation
  const metrics = useMemo<DashboardMetrics>(() => {
    let currentBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;
    
    // Process transactions
    transactions.forEach(tx => {
      if (tx.type === "income") {
        if (tx.status === "paid") {
          currentBalance += tx.amount;
          totalIncome += tx.amount;
        } else {
          pendingIncome += tx.amount;
        }
      } else {
        if (tx.status === "paid") {
          currentBalance -= tx.amount;
          totalExpense += tx.amount;
        } else {
          pendingExpense += tx.amount;
        }
      }
    });

    // Also account for orders that are PAID but might not have been transferred to transaction,
    // though our sync functions handles that, we compute active pending order potential as separate metrics
    const activeOrdersSum = orders
      .filter(o => o.deliveryStatus !== "delivered" && o.deliveryStatus !== "cancelled")
      .reduce((sum, o) => sum + o.totalValue, 0);

    const activeCount = orders.filter(o => o.deliveryStatus !== "delivered" && o.deliveryStatus !== "cancelled").length;

    // Projected profit 30d is current Balance + expected income - expected expenses + pending orders to deliver and receive
    const expectedUnpaidOrders = orders
      .filter(o => o.paymentStatus === "pending")
      .reduce((sum, o) => sum + o.totalValue, 0);

    const projectedProfit = currentBalance + pendingIncome - pendingExpense + expectedUnpaidOrders;

    return {
      currentBalance,
      totalIncome,
      totalExpense,
      pendingIncome,
      pendingExpense,
      activeOrders: activeCount,
      projectedProfit
    };
  }, [transactions, orders]);

  // Request AI insights from Express backend (which calls Gemini 3.5-flash)
  const triggerAiAnalysis = async () => {
    setIsGeneratingReport(true);
    setApiError(null);
    setCurrentTab("ai-reports");
    
    try {
      const response = await fetch("/api/analyze-finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balance: metrics.currentBalance,
          transactions: transactions.slice(0, 15), // send last 15
          orders: orders
        })
      });

      if (!response.ok) {
        throw new Error("Erro de rede ao conectar com o motor de inteligência artificial Nexus.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAiReport(data.report);
      showActionNotification("Novo relatório estratégico gerado pela IA com sucesso!");
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Não foi possível contactar o servidor de relatórios.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Add Transaction Form submit
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newTxAmount);
    if (!newTxDescription || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Preencha descrição e valor válidos.");
      return;
    }

    const newTx: Transaction = {
      id: `TX-${Math.floor(100 + Math.random() * 900)}`,
      description: newTxDescription,
      amount: parsedAmount,
      type: newTxType,
      category: newTxCategory,
      date: newTxDate,
      status: newTxStatus,
      isRecurring: newTxIsRecurring,
      recurrencePeriod: newTxIsRecurring ? newTxRecurrence : "none"
    };

    setTransactions(prev => [newTx, ...prev]);
    setIsTxModalOpen(false);
    showActionNotification("Lançamento adicionado ao fluxo de caixa com sucesso!");

    // Reset Form
    setNewTxDescription("");
    setNewTxAmount("");
    setNewTxIsRecurring(false);
    setNewTxRecurrence("none");
  };

  // Add order item line
  const addOrderItemField = () => {
    setNewOrderItems(prev => [...prev, { name: "", qty: 1, price: 0 }]);
  };

  const removeOrderItemField = (idx: number) => {
    if (newOrderItems.length === 1) return;
    setNewOrderItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleOrderItemChange = (idx: number, field: string, val: any) => {
    setNewOrderItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  // Add Order Form submit
  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustomer) {
      alert("Informe o nome do cliente.");
      return;
    }

    // Filter valid items
    const validItems = newOrderItems.filter(item => item.name.trim() !== "" && item.price > 0);
    if (validItems.length === 0) {
      alert("Adicione pelo menos 1 item com nome e preço válidos na encomenda.");
      return;
    }

    const computedTotal = validItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

    const newOrd: Order = {
      id: `E-${Math.floor(1005 + Math.random() * 8000)}`,
      customerName: newOrderCustomer,
      customerEmail: newOrderEmail || undefined,
      customerPhone: newOrderPhone || undefined,
      items: validItems.map(item => ({
        name: item.name,
        quantity: Number(item.qty),
        price: Number(item.price)
      })),
      totalValue: computedTotal,
      orderDate: new Date().toISOString().split("T")[0],
      deliveryStatus: "preparation",
      paymentStatus: newOrderPayment,
      deliveryAddress: newOrderAddress || undefined,
      notes: newOrderNotes || undefined
    };

    setOrders(prev => [newOrd, ...prev]);
    setIsOrderModalOpen(false);
    
    // Automatically provision transaction if order is marked paid during creation!
    if (newOrd.paymentStatus === "paid") {
      syncOrderToCashflow(newOrd, "paid");
    } else {
      showActionNotification(`Encomenda ${newOrd.id} registrada com sucesso. Aguardando faturamento.`);
    }

    // Reset Form
    setNewOrderCustomer("");
    setNewOrderEmail("");
    setNewOrderPhone("");
    setNewOrderAddress("");
    setNewOrderNotes("");
    setNewOrderItems([{ name: "", qty: 1, price: 0 }]);
    setNewOrderPayment("pending");
  };

  // Change order payment status (Paid / Pending) on-the-fly
  const toggleOrderPaymentStatus = (orderId: string, currentStatus: PaymentStatus) => {
    const nextStatus: PaymentStatus = currentStatus === "paid" ? "pending" : "paid";
    
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, paymentStatus: nextStatus };
        // Sync to cash flow
        syncOrderToCashflow(updated, nextStatus);
        return updated;
      }
      return o;
    }));
  };

  // Change order delivery logistics status
  const updateOrderDeliveryStatus = (orderId: string, status: DeliveryStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, deliveryStatus: status };
      }
      return o;
    }));
    showActionNotification(`Encomenda ${orderId} atualizada para o status: ${status === "preparation" ? "Em Preparação" : status === "shipped" ? "Enviada" : status === "delivered" ? "Entregue" : "Cancelada"}`);
  };

  // Quick Action: Settle Pending Cashflow transaction instantly
  const handleSettleTransaction = (txId: string) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id === txId) {
        return { ...tx, status: "paid" };
      }
      return tx;
    }));
    showActionNotification("Lançamento de caixa liquidado/efetivado!");
  };

  // Quick Action: Delete custom entries
  const handleDeleteTransaction = (txId: string) => {
    if (confirm("Deseja realmente excluir este lançamento permanente do livro-caixa?")) {
      setTransactions(prev => prev.filter(tx => tx.id !== txId));
      showActionNotification("Lançamento removido com sucesso.");
    }
  };

  // Quick Action: Clear local Storage statistics
  const handleResetToFactoryBase = () => {
    if (confirm("Aviso: Isso resetará o saldo e as encomendas para os dados padrão iniciais da empresa. Prosseguir?")) {
      localStorage.removeItem("nexus_transactions");
      localStorage.removeItem("nexus_orders");
      setTransactions(INITIAL_TRANSACTIONS);
      setOrders(INITIAL_ORDERS);
      showActionNotification("Fábrica de dados restaurada com sucesso.");
    }
  };

  // Computed lists with filters applied
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = txTypeFilter === "all" || t.type === txTypeFilter;
      const matchesCategory = txCategoryFilter === "all" || t.category === txCategoryFilter;
      return matchesType && matchesCategory;
    });
  }, [transactions, txTypeFilter, txCategoryFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesDelivery = orderDeliveryFilter === "all" || o.deliveryStatus === orderDeliveryFilter;
      const matchesPayment = orderPaymentFilter === "all" || o.paymentStatus === orderPaymentFilter;
      return matchesDelivery && matchesPayment;
    });
  }, [orders, orderDeliveryFilter, orderPaymentFilter]);

  // Assistive Custom regex-driven Markdown Renderer for aesthetic High Density outputs
  const renderBeautifulMarkdown = (markdownText: string) => {
    if (!markdownText) return <p className="text-slate-500 italic">Pronto para gerar sua auditoria financeira automágica.</p>;

    const lines = markdownText.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith("###")) {
        return <h4 key={idx} className="text-xs font-bold uppercase tracking-wider text-[#141414] mt-4 mb-2 border-b border-[#141414]/25 pb-1 font-mono">{trimmed.replace("###", "").trim()}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="text-sm font-bold uppercase tracking-widest text-[#141414] mt-5 mb-3 bg-[#D9D8D5] px-2 py-1 border-l-4 border-[#141414]" style={{ fontFamily: "Georgia, serif" }}>{trimmed.replace("##", "").trim()}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={idx} className="text-md font-black tracking-tighter uppercase italic text-center text-[#141414] border-2 border-[#141414] p-3 bg-white mb-6" style={{ fontFamily: "Georgia, serif" }}>{trimmed.replace("#", "").trim()}</h2>;
      }

      // Bold text handling
      let content = trimmed;
      
      // List items with custom formatting
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const textOnly = trimmed.replace(/^[\s-*]+/, "").trim();
        // Check for **bold** inline
        const formatted = highlightBold(textOnly);
        return (
          <li key={idx} className="text-[11px] leading-relaxed opacity-90 list-none flex items-start gap-2 border-b border-[#141414]/10 py-1.5 pl-2 hover:bg-white/40">
            <span className="text-[#141414] font-bold shrink-0 mt-0.5">▪</span>
            <span>{formatted}</span>
          </li>
        );
      }

      if (trimmed === "") {
        return <div key={idx} className="h-2"></div>;
      }

      // Default paragraph
      return <p key={idx} className="text-xs leading-relaxed text-[#141414] mb-3 font-sans opacity-90">{highlightBold(content)}</p>;
    });
  };

  // Helper function to extract and emphasize **bold texts**
  const highlightBold = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    if (parts.length <= 1) return text;
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-[#141414] bg-[#FFE082]/70 px-1 font-mono">{part}</strong> : part);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#E4E3E0] font-sans text-[#141414] selection:bg-[#141414] selection:text-[#E4E3E0]" id="high-density-app-container">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-12 right-6 bg-[#141414] text-[#E4E3E0] text-xs font-mono p-4 border-l-4 border-amber-400 shadow-2xl z-50 animate-bounce max-w-sm flex items-center justify-between gap-3" id="app-notification">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-amber-400 hover:text-white font-bold text-sm">×</button>
        </div>
      )}

      {/* Header Container representing the "NEXUS" identity */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b-2 border-[#141414] bg-[#E4E3E0] z-20 sticky top-0" id="global-header">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#141414] flex items-center justify-center cursor-pointer hover:rotate-12 transition-transform" onClick={() => setCurrentTab("dashboard")}>
            <div className="w-3.5 h-3.5 border-2 border-[#E4E3E0] rotate-45"></div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic" style={{ fontFamily: "Georgia, serif" }}>
              NEXUS · FLUXO &amp; LOGÍSTICA
            </h1>
            <p className="text-[9px] uppercase font-mono tracking-widest opacity-60">
              Controle Financeiro &amp; Gestão Estrita de Encomendas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] uppercase opacity-55 font-bold tracking-wider">Estado do Motor</span>
            <span className="text-xs font-mono font-black flex items-center gap-1.5 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              SINC_ONLINE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleResetToFactoryBase}
              className="px-2.5 py-1 text-[10px] font-mono border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition"
              title="Restaurar dados de fábrica da demo"
            >
              RESET_DADOS
            </button>
            <div className="w-9 h-9 rounded-none border-2 border-[#141414] bg-[#D1D1CF] flex items-center justify-center font-mono text-xs font-bold" title={process.env.USER_EMAIL}>
              JD
            </div>
          </div>
        </div>
      </header>

      {/* Dynamic Sub-header Navigation Tabs */}
      <div className="flex border-b border-[#141414] bg-[#D9D8D5] overflow-x-auto text-[11px]" id="app-navigation-tabs">
        <button 
          onClick={() => setCurrentTab("dashboard")}
          className={`px-6 py-3 border-r border-[#141414] font-mono tracking-wider uppercase font-bold transition flex items-center gap-2 ${
            currentTab === "dashboard" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-white/40"
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> PAINEL DE CONTROLE
        </button>
        <button 
          onClick={() => setCurrentTab("cashflow")}
          className={`px-6 py-3 border-r border-[#141414] font-mono tracking-wider uppercase font-bold transition flex items-center gap-2 ${
            currentTab === "cashflow" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-white/40"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" /> LIVRO-CAIXA / CONTROLE
        </button>
        <button 
          onClick={() => setCurrentTab("orders")}
          className={`px-6 py-3 border-r border-[#141414] font-mono tracking-wider uppercase font-bold transition flex items-center gap-2 ${
            currentTab === "orders" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-white/40"
          }`}
        >
          <Package className="w-3.5 h-3.5" /> INTEGRADO ENCOMENDAS
        </button>
        <button 
          onClick={() => {
            if (!aiReport) {
              triggerAiAnalysis();
            } else {
              setCurrentTab("ai-reports");
            }
          }}
          className={`px-6 py-3 border-r border-[#141414] font-mono tracking-wider uppercase font-bold transition flex items-center gap-2 ${
            currentTab === "ai-reports" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-amber-100"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> COMPILADOR RELATÓRIOS IA
        </button>
      </div>

      {/* Top Metrics Ledger Strip for precise real-time readings */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#141414] bg-[#E3E2DF]" id="ledger-stats-strip">
        <div className="p-4 border-r border-b md:border-b-0 border-[#141414]">
          <p className="text-[10px] uppercase opacity-70 italic mb-1" style={{ fontFamily: "Georgia, serif" }}>Saldo Consolidado</p>
          <p className="text-2xl font-mono tracking-tighter font-extrabold text-[#141414]">
            Kz {metrics.currentBalance.toLocaleString("pt-AO", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-mono text-emerald-800 font-bold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" /> LIQUIDEZ COMERCIAL ATUAL
          </p>
        </div>

        <div className="p-4 border-r border-b md:border-b-0 border-[#141414] bg-[#D1D1CF]/40">
          <p className="text-[10px] uppercase opacity-70 italic mb-1" style={{ fontFamily: "Georgia, serif" }}>Faturamento Pendente</p>
          <p className="text-2xl font-mono tracking-tighter font-extrabold text-[#141414]">
            Kz {metrics.pendingIncome.toLocaleString("pt-AO", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-mono text-blue-800 font-bold">
            {metrics.activeOrders} ENCOMENDAS EM RECURSO
          </p>
        </div>

        <div className="p-4 border-r border-[#141414]">
          <p className="text-[10px] uppercase opacity-70 italic mb-1" style={{ fontFamily: "Georgia, serif" }}>Contas a Pagar/Aprovisionadas</p>
          <p className="text-2xl font-mono tracking-tighter font-extrabold text-[#141414]">
            Kz {metrics.pendingExpense.toLocaleString("pt-AO", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-mono text-rose-800 font-semibold uppercase">
            Passivos pendentes neste período
          </p>
        </div>

        <div className="p-4 bg-[#141414] text-[#E4E3E0]">
          <p className="text-[10px] uppercase opacity-80 italic mb-1 text-slate-300" style={{ fontFamily: "Georgia, serif" }}>Projeção de Caixa (30d)</p>
          <p className="text-2xl font-mono tracking-tighter font-extrabold text-[#FFE082]" id="projected-profit-value">
            Kz {metrics.projectedProfit.toLocaleString("pt-AO", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-mono text-amber-300 font-black tracking-wider uppercase">
            AUTOMATIZADO / AUDITÁVEL
          </p>
        </div>
      </div>

      {/* Main Content Router */}
      <main className="flex-1 p-6" id="app-main-content">
        
        {/* TAB 1: PAINEL DE CONTROLE (DASHBOARD) */}
        {currentTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-tab">
            
            {/* Left Col - 8 Units - Core Graphics & Quick Lançamentos */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* SVG Trend Graphic with brutalist high density border */}
              <div className="bg-white p-6 rounded-none border border-[#141414] shadow-[4px_4px_0px_#141414]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                  <div>
                    <h3 className="text-xs font-mono font-black uppercase tracking-widest text-[#141414]">TENDÊNCIA DE ENTRADAS VS SAÍDAS REALIZADAS</h3>
                    <p className="text-[11px] opacity-60">Análise de Fluxo Operacional dos Últimos 6 Períodos Consolidados</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 border border-[#141414]"></span> Receitado</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#FFE082] border border-[#141414]"></span> Custeado</span>
                  </div>
                </div>

                <div className="relative h-56 border border-[#141414] bg-[#E4E3E0]/40 flex items-end p-4">
                  {/* Absolute Guidelines */}
                  <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none opacity-20">
                    <div className="border-t border-[#141414] w-full"></div>
                    <div className="border-t border-[#141414] w-full"></div>
                    <div className="border-t border-[#141414] w-full"></div>
                    <div className="border-t border-[#141414] w-full"></div>
                  </div>

                  {/* Rendering standard aggregated historic database bars */}
                  <div className="w-full flex justify-between items-end h-full pt-4 z-10 font-mono">
                    {[
                      { label: "Dez", inc: 2400, exp: 1200 },
                      { label: "Jan", inc: 3100, exp: 1800 },
                      { label: "Fev", inc: 2800, exp: 1950 },
                      { label: "Mar", inc: 3900, exp: 2100 },
                      { label: "Abr", inc: 4200, exp: 3100 },
                      { label: "Mai (Atual)", inc: metrics.totalIncome, exp: metrics.totalExpense }
                    ].map((m, idx) => {
                      const maxVal = 5000;
                      const incHeight = Math.max((m.inc / maxVal) * 100, 4);
                      const expHeight = Math.max((m.exp / maxVal) * 100, 4);

                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 group">
                          <div className="flex items-end justify-center gap-1.5 w-full h-36">
                            {/* Income Bar */}
                            <div 
                              className="w-5 bg-blue-600 border border-[#141414] group-hover:bg-blue-700 transition-all relative"
                              style={{ height: `${incHeight}%` }}
                              title={`Entradas período: Kz ${m.inc.toFixed(2)}`}
                            >
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#141414] text-[#E4E3E0] text-[8px] p-1 rounded-none shadow font-mono opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30">
                                Kz {m.inc.toFixed(0)}
                              </div>
                            </div>
                            {/* Expense Bar */}
                            <div 
                              className="w-5 bg-[#FFE082] border border-[#141414] group-hover:bg-[#FFD54F] transition-all relative"
                              style={{ height: `${expHeight}%` }}
                              title={`Despesas período: Kz ${m.exp.toFixed(2)}`}
                            >
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#141414] text-[#E4E3E0] text-[8px] p-1 rounded-none shadow font-mono opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30">
                                Kz {m.exp.toFixed(0)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-[#141414] w-full pt-1.5 text-center mt-2">
                            <span className="text-[10px] font-bold tracking-tight uppercase">{m.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] font-mono border-t border-[#141414]/15 pt-3 gap-2">
                  <span className="opacity-70">Nota: O período atual computa alterações e faturamentos em tempo real.</span>
                  <button onClick={() => triggerAiAnalysis()} className="text-blue-700 uppercase font-bold hover:underline flex items-center gap-1">
                    Analisar tendências com IA <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Grid: Split under columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Recent Cash entries ledger */}
                <div className="bg-white p-5 rounded-none border border-[#141414] shadow-[4px_4px_0px_#141414] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-[#141414]/20 pb-2 mb-4">
                      <h4 className="text-xs font-mono font-black uppercase tracking-wider">ÚLTIMOS LANÇAMENTOS</h4>
                      <button onClick={() => setCurrentTab("cashflow")} className="text-[10px] font-bold uppercase hover:underline">Ver Todos</button>
                    </div>

                    <div className="divide-y divide-[#141414]/10 max-h-56 overflow-y-auto pr-1">
                      {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="py-2.5 flex justify-between items-center text-xs">
                          <div className="pr-3">
                            <p className="font-bold text-[#141414] truncate max-w-[180px]">{tx.description}</p>
                            <span className="text-[9px] font-mono opacity-60 uppercase tracking-widest">{tx.category}</span>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono font-bold ${tx.type === "income" ? "text-emerald-800" : "text-rose-800"}`}>
                              {tx.type === "income" ? "+" : "-"} Kz {tx.amount.toFixed(2)}
                            </span>
                            <p className="text-[8px] font-mono tracking-tight opacity-50 uppercase">
                              {tx.status === "paid" ? "EFETIVADO" : "PENDENTE"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setNewTxType("expense");
                      setIsTxModalOpen(true);
                    }}
                    className="w-full mt-4 bg-[#141414] hover:bg-[#2e2e2d] text-[#E4E3E0] font-mono text-[10px] py-2 uppercase font-black transition text-center"
                  >
                    + Novo Lançamento de Caixa
                  </button>
                </div>

                {/* Quick Encomendas Queue */}
                <div className="bg-white p-5 rounded-none border border-[#141414] shadow-[4px_4px_0px_#141414] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-[#141414]/20 pb-2 mb-4">
                      <h4 className="text-xs font-mono font-black uppercase tracking-wider">FILA DE ENCOMENDAS ATIVAS</h4>
                      <button onClick={() => setCurrentTab("orders")} className="text-[10px] font-bold uppercase hover:underline">Gerenciar</button>
                    </div>

                    <div className="divide-y divide-[#141414]/10 max-h-56 overflow-y-auto pr-1">
                      {orders.filter(o => o.deliveryStatus !== "delivered" && o.deliveryStatus !== "cancelled").slice(0, 5).map(ord => (
                        <div key={ord.id} className="py-2.5 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#141414]">{ord.id}</span>
                              <span className={`text-[8px] font-bold border px-1 ${
                                ord.deliveryStatus === "preparation" ? "bg-amber-100 border-amber-800 text-amber-900" : "bg-blue-100 border-blue-800 text-blue-900"
                              }`}>
                                {ord.deliveryStatus === "preparation" ? "PREPARO" : "DESPACHADO"}
                              </span>
                            </div>
                            <p className="text-[10px] opacity-75 mt-0.5 truncate max-w-[140px]">{ord.customerName}</p>
                          </div>
                          
                          <div className="text-right">
                            <span className="font-mono font-bold">Kz {ord.totalValue.toFixed(2)}</span>
                            <button
                              onClick={() => toggleOrderPaymentStatus(ord.id, ord.paymentStatus)}
                              className={`block text-[9px] font-mono mt-0.5 ml-auto uppercase text-right hover:underline ${
                                ord.paymentStatus === "paid" ? "text-emerald-700 font-bold" : "text-rose-700"
                              }`}
                              title="Clique para reverter status de pagamento"
                            >
                              {ord.paymentStatus === "paid" ? "Faturado ✓" : "Não Pago ✗"}
                            </button>
                          </div>
                        </div>
                      ))}

                      {orders.filter(o => o.deliveryStatus !== "delivered" && o.deliveryStatus !== "cancelled").length === 0 && (
                        <div className="py-6 text-center text-[11px] opacity-60 italic">
                          Excelente! Nenhuma encomenda na fila de entrega hoje.
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsOrderModalOpen(true)}
                    className="w-full mt-4 bg-transparent hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] border border-[#141414] font-mono text-[10px] py-2 uppercase font-black transition text-center"
                  >
                    + Cadastrar Nova Encomenda
                  </button>
                </div>

              </div>

            </div>

            {/* Right Col - 4 Units - Real-Time Smart Audit Panel using Gemini AI */}
            <div className="lg:col-span-4" id="dashboard-right-ai-sidebar">
              <div className="bg-[#EBEAE7] border-2 border-[#141414] h-full flex flex-col justify-between shadow-[4px_4px_0px_#141414]">
                
                <div className="p-5 border-b border-[#141414] bg-[#D9D8D5]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider">MOTOR DE AUDITORIA IA</h3>
                    <span className="px-1.5 py-0.5 bg-[#141414] text-[#E4E3E0] text-[8px] font-mono font-bold">GEN-3.5-FLASH</span>
                  </div>
                  <p className="text-[11px] opacity-70 mt-1">Gere relatórios imediatos com recomendações fiscais e logísticas inteligentes de alta densidade.</p>
                </div>

                <div className="p-5 flex-1 space-y-4 max-h-[460px] overflow-y-auto">
                  {/* Dynamic list displaying instant system diagnostic */}
                  <div className="p-3 border-l-4 border-[#141414] bg-white text-[11px] leading-relaxed">
                    <p className="font-mono font-bold uppercase text-[9px]">DIAGNÓSTICO AUTOMÁTICO DE LIQUIDEZ</p>
                    <p className="italic bg-[#FFE082]/30 p-1 mt-1 font-serif" style={{ fontFamily: "Georgia, serif" }}>
                      Seu saldo operacional de <strong>Kz {metrics.currentBalance.toFixed(2)}</strong> está consolidado.
                      Você possui {metrics.activeOrders} encomendas ativas que podem elevar as reservas em até <strong>Kz {(metrics.projectedProfit - metrics.currentBalance).toFixed(2)}</strong> assim que despachadas.
                    </p>
                  </div>

                  <div className="p-3 border-l-4 border-emerald-600 bg-white text-[11px] leading-relaxed">
                    <span className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[9px] font-bold px-1 uppercase shrink-0">EFICIÊNCIA CAIXA</span>
                    <p className="mt-1 opacity-80 font-serif" style={{ fontFamily: "Georgia, serif" }}>
                      A sincronização entre o checkout de encomendas e o livro-caixa reduziu a perda de rastreio de recebíveis para zero neste mês.
                    </p>
                  </div>

                  {metrics.pendingExpense > 0 && (
                    <div className="p-3 border-l-4 border-rose-600 bg-white text-[11px] leading-relaxed">
                      <span className="bg-rose-100 text-rose-800 border-rose-300 font-mono text-[9px] font-bold px-1 uppercase shrink-0">PASSIVO PENDENTE</span>
                      <p className="mt-1 opacity-80 font-serif" style={{ fontFamily: "Georgia, serif" }}>
                        Atenção: Você possui parcelas / contas a pagar provisionas no valor de <strong>Kz {metrics.pendingExpense.toFixed(2)}</strong> com vencimento programado.
                      </p>
                    </div>
                  )}

                  {aiReport && (
                    <div className="p-3.5 border-2 border-dashed border-[#141414] bg-white text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider">★ CONSELHO MAIS RECENTE DA IA</span>
                        <button onClick={() => setCurrentTab("ai-reports")} className="text-[9px] font-mono hover:underline uppercase">Visualizar Cheio</button>
                      </div>
                      <p className="line-clamp-4 text-[11px] opacity-80 leading-snug">{aiReport.replace(/[\*#_]/g, "")}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-[#141414] text-[#E4E3E0] flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px] opacity-60 font-mono">
                    <span>CAPACIDADE ATRIBUÍDA:</span>
                    <span>100% DISPONÍVEL</span>
                  </div>
                  
                  <button 
                    onClick={triggerAiAnalysis}
                    disabled={isGeneratingReport}
                    className="w-full bg-[#FFE082] hover:bg-[#FFE082]/90 disabled:bg-[#FFE082]/50 text-[#141414] font-mono text-xs py-3 uppercase font-black tracking-wider transition flex items-center justify-center gap-2"
                  >
                    {isGeneratingReport ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Gerando Relatório Auditoria...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#141414]" />
                        AUDITAR NEGÓCIO COM IA
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: LIVRO CAIXA & FLUXO DE CAIXA */}
        {currentTab === "cashflow" && (
          <div className="bg-white rounded-none border-2 border-[#141414] p-6 shadow-[6px_6px_0px_#141414]" id="cashflow-tab">
            
            {/* Cashflow layout header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-[#141414] pb-4 mb-6 gap-4">
              <div>
                <h3 className="text-sm font-mono font-black uppercase tracking-widest">LIVRO CAIXA DE CONTROLE FINANCEIRO</h3>
                <p className="text-[11px] opacity-60">Demonstrativo de fluxos de entrada e saída. Use os filtros para refinar relatórios locais.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                
                {/* Type Filter */}
                <div className="flex items-center gap-1.5 p-1 bg-[#E4E3E0] border border-[#141414]">
                  <span className="text-[9px] font-mono font-bold uppercase pl-1">Tipo:</span>
                  <select 
                    value={txTypeFilter} 
                    onChange={(e) => setTxTypeFilter(e.target.value)}
                    className="text-[10px] font-mono bg-transparent font-bold focus:outline-none"
                  >
                    <option value="all">TODOS</option>
                    <option value="income">ENTRADAS (+)</option>
                    <option value="expense">SAÍDAS (-)</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-1.5 p-1 bg-[#E4E3E0] border border-[#141414]">
                  <span className="text-[9px] font-mono font-bold uppercase pl-1">Categoria:</span>
                  <select 
                    value={txCategoryFilter} 
                    onChange={(e) => setTxCategoryFilter(e.target.value)}
                    className="text-[10px] font-mono bg-transparent font-bold focus:outline-none"
                  >
                    <option value="all">TODAS</option>
                    {[...AVAILABLE_CATEGORIES.income, ...AVAILABLE_CATEGORIES.expense].map(cat => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Add Tx Action */}
                <button 
                  onClick={() => setIsTxModalOpen(true)}
                  className="px-4 py-1.5 bg-[#141414] text-[#E4E3E0] hover:bg-slate-800 text-[10px] font-mono uppercase font-black transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> NOVO LANÇAMENTO
                </button>
              </div>
            </div>

            {/* Cashflow Ledger grid stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border border-[#141414] p-3.5 bg-[#E4E3E0]/30 flex flex-col justify-between">
                <span className="text-[9px] font-mono font-black uppercase opacity-65">TOTAL DE ENTRADAS EFETIVAS</span>
                <p className="text-xl font-mono text-emerald-800 font-extrabold mt-1">
                  Kz {metrics.totalIncome.toLocaleString("pt-AO", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="border border-[#141414] p-3.5 bg-[#E4E3E0]/30 flex flex-col justify-between">
                <span className="text-[9px] font-mono font-black uppercase opacity-65">TOTAL DE DESPESAS CONSOLIDADAS</span>
                <p className="text-xl font-mono text-rose-800 font-extrabold mt-1">
                  Kz {metrics.totalExpense.toLocaleString("pt-AO", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="border border-[#141414] p-3.5 bg-[#141414] text-[#E4E3E0] flex flex-col justify-between">
                <span className="text-[9px] font-mono font-black uppercase opacity-75">LUCRO LÍQUIDO DO PERÍODO</span>
                <p className={`text-xl font-mono font-black mt-1 ${metrics.totalIncome - metrics.totalExpense >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  Kz {(metrics.totalIncome - metrics.totalExpense).toLocaleString("pt-AO", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Ledger transaction Table */}
            <div className="border border-[#141414] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#D9D8D5] border-b border-[#141414] text-xs font-mono font-bold text-[#141414]">
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>ID</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Data Lançamento</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Descrição / Justificativa</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Categoria</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Tipo / Natureza</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Faturamento</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono divide-y divide-[#141414]/15">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#EBEAE7]/55 transition">
                      <td className="p-3 font-bold">{tx.id}</td>
                      <td className="p-3 text-slate-600">{new Date(tx.date).toLocaleDateString("pt-AO")}</td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{tx.description}</span>
                          {tx.orderId && (
                            <span className="text-[9px] text-[#141414]/60 font-medium flex items-center gap-1 mt-0.5">
                              🔗 Vinculado à Encomenda: <strong className="font-bold underline cursor-pointer" onClick={() => {
                                const found = orders.find(o => o.id === tx.orderId);
                                if (found) {
                                  setSelectedOrder(found);
                                }
                              }}>{tx.orderId}</strong>
                            </span>
                          )}
                          {tx.isRecurring && (
                            <span className="text-[8px] bg-amber-150 border border-amber-300 text-amber-900 rounded-none w-max px-1 mt-0.5 uppercase tracking-wider">
                              Fixo Recorrente ({tx.recurrencePeriod})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 bg-[#E4E3E0] border border-[#141414]/30 text-[9px] uppercase font-semibold">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 max-w-max text-[9px] border ${
                          tx.type === "income" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-rose-50 text-rose-800 border-rose-300"
                        }`}>
                          {tx.type === "income" ? (
                            <>▲ ENTRADA (RECEITA)</>
                          ) : (
                            <>▼ SAÍDA (DESPESA)</>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <strong className={`font-black font-mono text-sm ${
                          tx.type === "income" ? "text-emerald-700" : "text-rose-700"
                        }`}>
                          Kz {tx.amount.toFixed(2)}
                        </strong>
                        <div className="text-[9px] opacity-60 mt-0.5 uppercase">
                          {tx.status === "paid" ? "REALIZADO ✓" : "PREVISTO (PENDENTE)"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {tx.status === "pending" && (
                            <button 
                              onClick={() => handleSettleTransaction(tx.id)}
                              className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[9px] font-mono uppercase tracking-wider font-bold transition"
                              title="Marcar como Liquidado/Efetivado"
                            >
                              LIQUIDAR
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="px-2 py-0.5 bg-rose-100 border border-rose-300 hover:bg-rose-200 text-rose-800 text-[9px] font-mono uppercase tracking-wider transition"
                            title="Xcluir transação permanentemente"
                          >
                            EXCLUIR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 italic">
                        Nenhum lançamento encontrado correspondendo aos filtros vigentes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom aggregate helper */}
            <div className="mt-4 flex justify-between items-center text-[10px] font-mono opacity-50">
              <span>CONTROLE LIVRO CAIXA - SISTEMA FISCAL FINANCEIRO</span>
              <span>TOTAL REGISTROS LOCAL: {filteredTransactions.length} LANÇAMENTOS</span>
            </div>

          </div>
        )}

        {/* TAB 3: GESTÃO DE ENCOMENDAS */}
        {currentTab === "orders" && (
          <div className="bg-white rounded-none border-2 border-[#141414] p-6 shadow-[6px_6px_0px_#141414]" id="orders-tab">
            
            {/* Orders header layout */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-[#141414] pb-4 mb-6 gap-4">
              <div>
                <h3 className="text-sm font-mono font-black uppercase tracking-widest">ENCOMENDAS E EXPEDIÇÃO INTEGRADA</h3>
                <p className="text-[11px] opacity-60">
                  Gerencie o status operacional das encomendas. 
                  <strong className="text-emerald-800 bg-[#FFE082]/30 px-1 font-bold"> Faturamento automatizado:</strong> Marcar uma encomenda como "PAGA" lança automaticamente receita imediata ao livro-caixa!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                
                {/* Delivery Logistics status filter */}
                <div className="flex items-center gap-1.5 p-1 bg-[#E4E3E0] border border-[#141414]">
                  <span className="text-[9px] font-mono font-bold uppercase pl-1">Expedição:</span>
                  <select 
                    value={orderDeliveryFilter} 
                    onChange={(e) => setOrderDeliveryFilter(e.target.value)}
                    className="text-[10px] font-mono bg-transparent font-bold focus:outline-none"
                  >
                    <option value="all">TODOS STATUS</option>
                    <option value="preparation">EM PREPARAÇÃO</option>
                    <option value="shipped">ENVIADO (TRÂNSITO)</option>
                    <option value="delivered">ENTREGUE</option>
                    <option value="cancelled">CANCELADO</option>
                  </select>
                </div>

                {/* Unpaid vs paid filter */}
                <div className="flex items-center gap-1.5 p-1 bg-[#E4E3E0] border border-[#141414]">
                  <span className="text-[9px] font-mono font-bold uppercase pl-1">Financeiro:</span>
                  <select 
                    value={orderPaymentFilter} 
                    onChange={(e) => setOrderPaymentFilter(e.target.value)}
                    className="text-[10px] font-mono bg-transparent font-bold focus:outline-none"
                  >
                    <option value="all">TODOS</option>
                    <option value="paid">FATURADOS (PAGO)</option>
                    <option value="pending">PENDENTE PGTO</option>
                  </select>
                </div>

                {/* Add Order Action */}
                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="px-4 py-1.5 bg-[#141414] text-[#E4E3E0] hover:bg-slate-800 text-[10px] font-mono uppercase font-black transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> NOVA ENCOMENDA
                </button>
              </div>
            </div>

            {/* Orders statistics metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="border border-[#141414] p-3 bg-[#E4E3E0]/30 text-center font-mono">
                <span className="text-[8px] font-black uppercase opacity-65">ATIVAS (PREPARO/ENVIO)</span>
                <p className="text-lg font-bold text-amber-700 mt-1">
                  {orders.filter(o => o.deliveryStatus === "preparation" || o.deliveryStatus === "shipped").length}
                </p>
              </div>
              <div className="border border-[#141414] p-3 bg-[#E4E3E0]/30 text-center font-mono">
                <span className="text-[8px] font-black uppercase opacity-65">TOTAL ENTREGUE COM SUCESSO</span>
                <p className="text-lg font-bold text-emerald-800 mt-1">
                  {orders.filter(o => o.deliveryStatus === "delivered").length}
                </p>
              </div>
              <div className="border border-[#141414] p-3 bg-[#E4E3E0]/30 text-center font-mono">
                <span className="text-[8px] font-black uppercase opacity-65">AGUARDANDO COBRANÇA</span>
                <p className="text-lg font-bold text-[#141414] mt-1">
                  {orders.filter(o => o.paymentStatus === "pending").length}
                </p>
              </div>
              <div className="border border-[#141414] p-3 bg-[#141414] text-[#E4E3E0] text-center font-mono">
                <span className="text-[8px] font-black uppercase opacity-85 text-yellow-300">RECEITA BRUTA TOTALIZADA</span>
                <p className="text-lg font-bold text-yellow-300 mt-1">
                  Kz {orders.reduce((sum, o) => sum + o.totalValue, 0).toLocaleString("pt-AO", { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* List of Orders in High density Table */}
            <div className="border border-[#141414] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#D9D8D5] border-b border-[#141414] text-xs font-mono font-bold text-[#141414]">
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Número ID</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Cliente / Contato</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Data Pedido</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Itens inclusos</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Valor Total</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Situação Expedição</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Faturamento Caixa</th>
                    <th className="p-3 text-[10px] uppercase font-bold italic" style={{ fontFamily: "Georgia, serif" }}>Ações Operação</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono divide-y divide-[#141414]/15">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#EBEAE7]/55 transition">
                      <td className="p-3 font-bold">{ord.id}</td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <strong className="font-bold text-slate-800">{ord.customerName}</strong>
                          {ord.customerPhone && <span className="text-[9px] text-slate-500 font-mono">📞 {ord.customerPhone}</span>}
                          {ord.customerEmail && <span className="text-[9px] text-slate-500 font-mono">✉ {ord.customerEmail}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{new Date(ord.orderDate).toLocaleDateString("pt-AO")}</td>
                      <td className="p-3">
                        <div className="max-h-16 overflow-y-auto pr-1">
                          {ord.items.map((it, i) => (
                            <div key={i} className="text-[10px] text-slate-700 font-mono">
                              {it.quantity}x {it.name} <span className="opacity-50">(Kz {it.price.toFixed(0)}/un)</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-sm text-slate-800">
                        Kz {ord.totalValue.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-1.5 py-0.5 w-max text-[9px] font-bold border ${
                            ord.deliveryStatus === "delivered" 
                              ? "bg-emerald-50 border-emerald-400 text-emerald-800" 
                              : ord.deliveryStatus === "preparation"
                              ? "bg-amber-50 border-amber-400 text-amber-800"
                              : ord.deliveryStatus === "shipped"
                              ? "bg-blue-50 border-blue-400 text-blue-800"
                              : "bg-slate-100 border-slate-400 text-slate-800"
                          }`}>
                            {ord.deliveryStatus === "preparation" && "EM PREPARAÇÃO"}
                            {ord.deliveryStatus === "shipped" && "DESPACHADO / EM DESTINO"}
                            {ord.deliveryStatus === "delivered" && "ENTREGUE ✓"}
                            {ord.deliveryStatus === "cancelled" && "CANCELADO ✗"}
                          </span>
                          
                          {/* Quick delivery update controls */}
                          {ord.deliveryStatus !== "delivered" && ord.deliveryStatus !== "cancelled" && (
                            <select 
                              onChange={(e) => updateOrderDeliveryStatus(ord.id, e.target.value as DeliveryStatus)}
                              value={ord.deliveryStatus}
                              className="text-[9px] border bg-transparent p-0.5 focus:outline-none focus:ring-1 focus:ring-slate-900 border-[#141414] font-bold"
                            >
                              <option value="preparation">PREPARO</option>
                              <option value="shipped">DESPACHAR</option>
                              <option value="delivered">ENTREGUE</option>
                              <option value="cancelled">CANCELAR</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 border ${
                            ord.paymentStatus === "paid" 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-400" 
                              : "bg-rose-50 text-rose-800 border-rose-400"
                          }`}>
                            {ord.paymentStatus === "paid" ? "PAGO / INTEGRADO ✓" : "AGUARDANDO PGTO"}
                          </span>
                          
                          <button
                            onClick={() => toggleOrderPaymentStatus(ord.id, ord.paymentStatus)}
                            className="text-[9px] font-mono hover:text-[#141414] text-slate-600 border border-slate-600 hover:bg-slate-100 px-1 py-0.5 w-full text-center transition tracking-tighter"
                          >
                            {ord.paymentStatus === "paid" ? "REVERTER PGTO" : "CONFIRMAR PAGO"}
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <button 
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2 py-1 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] text-[9.5px] font-mono uppercase tracking-wider transition font-medium"
                        >
                          Ver Guia Postal
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 italic">
                        Nenhuma encomenda corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom aggregate helper */}
            <div className="mt-4 flex justify-between items-center text-[10px] font-mono opacity-50">
              <span>SISTEMA DE ENTREGA INTEGRADO - RELATIVO AO PERÍODO OPERANTE</span>
              <span>TOTAL DETECTADO: {filteredOrders.length} ENCOMENDAS</span>
            </div>

          </div>
        )}

        {/* TAB 4: RELATÓRIOS INTELIGENTES EM TEMPO REAL COM IA */}
        {currentTab === "ai-reports" && (
          <div className="bg-white rounded-none border-2 border-[#141414] p-6 shadow-[6px_6px_0px_#141414]" id="reports-tab">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#141414] pb-4 mb-6 gap-3">
              <div>
                <h3 className="text-sm font-mono font-black uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  RELATÓRIO E AUDITORIA INTELIGENTE DA IA
                </h3>
                <p className="text-[11px] opacity-60">Consultoria customizada em tempo real acionada por inteligência artificial Gemini 3.5-flash.</p>
              </div>

              <button 
                onClick={triggerAiAnalysis}
                disabled={isGeneratingReport}
                className="px-4 py-2 bg-[#141414] disabled:bg-[#141414]/60 text-[#E4E3E0] hover:bg-slate-800 text-[10px] font-mono uppercase font-black transition flex items-center gap-2"
              >
                {isGeneratingReport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ATUALIZANDO AUDITORIA...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    RECALCULAR AUDITORIA COM IA
                  </>
                )}
              </button>
            </div>

            {/* AI Error feedback if any */}
            {apiError && (
              <div className="border border-rose-400 bg-rose-50 p-4 mb-6 text-xs text-rose-800 font-mono flex gap-2 items-center">
                <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
                <div>
                  <p className="font-bold">Houve um erro de validação:</p>
                  <p className="opacity-80">{apiError}</p>
                </div>
              </div>
            )}

            {/* Report visual container styled with brutalist newspaper layout */}
            <div className="bg-[#EBEAE7] border-2 border-[#141414] p-8 max-w-3xl mx-auto shadow-sm relative">
              
              {/* Cover layout watermark */}
              <div className="absolute top-4 right-4 text-[9px] font-mono opacity-50 bg-[#141414] text-[#E4E3E0] px-2 py-0.5 uppercase tracking-widest">
                Confidencial / Interno Sênior
              </div>

              <div className="text-center mb-6">
                <span className="text-[10px] uppercase font-mono tracking-widest font-black text-amber-700 bg-white border border-[#141414] px-3 py-1">
                  NEXUS FINANCIAL AUDIT REPORT
                </span>
                <p className="text-[10px] text-slate-500 font-mono uppercase mt-2">DATA DE EMISSÃO: 27/05/2026 UTC · CHAVE_LIVRO: #9102-SYS</p>
              </div>

              {/* Generating report loader widget */}
              {isGeneratingReport ? (
                <div className="text-center py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-[#141414] border-t-amber-400 animate-spin"></div>
                  <p className="font-mono text-xs font-bold text-[#141414] animate-pulse uppercase tracking-wider">
                    Conectando ao modelo Gemini 3.5-flash... Analisando encomendas, fluxo de caixa e projetando faturamentos.
                  </p>
                </div>
              ) : (
                <div className="prose max-w-none text-[#141414]">
                  {aiReport ? (
                    renderBeautifulMarkdown(aiReport)
                  ) : (
                    <div className="text-center py-20 text-slate-500 italic">
                      Nenhum relatório foi gerado ainda. Clique no botão de atualização acima para gerar análises financeiras em tempo real baseadas nas suas encomendas atuais e fluxo de caixa consolidado.
                    </div>
                  )}
                </div>
              )}

              {/* Decorative report footer */}
              <div className="border-t-2 border-[#141414] mt-8 pt-4 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono opacity-60">
                <span>GERADO VIA MOTOR GEMINI INTEGRADO - NEXUS AUTOMATION INC.</span>
                <span>CHAVE DE CRIPTOFOLIO: SHA-256 SINC</span>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER BAR matching the High Density theme design */}
      <footer className="h-9 px-6 border-t-2 border-[#141414] flex items-center justify-between bg-[#D9D8D5] text-[9.5px] font-mono font-bold" id="app-footer">
        <div className="flex gap-4">
          <span>SISTEMA DE GESTÃO FINANCEIRA: V1.4.0</span>
          <span className="opacity-50">|</span>
          <span>FILTRO: {currentTab.toUpperCase()}</span>
          <span className="opacity-50">|</span>
          <span className="hidden sm:inline">PROPRIETÁRIO: {process.env.USER_EMAIL || "ADMINISTRAÇÃO"}</span>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5 font-black text-emerald-800">
            <div className="w-2.5 h-2.5 bg-emerald-600 border border-[#141414]"></div>
            <span>CANAL CRIPTOGRAFADO (SSL)</span>
          </div>
          <span className="opacity-50">|</span>
          <span className="hidden sm:inline text-slate-600">2026-05-27 20:47:00 UTC</span>
        </div>
      </footer>

      {/* ================= MODAL: NOVO LANÇAMENTO DE CAIXA ================= */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-none border-2 border-[#141414] w-full max-w-md p-6 shadow-[8px_8px_0px_#141414]">
            
            <div className="flex justify-between items-center border-b-2 border-[#141414] pb-3 mb-4">
              <h3 className="text-xs font-mono font-black uppercase text-[#141414]">REGISTRAR LANÇAMENTO NO LIVRO-CAIXA</h3>
              <button 
                onClick={() => setIsTxModalOpen(false)}
                className="text-[#141414] hover:text-red-600 font-bold font-mono text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-black uppercase mb-1">Tipo de Lançamento *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTxType("income");
                      setNewTxCategory(AVAILABLE_CATEGORIES.income[0]);
                    }}
                    className={`p-2 font-mono text-xs uppercase font-bold border ${
                      newTxType === "income" 
                        ? "bg-emerald-50 border-emerald-600 text-emerald-800" 
                        : "border-[#141414] bg-[#E4E3E0]"
                    }`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTxType("expense");
                      setNewTxCategory(AVAILABLE_CATEGORIES.expense[0]);
                    }}
                    className={`p-2 font-mono text-xs uppercase font-bold border ${
                      newTxType === "expense" 
                        ? "bg-rose-50 border-rose-600 text-rose-800" 
                        : "border-[#141414] bg-[#E4E3E0]"
                    }`}
                  >
                    Saída (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black uppercase mb-1">Descrição do Lançamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagamento Fornecedor Embalagens, Venda Direta Balcão"
                  value={newTxDescription}
                  onChange={(e) => setNewTxDescription(e.target.value)}
                  className="w-full font-mono text-xs p-2.5 border border-[#141414] focus:ring-1 focus:ring-[#141414] bg-[#E4E3E0]/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase mb-1">Valor Unitário Kz *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={newTxAmount}
                    onChange={(e) => setNewTxAmount(e.target.value)}
                    className="w-full font-mono text-xs p-2.5 border border-[#141414] focus:ring-1 focus:ring-[#141414] bg-[#E4E3E0]/30 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase mb-1">Categoria de Rubrica</label>
                  <select
                    value={newTxCategory}
                    onChange={(e) => setNewTxCategory(e.target.value)}
                    className="w-full font-mono text-xs p-2.5 border border-[#141414] bg-white outline-none"
                  >
                    {newTxType === "income" ? (
                      AVAILABLE_CATEGORIES.income.map(cat => <option key={cat} value={cat}>{cat}</option>)
                    ) : (
                      AVAILABLE_CATEGORIES.expense.map(cat => <option key={cat} value={cat}>{cat}</option>)
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase mb-1">Data Efetiva</label>
                  <input
                    type="date"
                    required
                    value={newTxDate}
                    onChange={(e) => setNewTxDate(e.target.value)}
                    className="w-full font-mono text-xs p-2 border border-[#141414] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black uppercase mb-1">Situação de Liquidação</label>
                  <select
                    value={newTxStatus}
                    onChange={(e) => setNewTxStatus(e.target.value as TransactionStatus)}
                    className="w-full font-mono text-xs p-2 border border-[#141414] bg-white outline-none"
                  >
                    <option value="paid">Efetivado (Dinheiro em Caixa)</option>
                    <option value="pending">Pendente (Previsão Futura)</option>
                  </select>
                </div>
              </div>

              <div className="border border-[#141414]/15 p-3 bg-[#E4E3E0]/20 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={newTxIsRecurring}
                    onChange={(e) => setNewTxIsRecurring(e.target.checked)}
                    className="w-3.5 h-3.5 text-[#141414] border-[#141414] rounded-none"
                  />
                  <label htmlFor="isRecurring" className="text-[10px] font-mono font-black uppercase cursor-pointer">Replicar como Cobrança Recorrente</label>
                </div>

                {newTxIsRecurring && (
                  <div>
                    <label className="block text-[9px] font-mono font-black uppercase mb-1 opacity-70">Período de Recorrência</label>
                    <select
                      value={newTxRecurrence}
                      onChange={(e) => setNewTxRecurrence(e.target.value as any)}
                      className="w-full font-mono text-[10px] p-1.5 border border-[#141414] bg-white outline-none"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 p-2.5 border border-[#141414] font-mono text-xs uppercase font-bold text-[#141414] hover:bg-slate-100 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 p-2.5 bg-[#141414] hover:bg-slate-850 text-[#E4E3E0] font-mono text-xs uppercase font-bold uppercase"
                >
                  Confirmar Lançamento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CADASTRAR NOVA ENCOMENDA ================= */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-none border-2 border-[#141414] w-full max-w-lg p-6 shadow-[8px_8px_0px_#141414] my-8 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b-2 border-[#141414] pb-3 mb-4">
              <h3 className="text-xs font-mono font-black uppercase text-[#141414]">FORMULÁRIO DE ENCOMENDA INTEGRADA</h3>
              <button 
                onClick={() => setIsOrderModalOpen(false)}
                className="text-[#141414] hover:text-red-600 font-bold font-mono text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddOrder} className="space-y-4">
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono font-black uppercase text-amber-900 border-b border-[#141414]/10 pb-1">DADOS CADASTRAIS CLIENTE</h4>
                
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase mb-1">Nome Completo do Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Ferreira da Silva Medeiros"
                    value={newOrderCustomer}
                    onChange={(e) => setNewOrderCustomer(e.target.value)}
                    className="w-full font-mono text-xs p-2 border border-[#141414] bg-[#E4E3E0]/30 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase mb-1">Telefone Celular / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={newOrderPhone}
                      onChange={(e) => setNewOrderPhone(e.target.value)}
                      className="w-full font-mono text-xs p-2 border border-[#141414] bg-[#E4E3E0]/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase mb-1">Email de Contato</label>
                    <input
                      type="email"
                      placeholder="joao@empresa.com"
                      value={newOrderEmail}
                      onChange={(e) => setNewOrderEmail(e.target.value)}
                      className="w-full font-mono text-xs p-2 border border-[#141414] bg-[#E4E3E0]/30 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black uppercase mb-1">Endereço de Expedição Física</label>
                  <input
                    type="text"
                    placeholder="Av. Revolução de Outubro, 102 - Maianga, Luanda"
                    value={newOrderAddress}
                    onChange={(e) => setNewOrderAddress(e.target.value)}
                    className="w-full font-mono text-xs p-2 border border-[#141414] bg-[#E4E3E0]/30 outline-none"
                  />
                </div>
              </div>

              {/* Order items nested list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-[#141414]/10 pb-1">
                  <h4 className="text-[10px] font-mono font-black uppercase text-amber-900">ITENS ADQUIRIDOS NO PEDIDO</h4>
                  <button
                    type="button"
                    onClick={addOrderItemField}
                    className="text-[9px] bg-[#141414] text-[#E4E3E0] hover:bg-slate-800 px-2 py-0.5 font-mono uppercase"
                  >
                    + Linha de Item
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {newOrderItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        placeholder="Nome do produto ou serviço"
                        value={item.name}
                        onChange={(e) => handleOrderItemChange(idx, "name", e.target.value)}
                        className="flex-1 font-mono text-xs p-1.5 border border-[#141414] outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qte"
                        value={item.qty}
                        onChange={(e) => handleOrderItemChange(idx, "qty", Number(e.target.value))}
                        className="w-14 font-mono text-xs p-1.5 border border-[#141414] outline-none text-center"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Valor un."
                        value={item.price || ""}
                        onChange={(e) => handleOrderItemChange(idx, "price", parseFloat(e.target.value))}
                        className="w-24 font-mono text-xs p-1.5 border border-[#141414] outline-none"
                      />
                      {newOrderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrderItemField(idx)}
                          className="text-red-650 font-bold hover:text-red-900 px-1 font-mono"
                          title="Remover produto da lista"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#141414]/15 p-3 bg-[#E4E3E0]/20 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase mb-1">Status de Faturamento Inicial</label>
                  <select
                    value={newOrderPayment}
                    onChange={(e) => setNewOrderPayment(e.target.value as PaymentStatus)}
                    className="w-full font-mono text-xs p-2 border border-[#141414] bg-white outline-none"
                  >
                    <option value="pending">Aguardando Pagamento (Pendente)</option>
                    <option value="paid">Faturado/Pago (Insere no Livro Caixa automaticamente!)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black uppercase mb-1">Anotações Internas / Detalhes</label>
                  <input
                    type="text"
                    placeholder="Requisitos especiais, código de embrulho, etc..."
                    value={newOrderNotes}
                    onChange={(e) => setNewOrderNotes(e.target.value)}
                    className="w-full font-mono text-xs p-2 border border-[#141414] bg-white outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-[#141414] pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="flex-1 p-2.5 border border-[#141414] font-mono text-xs uppercase font-bold text-[#141414] hover:bg-slate-100 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 p-2.5 bg-[#141414] hover:bg-slate-850 text-[#E4E3E0] font-mono text-xs uppercase font-bold uppercase"
                >
                  Registrar Expedição &amp; Faturamento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= DETAILED DRAWER: GUIA POSTAL / ENCOMENDA DETAILS ================= */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#E4E3E0] rounded-none border-2 border-[#141414] w-full max-w-md p-6 shadow-[10px_10px_0px_#141414]">
            
            <div className="flex justify-between items-center border-b-2 border-[#141414] pb-2 mb-4">
              <span className="text-[10px] uppercase font-mono font-black text-amber-700 bg-white px-2 py-0.5 border border-[#141414]">
                GUIA POSTAL OFICIAL DE EMBRULHO
              </span>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-slate-800 hover:text-black font-black text-lg"
              >
                ×
              </button>
            </div>

            <div className="bg-white border-2 border-dashed border-[#141414] p-5 space-y-4 font-mono">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] opacity-60">ID ENCOMENDA:</p>
                  <p className="font-extrabold text-base tracking-tight">{selectedOrder.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] opacity-60">DATA DEPÓSITO:</p>
                  <p className="font-extrabold text-xs">{new Date(selectedOrder.orderDate).toLocaleDateString("pt-AO")}</p>
                </div>
              </div>

              <div className="border-t border-b border-[#141414]/30 py-3 space-y-2">
                <div>
                  <p className="text-[9px] opacity-60">DADOS DO DESTINATÁRIO:</p>
                  <p className="text-xs font-bold uppercase text-[#141414]">{selectedOrder.customerName}</p>
                  {selectedOrder.customerPhone && <p className="text-[10px] text-slate-700">{selectedOrder.customerPhone}</p>}
                </div>

                <div>
                  <p className="text-[9px] opacity-60">ENDEREÇO DE ENTREGA:</p>
                  <p className="text-xs font-semibold text-slate-800">{selectedOrder.deliveryAddress || "NÃO CONFIGURADO (ENTREGA COMERCIAL LOCAL)"}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] opacity-60 mb-2">PRODUTOS EMBALADOS:</p>
                <div className="space-y-1 bg-[#E4E3E0]/20 p-2.5 border border-[#141414]/15">
                  {selectedOrder.items.map((it, i) => (
                    <div key={i} className="text-[10.5px] flex justify-between">
                      <span>• {it.quantity}x {it.name}</span>
                      <span className="font-bold">Kz {(it.quantity * it.price).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#141414]/30 pt-1.5 mt-1.5 flex justify-between font-extrabold text-xs">
                    <span>VALOR DECLARADO:</span>
                    <span className="text-slate-900">Kz {selectedOrder.totalValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="bg-yellow-50 border border-yellow-200 p-2.5 text-[10px] text-yellow-800">
                  <strong className="font-black uppercase block mb-0.5">⚠️ Observações Logística:</strong>
                  {selectedOrder.notes}
                </div>
              )}

              <div className="p-3 bg-[#141414] text-[#E4E3E0] text-[9.5px]">
                <div className="flex justify-between items-center">
                  <span>EXPEDIÇÃO STATUS:</span>
                  <span className="font-black underline uppercase text-yellow-300">
                    {selectedOrder.deliveryStatus === "preparation" ? "Em Preparação" : selectedOrder.deliveryStatus === "shipped" ? "Enviada" : selectedOrder.deliveryStatus === "delivered" ? "Entregue" : "Cancelada"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span>SITUAÇÃO FINANCEIRA:</span>
                  <span className="font-black uppercase text-emerald-400">
                    {selectedOrder.paymentStatus === "paid" ? "SINC_PAGO (CONSOLIDADO)" : "AGUARDANDO LIQUIDAÇÃO"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-[#141414] text-[#E4E3E0] py-2.5 uppercase text-xs font-mono font-bold transition hover:bg-slate-850"
              >
                Concluir Leitura da Guia
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
