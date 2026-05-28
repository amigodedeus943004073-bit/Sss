import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A chave GEMINI_API_KEY não está configurada nos Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Inteligent cashflow analysis endpoint using Gemini 3.5-flash
  app.post("/api/analyze-finances", async (req, res) => {
    try {
      const { balance, transactions, orders } = req.body;

      if (!transactions || !orders) {
        return res.status(400).json({ error: "Dados inválidos: transações e encomendas são necessárias." });
      }

      const ai = getAi();
      
      const prompt = `
Você é um Consultor Financeiro Inteligente para Pequenas e Médias Empresas. Analise os seguintes dados financeiros reais da empresa para gerar um Relatório de Fluxo de Caixa Automatizado e Auditoria Estratégica.

DADOS DA EMPRESA:
- Saldo em Caixa Atual: Kz ${balance.toFixed(2)}
- Lista de Transações Recentes (Fluxo de Caixa):
${JSON.stringify(transactions, null, 2)}

- Lista de Encomendas / Pedidos Integrados:
${JSON.stringify(orders, null, 2)}

SUA TAREFA:
Gere um relatório consultivo completo, direto ao ponto e altamente visual em formato Markdown em português de Angola. O relatório deve conter:

1. 📊 DIAGNÓSTICO DE SAÚDE FINANCEIRA:
   - Uma análise clara se as receitas atuais cobrem as despesas.
   - Cálculo e estimativa da taxa de queima (burn rate) ou rentabilidade líquida estimada.
   - Classificação rápida do risco de caixa (Baixo, Médio, Alto).

2. 📈 PROJEÇÃO DE FLUXO DE CAIXA DE 30 DIAS (AUTOMATIZADA):
   - Projete o saldo final estimado se todas as encomendas com status "Pendente" ou "Pago" sejam faturadas e entregues.
   - Identifique pontos de gargalo (dias de maior saída ou baixo saldo).

3. 📦 INSIGHTS DE ENCOMENDAS & FATURAMENTO POTENCIAL:
   - Destaque o valor total de encomendas "Em Preparação" ou "Enviado" que ainda não foram recebidas (faturamento represado).
   - Indique ações recomendadas para acelerar esses recebíveis (ex: automatização de cobrança, otimização de entrega).

4. 💡 3 RECOMENDAÇÕES PRÁTICAS AUTOMATIZADAS:
   - Ofereça 3 sugestões hiperespecíficas baseadas estritamente nos dados recebidos (ex: alertar sobre uma despesa recorrente alta, focar em fechar mais encomendas, antecipar recebíveis ou reduzir custos).

Use estilo executivo de alto padrão, tabelas explicativas simples se necessário, marcadores elegantes e evite clichês de IA. Use a moeda Kwanza (Kz) e comece o texto diretamente com o título do relatório.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
          systemInstruction: "Aja como um analista financeiro sênior extremamente preciso focado em otimização de microempresas. Escreva respostas detalhadas, amigáveis, pragmáticas e que ajudem o empresário a faturar mais e controlar o caixa.",
        }
      });

      const reportText = response.text || "Não foi possível gerar o relatório financeiro.";
      res.json({ report: reportText });

    } catch (error: any) {
      console.error("Erro na análise financeira:", error);
      res.status(500).json({ 
        error: error.message || "Erro interno de processamento na inteligência artificial."
      });
    }
  });

  // Setup Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar o servidor express:", err);
});
