# Amazon Orders Scheduler 🚀

Sistema de agendamento automático para processamento de pedidos da Amazon a cada 15 minutos usando `node-cron`.

## 📋 Funcionalidades

- ✅ **Execução Automática**: Roda a cada 15 minutos
- ✅ **Rate Limiting**: Respeita limites da API Amazon
- ✅ **Logs Detalhados**: Todos os logs salvos em arquivo
- ✅ **Health Checks**: Monitoramento de memória e uptime
- ✅ **Graceful Shutdown**: Encerramento seguro
- ✅ **Daemon Management**: Start/stop/restart fácil

## 🚀 Como Usar

### Opção 1: Scripts NPM (Recomendado)
```bash
# Iniciar scheduler
npm run scheduler:start

# Iniciar e executar imediatamente
npm run scheduler:start-now

# Verificar status
npm run scheduler:status

# Ver logs
npm run scheduler:logs

# Parar scheduler
npm run scheduler:stop

# Reiniciar
npm run scheduler:restart
```

### Opção 2: Comandos Diretos
```bash
cd scripts

# Iniciar scheduler
node manage-scheduler.js start

# Iniciar e executar imediatamente
node manage-scheduler.js start --run-now

# Verificar status
node manage-scheduler.js status

# Ver últimas 100 linhas de log
node manage-scheduler.js logs 100

# Parar scheduler
node manage-scheduler.js stop

# Reiniciar
node manage-scheduler.js restart
```

## ⏰ Agendamento

- **Processamento de Pedidos**: A cada 15 minutos (`*/15 * * * *`)
- **Health Check**: A cada hora (`0 * * * *`)

## 📝 Logs

Os logs são salvos automaticamente em:
```
scripts/scheduler.log
```

### Tipos de Log:
- ✅ **Sucesso**: Processamento concluído
- ❌ **Erro**: Falhas durante processamento
- 💙 **Health Check**: Status de memória e uptime
- 🚀 **Scheduler**: Eventos de start/stop

## 🔧 Arquivos do Sistema

```
scripts/
├── amazonOrdersScheduler.js    ← Scheduler principal com node-cron
├── manage-scheduler.js         ← Gerenciador do daemon
├── fetchAmazonOrders.js        ← Script original (executado pelo scheduler)
├── amazon-orders-processor.js  ← Lógica de processamento
├── scheduler.log              ← Logs do scheduler
├── .scheduler.pid             ← PID do processo (auto-criado)
└── README-Scheduler.md        ← Esta documentação
```

## 💻 Monitoramento

### Verificar se está rodando:
```bash
npm run scheduler:status
```

### Ver logs em tempo real:
```bash
tail -f scripts/scheduler.log
```

### Verificar uso de memória:
Os health checks mostram uso de memória automaticamente nos logs.

## 🛠️ Configuração

O scheduler usa as mesmas configurações do `amazon-orders-processor.js`:

- **Rate Limits**: Conforme documentação Amazon SP-API
- **Retry Logic**: Exponential backoff com jitter
- **Database**: Configuração no script processor

## 🚨 Troubleshooting

### Scheduler não inicia:
```bash
# Verificar se já está rodando
npm run scheduler:status

# Se travado, forçar parada e reiniciar
npm run scheduler:stop
npm run scheduler:start
```

### Ver erros recentes:
```bash
npm run scheduler:logs 50
```

### Executar manualmente para debug:
```bash
npm run fetch-orders
```

## ⚡ Vantagens vs Cron do Sistema

| node-cron | cron sistema |
|-----------|--------------|
| ✅ Não precisa configurar servidor | ❌ Requer acesso root/sudo |
| ✅ Logs integrados | ❌ Configuração manual de logs |
| ✅ Fácil deploy | ❌ Configuração por servidor |
| ✅ Gerenciamento via npm scripts | ❌ Comandos crontab |
| ✅ Health checks integrados | ❌ Monitoramento manual |

## 🔄 Para Produção

1. **Iniciar o scheduler**:
   ```bash
   npm run scheduler:start
   ```

2. **Verificar se está rodando**:
   ```bash
   npm run scheduler:status
   ```

3. **Monitorar logs**:
   ```bash
   tail -f scripts/scheduler.log
   ```

4. **Configurar como serviço** (opcional):
   Use PM2 ou similar para garantir que o scheduler reinicie automaticamente se o servidor reiniciar.

## 📊 Performance

- **Memória**: ~50-100MB durante execução
- **CPU**: Baixo uso, apenas durante processamento
- **Logs**: Rotação manual recomendada (limpar scheduler.log periodicamente)

---

**🎯 Pronto para produção!** O scheduler roda de forma completamente autônoma. ⚡
