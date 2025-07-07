# 🚀 OALIZO - Sistema Completo de E-commerce

Sistema completo de gestão de e-commerce com integração Amazon SP-API, automação de pedidos e dashboard analítico.

## 📁 Estrutura do Projeto

```
oalizo/
├── frontend/          # Next.js 13 + TypeScript + Tailwind CSS
│   ├── app/          # App Router do Next.js
│   ├── components/   # Componentes React reutilizáveis
│   ├── lib/          # Utilitários e configurações
│   ├── hooks/        # Custom React Hooks
│   └── supabase/     # Configurações do Supabase
├── backend/          # Node.js + Express API
│   ├── routes/       # Rotas da API
│   ├── services/     # Lógica de negócio
│   ├── config/       # Configurações
│   └── utils/        # Utilitários do backend
├── scripts/          # Scripts de automação
│   ├── amazonOrdersScheduler.js  # Busca automática de pedidos
│   ├── amazon-orders-processor.js # Processamento de pedidos
│   └── telegramBot.js            # Bot do Telegram
└── deploy/           # Scripts de deploy
```

## 🎯 Funcionalidades Principais

### 📊 **Dashboard Analytics**
- KPIs em tempo real (receita, pedidos, ROI)
- Gráficos de receita por período
- Distribuição por fonte de vendas
- Tabela de pedidos recentes

### 📦 **Gestão de Pedidos**
- Busca automática na Amazon a cada 15 minutos
- Cálculo automático de profit/ROI
- Status tracking completo
- Filtros avançados por status, fonte, data

### 📋 **Inventário**
- Controle de estoque em tempo real
- Histórico de movimentações
- Alertas de baixo estoque
- Gestão de preços de custo

### 🚚 **Logística**
- Tracking de envios
- Gestão de fornecedores
- Status de recebimento
- Arquivo de pedidos antigos

### 🔄 **Devoluções**
- Gestão completa de returns
- Cálculo de reembolsos
- Status tracking
- Histórico arquivado

### 🚫 **Blacklist**
- Sistema de produtos bloqueados
- Monitoramento em tempo real
- Interface para gestão

## 🤖 Automação

### **Amazon Orders Scheduler**
- **Frequência**: A cada 15 minutos
- **Rate Limiting**: 1 request/segundo
- **Retry Logic**: 3 tentativas com backoff
- **Notificações**: Telegram bot integrado

### **Cálculos Automáticos**
- **Taxas Amazon**: Referral fees, FBA fees
- **Profit/ROI**: Cálculo automático baseado em custos
- **Reembolsos**: Processamento automático de devoluções

## 🛠️ Stack Tecnológica

### **Frontend**
- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **State**: React Context + Custom Hooks
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

### **Backend**
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **File Upload**: Multer
- **Logging**: Winston
- **Validation**: Joi

### **Integrações**
- **Amazon SP-API**: Busca automática de pedidos
- **Telegram Bot**: Notificações
- **Supabase**: Database + Auth + Storage

## 🚀 Como Executar

### **Frontend**
```bash
cd frontend
npm install
npm run dev
```

### **Backend**
```bash
cd backend
npm install
npm start
```

### **Scripts de Automação**
```bash
cd scripts
node amazonOrdersScheduler.js
```

## 📈 Métricas e Analytics

- **Revenue Tracking**: Receita por período
- **ROI Analysis**: Análise de retorno sobre investimento
- **Source Distribution**: Distribuição por marketplace
- **Order Trends**: Tendências de pedidos
- **Inventory Turnover**: Giro de estoque

## 🔐 Segurança

- Autenticação via Supabase
- Rate limiting nas APIs
- Validação de dados
- Logs de auditoria
- Backup automático

## 📱 Responsividade

Interface totalmente responsiva com design mobile-first usando Tailwind CSS.

---

**Desenvolvido para OALIZO** - Sistema completo de gestão de e-commerce com foco em automação e analytics. 