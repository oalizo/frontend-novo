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
FRONTEND_PORT=9000  # Porta alterada para 9000 já que 3000 e 8080 estão em uso
BACKEND_PORT=3007   # Porta atual do seu backend
NGINX_PORT=5173     # Porta do proxy Nginx

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

# Passo 1: Construir o frontend para produção
print_step "Construindo o frontend para produção"
npm run build || print_error "Falha ao construir o frontend"
print_success "Build do frontend concluído com sucesso"

# Passo 2: Verificar se a pasta do servidor existe, senão cria
print_step "Verificando a pasta no servidor"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR" || print_error "Falha ao criar pasta no servidor"
print_success "Pasta no servidor verificada/criada"

# Passo 3: Atualizar os arquivos .env no servidor
print_step "Configurando arquivos .env no servidor"

# Arquivo .env para o frontend
echo "Enviando .env para o frontend..."
rsync -avz .env $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env || print_error "Falha ao enviar arquivo .env do frontend"

print_success "Arquivos .env configurados no servidor"

# Passo 4: Transferir os arquivos para o servidor
print_step "Transferindo arquivos para o servidor"
rsync -avz --delete --exclude 'node_modules' --exclude '.git' --exclude '.next/cache' ./ $SERVER_USER@$SERVER_IP:$SERVER_DIR/ || print_error "Falha ao transferir arquivos"
print_success "Arquivos transferidos com sucesso"

# Passo 5: Configurar o ambiente no servidor
print_step "Configurando o ambiente no servidor"
ssh $SERVER_USER@$SERVER_IP << EOF
  cd $SERVER_DIR
  
  # Verificar se a porta já está em uso
  PORT_CHECK=\$(netstat -tulpn 2>/dev/null | grep -c ":$FRONTEND_PORT")
  if [ \$PORT_CHECK -gt 0 ]; then
    echo "⚠️ AVISO: A porta $FRONTEND_PORT já está em uso!"
    echo "Processos usando a porta $FRONTEND_PORT:"
    netstat -tulpn 2>/dev/null | grep ":$FRONTEND_PORT"
    echo "Tentando liberar a porta..."
  fi
  
  # Limpar instalação anterior
  echo "Limpando node_modules para instalação limpa..."
  rm -rf node_modules
  
  # Instalar dependências
  echo "Instalando dependências..."
  npm install --legacy-peer-deps || exit 1
  
  # Instalar pacotes adicionais necessários para o multi-select
  echo "Instalando pacotes adicionais para o multi-select..."
  npm install cmdk @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-slot @radix-ui/react-select class-variance-authority react-day-picker date-fns --legacy-peer-deps || exit 1
  
  # Instalar serve globalmente se não estiver instalado
  if ! command -v serve &> /dev/null; then
    echo "Instalando serve globalmente..."
    npm install -g serve || exit 1
  fi
  
  # Verificar e fechar TODAS as sessões screen do frontend
  echo "Verificando e fechando sessões screen do frontend existentes..."
  for SCREEN_ID in \$(screen -ls | grep oalizo_frontend | awk '{print \$1}'); do
    echo "Encerrando sessão screen \$SCREEN_ID..."
    screen -S \$SCREEN_ID -X quit
  done
  sleep 2
  
  # Verificar e fechar sessões screen do scheduler
  echo "Verificando e fechando sessões screen do scheduler existentes..."
  for SCREEN_ID in \$(screen -ls | grep oalizo_scheduler | awk '{print \$1}'); do
    echo "Encerrando sessão screen \$SCREEN_ID..."
    screen -S \$SCREEN_ID -X quit
  done
  sleep 2
  
  # Verificar e fechar sessões screen do bot
  echo "Verificando e fechando sessões screen do telegram bot existentes..."
  for SCREEN_ID in \$(screen -ls | grep oalizo_telegram | awk '{print \$1}'); do
    echo "Encerrando sessão screen \$SCREEN_ID..."
    screen -S \$SCREEN_ID -X quit
  done
  sleep 2
  
  # Iniciar o servidor em uma nova screen
  echo "Iniciando o frontend em uma nova screen..."
  cd $SERVER_DIR
  screen -dmS oalizo_frontend npx serve out -p $FRONTEND_PORT
  
  # Iniciar o scheduler em uma nova screen
  echo "Iniciando o Amazon Orders Scheduler em uma nova screen..."
  cd $SERVER_DIR
  screen -dmS oalizo_scheduler npm run scheduler:start-now
  
  # Iniciar o bot interativo em uma nova screen
  echo "Iniciando o Telegram Bot interativo em uma nova screen..."
  cd $SERVER_DIR
  screen -dmS oalizo_telegram npm run telegram:bot
  
  # Verificar se o serviço está realmente rodando
  echo "Verificando status do serviço..."
  sleep 3
  if netstat -tulpn 2>/dev/null | grep -q ":$FRONTEND_PORT"; then
    echo "✅ Serviço está rodando corretamente na porta $FRONTEND_PORT"
  else
    echo "⚠️ AVISO: O serviço pode não estar rodando corretamente. Verifique com 'screen -list'"
    exit 1
  fi
  
  # Verificar se o scheduler está rodando
  echo "Verificando status do Amazon Orders Scheduler..."
  sleep 2
  if screen -list | grep -q "oalizo_scheduler"; then
    echo "✅ Amazon Orders Scheduler está rodando em screen"
  else
    echo "⚠️ AVISO: Scheduler pode não estar rodando. Verifique com 'screen -list'"
  fi
  
  # Verificar se o bot está rodando
  echo "Verificando status do Telegram Bot..."
  sleep 2
  if screen -list | grep -q "oalizo_telegram"; then
    echo "✅ Telegram Bot está rodando em screen"
  else
    echo "⚠️ AVISO: Bot pode não estar rodando. Verifique com 'screen -list'"
  fi
  
  # Verificar e abrir a porta no firewall
  echo "Verificando se as portas estão abertas no firewall..."
  if command -v ufw &> /dev/null; then
    if ! ufw status | grep -q "$FRONTEND_PORT"; then
      echo "Abrindo porta $FRONTEND_PORT no firewall..."
      ufw allow $FRONTEND_PORT/tcp
    fi
    if ! ufw status | grep -q "$NGINX_PORT"; then
      echo "Abrindo porta $NGINX_PORT no firewall..."
      ufw allow $NGINX_PORT/tcp
    fi
  elif command -v firewall-cmd &> /dev/null; then
    if ! firewall-cmd --list-ports | grep -q "$FRONTEND_PORT"; then
      echo "Abrindo porta $FRONTEND_PORT no firewall..."
      firewall-cmd --zone=public --add-port=$FRONTEND_PORT/tcp --permanent
      firewall-cmd --reload
    fi
    if ! firewall-cmd --list-ports | grep -q "$NGINX_PORT"; then
      echo "Abrindo porta $NGINX_PORT no firewall..."
      firewall-cmd --zone=public --add-port=$NGINX_PORT/tcp --permanent
      firewall-cmd --reload
    fi
  elif command -v iptables &> /dev/null; then
    if ! iptables -L -n | grep -q ":$FRONTEND_PORT"; then
      echo "Abrindo porta $FRONTEND_PORT no firewall..."
      iptables -A INPUT -p tcp --dport $FRONTEND_PORT -j ACCEPT
      if [ -f "/etc/debian_version" ]; then
        iptables-save > /etc/iptables/rules.v4
      elif [ -f "/etc/redhat-release" ]; then
        iptables-save > /etc/sysconfig/iptables
      fi
    fi
    if ! iptables -L -n | grep -q ":$NGINX_PORT"; then
      echo "Abrindo porta $NGINX_PORT no firewall..."
      iptables -A INPUT -p tcp --dport $NGINX_PORT -j ACCEPT
      if [ -f "/etc/debian_version" ]; then
        iptables-save > /etc/iptables/rules.v4
      elif [ -f "/etc/redhat-release" ]; then
        iptables-save > /etc/sysconfig/iptables
      fi
    fi
  else
    echo "Nenhum firewall detectado ou não é possível configurá-lo automaticamente."
    echo "Verifique manualmente se as portas $FRONTEND_PORT e $NGINX_PORT estão abertas."
  fi
  
  # Configuração do Nginx
  cat > /etc/nginx/sites-available/oalizo_frontend << 'NGINX_EOF'
server {
    listen 80;
    server_name app.oalizo.com;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Redirecionamento para a API da Blacklist
    location /api/ {
        proxy_pass http://localhost:3007/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/app.oalizo.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/app.oalizo.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = app.oalizo.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name app.oalizo.com;
    return 404; # managed by Certbot
}
NGINX_EOF
  

  
  # Criar link simbólico se não existir
  if [ ! -f "/etc/nginx/sites-enabled/oalizo_frontend" ]; then
    ln -s /etc/nginx/sites-available/oalizo_frontend /etc/nginx/sites-enabled/oalizo_frontend
  fi
  
  # Reiniciar o Nginx
  nginx -t && systemctl restart nginx
  echo "Configuração do Nginx atualizada e serviço reiniciado."
  
  echo "Processo de deploy concluído no servidor"
EOF

if [ $? -eq 0 ]; then
  print_success "Deploy concluído com sucesso!"
  echo -e "${GREEN}Frontend está agora disponível em: http://$SERVER_IP:5173${NC}"
  echo -e "\n${YELLOW}IMPORTANTE:${NC} Para acessar o frontend através do domínio, use: https://app.oalizo.com"
  echo -e "\n${YELLOW}SERVIÇOS ATIVOS:${NC}"
  echo -e "  📱 Frontend: rodando em screen 'oalizo_frontend'"
  echo -e "  ⏰ Amazon Orders Scheduler: rodando em screen 'oalizo_scheduler' (executa a cada 15 min)"
  echo -e "  🤖 Telegram Bot: rodando em screen 'oalizo_telegram'"
  echo -e "\n${YELLOW}COMANDOS ÚTEIS:${NC}"
  echo -e "  Verificar screens ativas:"
  echo -e "    ${YELLOW}ssh $SERVER_USER@$SERVER_IP \"screen -list\"${NC}"
  echo -e "  Acessar logs do frontend:"
  echo -e "    ${YELLOW}ssh $SERVER_USER@$SERVER_IP \"screen -r oalizo_frontend\"${NC}"
  echo -e "  Acessar logs do scheduler:"
  echo -e "    ${YELLOW}ssh $SERVER_USER@$SERVER_IP \"screen -r oalizo_scheduler\"${NC}"
  echo -e "  Acessar logs do bot:"
  echo -e "    ${YELLOW}ssh $SERVER_USER@$SERVER_IP \"screen -r oalizo_telegram\"${NC}"
  echo -e "  Ver logs do scheduler em arquivo:"
  echo -e "    ${YELLOW}ssh $SERVER_USER@$SERVER_IP \"tail -f $SERVER_DIR/scripts/scheduler.log\"${NC}"
  echo -e "\n${YELLOW}NOTA:${NC} Para sair das screens sem fechá-las, pressione Ctrl+A seguido de D"
else
  print_error "Houve um erro durante o deploy no servidor. Verifique os logs acima."
fi