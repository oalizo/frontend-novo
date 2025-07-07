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

# Passo 1: Verificar se a pasta do servidor existe, senão cria
print_step "Verificando a pasta no servidor"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR" || print_error "Falha ao criar pasta no servidor"
print_success "Pasta no servidor verificada/criada"

# Passo 2: Atualizar os arquivos .env no servidor
print_step "Configurando arquivos .env no servidor"

# Arquivo .env para o backend
echo "Enviando .env para o backend..."
rsync -avz .env $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env || print_error "Falha ao enviar arquivo .env do backend"

print_success "Arquivos .env configurados no servidor"

# Passo 3: Transferir os arquivos para o servidor
print_step "Transferindo arquivos para o servidor"

# Criar estrutura do backend se não existir
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR/routes $SERVER_DIR/config $SERVER_DIR/utils $SERVER_DIR/services"

# Copiar arquivos para o servidor
echo "Copiando arquivos para o servidor..."
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='deploy_backend.sh' . $SERVER_USER@$SERVER_IP:$SERVER_DIR/ || print_error "Falha ao transferir arquivos"
print_success "Arquivos transferidos com sucesso"

# Verificar se a porta está aberta no firewall
print_step "Verificando configuração do firewall"
ssh $SERVER_USER@$SERVER_IP << EOF
  # Verificar e abrir a porta no firewall
  echo "Verificando se a porta está aberta no firewall..."
  if command -v ufw &> /dev/null; then
    if ! ufw status | grep -q "$BACKEND_PORT"; then
      echo "Abrindo porta $BACKEND_PORT no firewall..."
      ufw allow $BACKEND_PORT/tcp
    fi
  elif command -v firewall-cmd &> /dev/null; then
    if ! firewall-cmd --list-ports | grep -q "$BACKEND_PORT"; then
      echo "Abrindo porta $BACKEND_PORT no firewall..."
      firewall-cmd --zone=public --add-port=$BACKEND_PORT/tcp --permanent
      firewall-cmd --reload
    fi
  elif command -v iptables &> /dev/null; then
    if ! iptables -L -n | grep -q ":$BACKEND_PORT"; then
      echo "Abrindo porta $BACKEND_PORT no firewall..."
      iptables -A INPUT -p tcp --dport $BACKEND_PORT -j ACCEPT
      if [ -f "/etc/debian_version" ]; then
        iptables-save > /etc/iptables/rules.v4
      elif [ -f "/etc/redhat-release" ]; then
        iptables-save > /etc/sysconfig/iptables
      fi
    fi
  else
    echo "Nenhum firewall detectado ou não é possível configurá-lo automaticamente."
    echo "Verifique manualmente se a porta $BACKEND_PORT está aberta."
  fi
EOF

# Passo 4: Iniciar o backend automaticamente em uma screen
print_step "Iniciando o backend automaticamente"

# Comando para fechar sessões existentes e iniciar uma nova
ssh $SERVER_USER@$SERVER_IP << EOF
  cd $SERVER_DIR
  echo "Verificando e fechando sessões screen do backend existentes..."
  for SCREEN_ID in \$(screen -ls | grep oalizo_backend | awk '{print \$1}'); do 
    echo "Encerrando sessão screen \$SCREEN_ID..."
    screen -S \$SCREEN_ID -X quit
  done
  
  echo "Iniciando o backend em uma nova sessão screen..."
  screen -dmS oalizo_backend node index.js
  
  # Verificar se o backend está rodando
  sleep 3
  if pgrep -f "node.*index.js" > /dev/null; then
    echo "✅ Backend iniciado com sucesso na porta $BACKEND_PORT"
  else
    echo "❌ Falha ao iniciar o backend. Verifique os logs."
  fi
EOF

if [ $? -eq 0 ]; then
  print_success "Deploy do backend concluído com sucesso!"
  echo -e "\n${YELLOW}IMPORTANTE:${NC} O backend foi iniciado automaticamente e está disponível em: http://$SERVER_IP:$BACKEND_PORT"
  
  # Adicionando instruções sobre como verificar e fechar sessões screen existentes
  echo -e "\n${YELLOW}Para verificar o status do backend:${NC}"
  echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP \"screen -ls | grep oalizo_backend\"${NC}"
  
  echo -e "\n${YELLOW}Para visualizar os logs do backend:${NC}"
  echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP \"screen -r oalizo_backend\"${NC}"
  echo -e "(Para sair da screen sem fechá-la, pressione Ctrl+A seguido de D)"
  
  echo -e "\n${YELLOW}Para reiniciar o backend:${NC}"
  echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP \"cd $SERVER_DIR && for SCREEN_ID in \\\$(screen -ls | grep oalizo_backend | awk '{print \\\$1}'); do screen -S \\\$SCREEN_ID -X quit; done && screen -dmS oalizo_backend node index.js\"${NC}"
  
  echo -e "\n${YELLOW}NOTA:${NC} O backend estará disponível em: http://$SERVER_IP:$BACKEND_PORT após ser iniciado"
else
  print_error "Houve um erro durante o deploy do backend no servidor. Verifique os logs acima."
fi
