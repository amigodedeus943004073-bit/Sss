import React, { useState, useMemo } from "react";
import { Transaction, Order, DashboardMetrics } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap,
  Calendar,
  AlertCircle
} from "lucide-react";

interface DashboardProps {
  transactions: Transaction[];
  orders: Order[];
  metrics: DashboardMetrics;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ transactions, orders, metrics, onNavigate }: DashboardProps) {
  const [hoveredData, setHoveredData] = useState<{ label: string; income: number; expense: number } | null>(null);

  // Parse transactions for the last 7 days or monthly trend
  const trendData = useMemo(() => {
    // Let's group last 6 months or 7 days. Grouping by month is very solid for business
    const months = ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai"];
    // Simulate/Aggregate transaction totals per month for visualization
    const chartMap: Record<string, { income: number; expense: number }> = {
      "Dez": { income: 2400, expense: 1800 },
      "Jan": { income: 3100, expense: 2200 },
      "Fev": { income: 2800, expense: 1950 },
      "Mar": { income: 3900, expense: 2400 },
      "Abr": { income: 4200, expense: 3100 },
      "Mai": { income: 0, expense: 0 } // Current month dynamically filled
    };

    // Calculate current month (May) based on state
    transactions.forEach(tx => {
      chartMap["Mai"].income += tx.type === "income" && tx.status === "paid" ? tx.amount : 0;
      chartMap["Mai"].expense += tx.type === "expense" && tx.status === "paid" ? tx.amount : 0;
    });

    return months.map(m => ({
      label: m,
      income: Math.round(chartMap[m].income),
      expense: Math.round(chartMap[m].expense),
    }));
  }, [transactions]);

  // Max value for scaling SVG chart
  const maxChartValue = useMemo(() => {
    const vals = trendData.flatMap(d => [d.income, d.expense]);
    return Math.max(...vals, 1000) * 1.1; // 10% spacing top
  }, [trendData]);

  // Calculate some insights/alerts
  const financialInsights = useMemo(() => {
    const insights: Array<{ id: string; text: string; type: "alert" | "info" | "success" }> = [];
    
    // Check pending incoming value
    if (metrics.pendingIncome > 0) {
      insights.push({
        id: "ins-1",
        text: `Você possui R$ ${metrics.pendingIncome.toFixed(2)} em recebimentos pendentes de encomendas. Atualize o status para faturar!`,
        type: "info"
      });
    }

    // Check high expense ratio
    if (metrics.totalExpense > metrics.totalIncome * 0.8 && metrics.totalIncome > 0) {
      insights.push({
        id: "ins-2",
        text: "Custos operacionais elevados! Suas despesas ultrapassam 80% do faturamento de caixa este mês.",
        type: "alert"
      });
    } else if (metrics.totalIncome > metrics.totalExpense * 1.5) {
      insights.push({
        id: "ins-3",
        text: "Fluxo de caixa saudável. Receita consolidada cobre folgadamente os custos fixos.",
        type: "success"
      });
    }

    // Check pending orders in preparation
    const prepCount = orders.filter(o => o.deliveryStatus === "preparation").length;
    if (prepCount > 0) {
      insights.push({
        id: "ins-4",
        text: `Existem ${prepCount} encomendas em preparação. Organize o envio para otimizar os custos de logística.`,
        type: "info"
      });
    }

    return insights;
  }, [metrics, orders]);

  return (
    <div className="space-y-6" id="dashboard-tab-container">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-metrics-grid">
        
        {/* Metrica 1: Saldo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition h-full flex flex-col justify-between" id="metric-saldo">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Saldo Atual Líquido</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight" id="balance-value">
              R$ {metrics.currentBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-medium flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> Caixa Realizado
              </span>
              em conta
            </p>
          </div>
        </div>

        {/* Metrica 2: Entrada Total */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition h-full flex flex-col justify-between" id="metric-receitas">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Entradas Consolidadas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">
              R$ {metrics.totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h3>
            {metrics.pendingIncome > 0 ? (
              <p className="text-xs text-blue-600 mt-1 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 animate-pulse" /> + R$ {metrics.pendingIncome.toFixed(2)} previsto
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Nenhum recebível previsto</p>
            )}
          </div>
        </div>

        {/* Metrica 3: Saída Total */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition h-full flex flex-col justify-between" id="metric-despesas">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Saídas Consolidadas</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">
              R$ {metrics.totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h3>
            {metrics.pendingExpense > 0 ? (
              <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> + R$ {metrics.pendingExpense.toFixed(2)} a pagar
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Sem contas pendentes</p>
            )}
          </div>
        </div>

        {/* Metrica 4: Encomendas e Projeção */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition h-full flex flex-col justify-between" id="metric-encomendas">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Previsão Próximos 30d</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">
              R$ {metrics.projectedProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-amber-600 font-medium">
                {metrics.activeOrders} encomendas
              </span>
              em andamento
            </p>
          </div>
        </div>

      </div>

      {/* Main Container: Chart & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-visual-layout">
        
        {/* Custom Interactive SVG Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2" id="dashboard-chart-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Tendência de Fluxo de Caixa</h3>
              <p className="text-sm text-slate-500">Histórico de entradas vs saídas reais executadas (em R$)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-blue-600">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Entradas
              </div>
              <div className="flex items-center gap-1.5 text-rose-500">
                <span className="w-3 h-3 bg-rose-400 rounded-full"></span>
                Saídas
              </div>
            </div>
          </div>

          <div className="relative h-64 w-full flex items-end">
            {/* SVG Visualizer */}
            <svg viewBox="0 0 600 240" className="w-full h-full" id="svg-cashflow-chart">
              {/* Grid Lines */}
              <line x1="40" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="40" y1="90" x2="580" y2="90" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="40" y1="150" x2="580" y2="150" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="40" y1="210" x2="580" y2="210" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Draw bars loop */}
              {trendData.map((data, idx) => {
                const xOffset = 60 + idx * 85;
                const barWidth = 26;
                
                // Scale values
                const incomeHeight = Math.max((data.income / maxChartValue) * 180, 5);
                const expenseHeight = Math.max((data.expense / maxChartValue) * 180, 5);
                
                const incomeY = 210 - incomeHeight;
                const expenseY = 210 - expenseHeight;

                return (
                  <g key={data.label} className="group cursor-pointer">
                    {/* Income Bar */}
                    <rect
                      x={xOffset}
                      y={incomeY}
                      width={barWidth}
                      height={incomeHeight}
                      rx="4"
                      className="fill-blue-500 hover:fill-blue-600 transition-colors duration-200"
                      onMouseEnter={() => setHoveredData(data)}
                      onMouseLeave={() => setHoveredData(null)}
                    />
                    {/* Expense Bar */}
                    <rect
                      x={xOffset + barWidth + 6}
                      y={expenseY}
                      width={barWidth}
                      height={expenseHeight}
                      rx="4"
                      className="fill-rose-400 hover:fill-rose-500 transition-colors duration-200"
                      onMouseEnter={() => setHoveredData(data)}
                      onMouseLeave={() => setHoveredData(null)}
                    />
                    
                    {/* X axis Label */}
                    <text
                      x={xOffset + barWidth}
                      y="230"
                      textAnchor="middle"
                      className="text-xs font-semibold fill-slate-500"
                    >
                      {data.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredData && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-800 flex flex-col gap-1 z-10">
                <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-center text-slate-300">Mês de {hoveredData.label}</p>
                <p className="flex justify-between gap-4">Entradas: <span className="font-mono text-blue-400">R$ {hoveredData.income.toLocaleString()}</span></p>
                <p className="flex justify-between gap-4">Saídas: <span className="font-mono text-rose-400 font-bold">R$ {hoveredData.expense.toLocaleString()}</span></p>
                <p className="flex justify-between gap-4 border-t border-slate-800 pt-1 mt-1 font-bold text-emerald-400">
                  Saldo: <span>R$ {(hoveredData.income - hoveredData.expense).toLocaleString()}</span>
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-between items-center text-xs text-slate-400 border-t border-slate-100 pt-3">
            <span>Legenda: Passe o mouse nas barras para detalhamento por mes.</span>
            <span className="font-medium text-blue-600 cursor-pointer hover:underline flex items-center gap-0.5" onClick={() => onNavigate("flow")}>
              Ver Detalhamento de Fluxo <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Real-time Insights Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="dashboard-insights-card">
          <div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-800">Alertas de Fluxo</h3>
              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-1 rounded-full">Atualizado</span>
            </div>

            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1" id="insights-list">
              {financialInsights.length > 0 ? (
                financialInsights.map((ins) => (
                  <div 
                    key={ins.id} 
                    className={`p-3.5 rounded-xl border text-xs flex gap-2.5 leading-relaxed ${
                      ins.type === "alert" 
                        ? "bg-rose-50/50 border-rose-100 text-rose-800" 
                        : ins.type === "success"
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                        : "bg-slate-50 border-slate-150 text-slate-700"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {ins.type === "alert" ? (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Zap className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p>{ins.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Nenhum alerta relevante no momento. Prontinho!
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6">
            <button 
              onClick={() => onNavigate("reports")}
              className="w-full bg-slate-900 text-white text-xs font-semibold py-3 px-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-sm"
              id="btn-trigger-ai-audit"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              Solicitar Relatório Inteligente IA
            </button>
          </div>
        </div>

      </div>

      {/* Overview/Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-recent-tables">
        
        {/* Recent Transactions List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-slate-800">Transações Recentes</h3>
            <button 
              onClick={() => onNavigate("flow")}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
            >
              Ver Todas
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium text-slate-800 line-clamp-1">{tx.description}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{tx.category}</span>
                    <span>{new Date(tx.date).toLocaleDateString("pt-BR")}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                    {tx.type === "income" ? "+" : "-"} R$ {tx.amount.toFixed(2)}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {tx.status === "paid" ? "Realizado" : "Pendente"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Orders List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-slate-800">Encomendas Pendentes</h3>
            <button 
              onClick={() => onNavigate("orders")}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
            >
              Ver Encomendas
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {orders.filter(o => o.deliveryStatus !== "delivered" && o.deliveryStatus !== "cancelled").slice(0, 5).map((ord) => (
              <div key={ord.id} className="py-3 flex justify-between items-center text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{ord.id}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      ord.deliveryStatus === "preparation" 
                        ? "bg-amber-50 text-amber-700 border border-amber-100" 
                        : "bg-blue-50 text-blue-700 border border-blue-100"
                    }`}>
                      {ord.deliveryStatus === "preparation" ? "Em Preparação" : "Enviado"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Cliente: {ord.customerName}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700">
                    R$ {ord.totalValue.toFixed(2)}
                  </span>
                  <p className={`text-[10px] font-medium mt-0.5 ${ord.paymentStatus === "paid" ? "text-emerald-500" : "text-amber-500"}`}>
                    Pagamento: {ord.paymentStatus === "paid" ? "Pago" : "Pendente"}
                  </p>
                </div>
              </div>
            ))}
            {orders.filter(o => o.deliveryStatus !== "delivered" && o.deliveryStatus !== "cancelled").length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Parabéns! Nenhuma encomenda pendente para entregar no momento.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
