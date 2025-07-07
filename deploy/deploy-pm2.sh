#!/bin/bash

# Script de Deploy Padronizado com PM2
# Versão: 3.0
# Data: 2025-01-02
# Descrição: Deploy automatizado usando PM2 para frontend e backend

# Cores para saída no terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações do Servidor
SERVER_USER="root"
SERVER_IP="167.114.223.83"
PROJECT_NAME="oalizo"
FRONTEND_DIR="/root/NewServer/bolt_front"
BACKEND_DIR="/root/NewServer/bolt_backend/backend"
FRONTEND_PORT=9000
BACKEND_PORT=3007

# Configurações PM2
PM2_FRONTEND_NAME="${PROJECT_NAME}_frontend"
PM2_BACKEND_NAME="${PROJECT_NAME}_backend"

# Funções utilitárias
print_step() {
  echo -e "${YELLOW}\n=== $1 ===${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Verificar se estamos no diretório correto
check_project_directory() {
  if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Execute este script a partir do diretório raiz do projeto (onde está o package.json e pasta backend)"
  fi
}

# Passo 1: Verificações iniciais
print_step "Verificações iniciais"
check_project_directory
print_success "Diretório do projeto verificado"

# Passo 2: Build do frontend
print_step "Construindo o frontend para produção"
npm run build || print_error "Falha ao construir o frontend"
print_success "Build do frontend concluído"

# Passo 3: Preparar estrutura no servidor
print_step "Preparando estrutura no servidor"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $FRONTEND_DIR $BACKEND_DIR" || print_error "Falha ao criar diretórios no servidor"
print_success "Estrutura do servidor preparada"

# Passo 4: Transferir arquivos
print_step "Transferindo arquivos para o servidor"

# Transferir frontend
echo "Transferindo arquivos do frontend..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next/cache' \
  --exclude '.env.local' \
  --exclude 'backend' \
  ./ $SERVER_USER@$SERVER_IP:$FRONTEND_DIR/ || print_error "Falha ao transferir frontend"

# Transferir backend
echo "Transferindo arquivos do backend..."
rsync -avz --delete \
  --exclude 'node_modules' \
  ./backend/ $SERVER_USER@$SERVER_IP:$BACKEND_DIR/ || print_error "Falha ao transferir backend"

print_success "Arquivos transferidos com sucesso"

# Passo 5: Configurar e instalar dependências
print_step "Configurando ambiente no servidor"
ssh $SERVER_USER@$SERVER_IP << EOF
set -e  # Parar em caso de erro

# Instalar PM2 globalmente se não estiver instalado
if ! command -v pm2 &> /dev/null; then
  echo "Instalando PM2 globalmente..."
  npm install -g pm2
fi

# Instalar serve globalmente para servir arquivos estáticos
if ! command -v serve &> /dev/null; then
  echo "Instalando serve globalmente..."
  npm install -g serve
fi

# Instalar dependências do frontend
echo "Instalando dependências do frontend..."
cd $FRONTEND_DIR
npm install --legacy-peer-deps

# Instalar dependências do backend
echo "Instalando dependências do backend..."
cd $BACKEND_DIR
npm install

echo "✅ Dependências instaladas com sucesso"
EOF

print_success "Ambiente configurado no servidor"

# Passo 6: Criar arquivos de configuração PM2
print_step "Criando configurações PM2"

# Criar ecosystem.config.js no servidor
ssh $SERVER_USER@$SERVER_IP << EOF
cd /root/NewServer

cat > ecosystem.config.js << PM2_CONFIG
module.exports = {
  apps: [
    {
      name: '${PM2_FRONTEND_NAME}',
      script: 'serve',
      args: 'out -p ${FRONTEND_PORT} -l 0.0.0.0',
      cwd: '${FRONTEND_DIR}',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: ${FRONTEND_PORT}
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    },
    {
      name: '${PM2_BACKEND_NAME}',
      script: 'index.js',
      cwd: '${BACKEND_DIR}',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: ${BACKEND_PORT}
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};
PM2_CONFIG

# Criar diretório de logs
mkdir -p /root/NewServer/logs

echo "✅ Configurações PM2 criadas"
EOF

print_success "Configurações PM2 criadas"

# Passo 7: Parar processos antigos
print_step "Parando processos antigos"
ssh $SERVER_USER@$SERVER_IP << EOF
cd /root/NewServer

# Parar e remover aplicações PM2 existentes
pm2 stop ${PM2_FRONTEND_NAME} 2>/dev/null || true
pm2 stop ${PM2_BACKEND_NAME} 2>/dev/null || true
pm2 delete ${PM2_FRONTEND_NAME} 2>/dev/null || true
pm2 delete ${PM2_BACKEND_NAME} 2>/dev/null || true

# Parar screens antigos se existirem
echo "Verificando e fechando sessões screen antigas..."
for SCREEN_ID in \$(screen -ls 2>/dev/null | grep -E "(oalizo_|backend)" | awk '{print \$1}' | cut -d. -f1); do
  if [ ! -z "\$SCREEN_ID" ]; then
    echo "Encerrando sessão screen \$SCREEN_ID..."
    screen -S \$SCREEN_ID -X quit 2>/dev/null || true
  fi
done

# Matar processos nas portas se necessário
echo "Verificando portas ${FRONTEND_PORT} e ${BACKEND_PORT}..."
fuser -k ${FRONTEND_PORT}/tcp 2>/dev/null || true
fuser -k ${BACKEND_PORT}/tcp 2>/dev/null || true

sleep 3
echo "✅ Processos antigos parados"
EOF

print_success "Processos antigos parados"

# Passo 8: Iniciar aplicações com PM2
print_step "Iniciando aplicações com PM2"
ssh $SERVER_USER@$SERVER_IP << EOF
cd /root/NewServer

# Iniciar aplicações usando o ecosystem.config.js
pm2 start ecosystem.config.js

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup systemd -u root --hp /root 2>/dev/null || true

sleep 5

echo "✅ Aplicações iniciadas com PM2"
EOF

print_success "Aplicações iniciadas com PM2"

# Passo 9: Verificar status
print_step "Verificando status das aplicações"
ssh $SERVER_USER@$SERVER_IP << EOF
cd /root/NewServer

echo "=== Status PM2 ==="
pm2 status

echo -e "\n=== Verificando portas ==="
echo "Frontend (porta ${FRONTEND_PORT}):"
if netstat -tulpn 2>/dev/null | grep -q ":${FRONTEND_PORT}"; then
  echo "✅ Frontend está rodando na porta ${FRONTEND_PORT}"
else
  echo "❌ Frontend NÃO está rodando na porta ${FRONTEND_PORT}"
fi

echo "Backend (porta ${BACKEND_PORT}):"
if netstat -tulpn 2>/dev/null | grep -q ":${BACKEND_PORT}"; then
  echo "✅ Backend está rodando na porta ${BACKEND_PORT}"
else
  echo "❌ Backend NÃO está rodando na porta ${BACKEND_PORT}"
fi

echo -e "\n=== Logs recentes ==="
echo "Frontend logs:"
pm2 logs ${PM2_FRONTEND_NAME} --lines 5 --nostream 2>/dev/null || echo "Sem logs do frontend ainda"

echo -e "\nBackend logs:"
pm2 logs ${PM2_BACKEND_NAME} --lines 5 --nostream 2>/dev/null || echo "Sem logs do backend ainda"
EOF

print_success "Verificação de status concluída"

# Passo 10: Configurar firewall
print_step "Configurando firewall"
ssh $SERVER_USER@$SERVER_IP << EOF
# Verificar e abrir portas no firewall
echo "Verificando firewall..."
if command -v ufw &> /dev/null; then
  ufw allow ${FRONTEND_PORT}/tcp 2>/dev/null || true
  ufw allow ${BACKEND_PORT}/tcp 2>/dev/null || true
  echo "✅ Portas abertas no UFW"
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --zone=public --add-port=${FRONTEND_PORT}/tcp --permanent 2>/dev/null || true
  firewall-cmd --zone=public --add-port=${BACKEND_PORT}/tcp --permanent 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
  echo "✅ Portas abertas no firewalld"
else
  echo "⚠️ Firewall não detectado - verifique manualmente as portas ${FRONTEND_PORT} e ${BACKEND_PORT}"
fi
EOF

print_success "Firewall configurado"

# Resumo final
print_step "Deploy concluído com sucesso!"
print_info "Frontend: http://${SERVER_IP}:${FRONTEND_PORT}"
print_info "Backend API: http://${SERVER_IP}:${BACKEND_PORT}"
print_info ""
print_info "Comandos úteis no servidor:"
print_info "  pm2 status                    # Ver status das aplicações"
print_info "  pm2 logs ${PM2_FRONTEND_NAME}           # Ver logs do frontend"
print_info "  pm2 logs ${PM2_BACKEND_NAME}            # Ver logs do backend"
print_info "  pm2 restart ${PM2_FRONTEND_NAME}        # Reiniciar frontend"
print_info "  pm2 restart ${PM2_BACKEND_NAME}         # Reiniciar backend"
print_info "  pm2 monit                     # Monitor em tempo real"
print_info ""
print_success "🚀 Deploy finalizado! Aplicações rodando com PM2."
