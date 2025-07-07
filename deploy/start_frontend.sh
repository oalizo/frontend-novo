#!/bin/bash

# Cores para saída no terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configurações
SERVER_USER="root"
SERVER_IP="167.114.223.83"
SERVER_DIR="/root/NewServer/bolt_front"
FRONTEND_PORT=9000
NGINX_PORT=5173

# Funções
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

# Verificar e fechar todas as sessões do frontend existentes
print_step "Verificando e fechando sessões screen do frontend existentes"

# Verificar se existem sessões screen do frontend
SESSIONS=$(ssh $SERVER_USER@$SERVER_IP "screen -ls | grep -c oalizo_frontend" 2>/dev/null || echo "0")
if [ "$SESSIONS" != "0" ]; then
  echo "Encontradas $SESSIONS sessão(ões) do frontend. Fechando todas..."
  ssh $SERVER_USER@$SERVER_IP "for SCREEN_ID in \$(screen -ls | grep oalizo_frontend | awk '{print \$1}'); do echo \"Encerrando sessão \$SCREEN_ID...\"; screen -S \$SCREEN_ID -X quit; done"
  
  # Aguardar um tempo para garantir que todas as sessões sejam encerradas
  echo "Aguardando 3 segundos para garantir que todas as sessões sejam encerradas..."
  sleep 3
  
  # Verificar novamente
  SESSIONS=$(ssh $SERVER_USER@$SERVER_IP "screen -ls | grep -c oalizo_frontend" 2>/dev/null || echo "0")
  if [ "$SESSIONS" != "0" ]; then
    echo "Ainda existem sessões screen do frontend. Tentando forçar o fechamento..."
    ssh $SERVER_USER@$SERVER_IP "pkill -f 'SCREEN.*oalizo_frontend'" || true
    sleep 2
  fi
else
  echo "Nenhuma sessão screen do frontend encontrada."
fi

# Iniciar o frontend em uma nova sessão screen
print_step "Iniciando o frontend em uma nova sessão screen"
ssh $SERVER_USER@$SERVER_IP "cd $SERVER_DIR && screen -dmS oalizo_frontend npx serve out -p $FRONTEND_PORT" || print_error "Falha ao iniciar o frontend"

# Verificar se o frontend está rodando
print_step "Verificando se o frontend está rodando"
sleep 3
FRONTEND_RUNNING=$(ssh $SERVER_USER@$SERVER_IP "netstat -tulpn 2>/dev/null | grep -c :$FRONTEND_PORT" 2>/dev/null || echo "0")
if [ "$FRONTEND_RUNNING" != "0" ]; then
  print_success "Frontend iniciado com sucesso e está rodando na porta $FRONTEND_PORT"
  echo -e "\n${YELLOW}NOTA:${NC} O frontend está disponível em: http://$SERVER_IP:$NGINX_PORT"
  
  # Mostrar como acessar os logs
  echo -e "\n${YELLOW}Para visualizar os logs do frontend, use:${NC}"
  echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP \"screen -r oalizo_frontend\"${NC}"
  echo -e "(Para sair da screen sem fechá-la, pressione Ctrl+A seguido de D)"
else
  print_error "O frontend parece não estar rodando. Verifique os logs com 'ssh $SERVER_USER@$SERVER_IP \"screen -r oalizo_frontend\"'"
fi 