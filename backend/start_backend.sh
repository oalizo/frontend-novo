#!/bin/bash

# Cores para saída no terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configurações
SERVER_USER="root"
SERVER_IP="167.114.223.83"
SERVER_DIR="/root/NewServer/bolt_backend"
BACKEND_PORT=3007

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

# Verificar e fechar todas as sessões do backend existentes
print_step "Verificando e fechando sessões screen do backend existentes"

# Verificar se existem sessões screen do backend
SESSIONS=$(ssh $SERVER_USER@$SERVER_IP "screen -ls | grep -c oalizo_backend" 2>/dev/null || echo "0")
if [ "$SESSIONS" != "0" ]; then
  echo "Encontradas $SESSIONS sessão(ões) do backend. Fechando todas..."
  ssh $SERVER_USER@$SERVER_IP "for SCREEN_ID in \$(screen -ls | grep oalizo_backend | awk '{print \$1}'); do echo \"Encerrando sessão \$SCREEN_ID...\"; screen -S \$SCREEN_ID -X quit; done"
  
  # Aguardar um tempo para garantir que todas as sessões sejam encerradas
  echo "Aguardando 3 segundos para garantir que todas as sessões sejam encerradas..."
  sleep 3
  
  # Verificar novamente
  SESSIONS=$(ssh $SERVER_USER@$SERVER_IP "screen -ls | grep -c oalizo_backend" 2>/dev/null || echo "0")
  if [ "$SESSIONS" != "0" ]; then
    echo "Ainda existem sessões screen do backend. Tentando forçar o fechamento..."
    ssh $SERVER_USER@$SERVER_IP "pkill -f 'SCREEN.*oalizo_backend'" || true
    sleep 2
  fi
else
  echo "Nenhuma sessão screen do backend encontrada."
fi

# Iniciar o backend em uma nova sessão screen
print_step "Iniciando o backend em uma nova sessão screen"
ssh $SERVER_USER@$SERVER_IP "cd $SERVER_DIR && screen -dmS oalizo_backend node index.js" || print_error "Falha ao iniciar o backend"

# Verificar se o backend está rodando
print_step "Verificando se o backend está rodando"
sleep 2
BACKEND_RUNNING=$(ssh $SERVER_USER@$SERVER_IP "netstat -tulpn 2>/dev/null | grep -c :$BACKEND_PORT" 2>/dev/null || echo "0")
if [ "$BACKEND_RUNNING" != "0" ]; then
  print_success "Backend iniciado com sucesso e está rodando na porta $BACKEND_PORT"
  echo -e "\n${YELLOW}NOTA:${NC} O backend está disponível em: http://$SERVER_IP:$BACKEND_PORT"
  
  # Mostrar como acessar os logs
  echo -e "\n${YELLOW}Para visualizar os logs do backend, use:${NC}"
  echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP \"screen -r oalizo_backend\"${NC}"
  echo -e "(Para sair da screen sem fechá-la, pressione Ctrl+A seguido de D)"
else
  print_error "O backend parece não estar rodando. Verifique os logs com 'ssh $SERVER_USER@$SERVER_IP \"screen -r oalizo_backend\"'"
fi 