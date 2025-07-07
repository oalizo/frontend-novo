# Visão Geral do Projeto

Este projeto é uma aplicação web full-stack construída com Next.js para o frontend e um servidor Express.js personalizado para o backend. Ele também se integra com o Supabase.

## Estrutura do Projeto

O projeto está organizado da seguinte forma:

- **`app/`**: Contém a lógica principal do frontend da aplicação Next.js.
    - **`app/page.tsx`**: Página inicial que atualmente carrega um painel de um `iframe` externo.
    - **`app/dashboard/page.tsx`**: O componente principal do dashboard, responsável por buscar e exibir dados de várias fontes.
- **`components/`**: Componentes React reutilizáveis usados em toda a aplicação frontend.
- **`server/`**: Contém o código do backend da aplicação Express.js.
    - **`server/server.ts`**: O ponto de entrada principal para o servidor backend, configurando middlewares e rotas.
    - **`server/routes/`**: Define os endpoints da API do backend.
    - **`server/config/`**: Arquivos de configuração para o backend, como conexão com o banco de dados.
    - **`server/db/`**: Lógica relacionada ao banco de dados.
- **`supabase/`**: Configurações e migrações relacionadas ao Supabase.
- **`public/`**: Ativos estáticos.
- **`lib/`**: Funções utilitárias compartilhadas.
- **`hooks/`**: Hooks React personalizados.

## Frontend

O frontend é construído com Next.js e React. A interface do usuário utiliza componentes de `shadcn/ui` e ícones de `lucide-react`.

- A página principal do dashboard (`app/dashboard/page.tsx`) busca dados de endpoints da API (localizados em `/api/...` que são servidos pelo backend Express) para popular os gráficos e as tabelas.
- A página inicial (`app/page.tsx`) atualmente exibe conteúdo de um `iframe` de `https://visual-data-garden.lovable.app`.

## Backend

O backend é um servidor Express.js escrito em TypeScript e JavaScript.

- O arquivo principal que inicializa o servidor Express e aplica middlewares globais é `server/src/app.js`. Este, por sua vez, é iniciado por `server/src/server.ts`.
- As rotas da API são montadas sob o prefixo `/api`.

### Endpoints da API

Abaixo está uma lista dos endpoints da API identificados:

#### Rotas de Inventário (`/api/inventory`)
Definidas em `server/src/routes/inventory.ts` e montadas através de `server/src/routes/index.ts`.

- **`GET /api/inventory/stats`**: Obtém estatísticas do inventário.
  - Controlado por: `InventoryController.getStats`
- **`GET /api/inventory/`**: Obtém todos os itens do inventário.
  - Controlado por: `InventoryController.getAll`
- **`PUT /api/inventory/:id`**: Atualiza um item do inventário.
  - Parâmetros de URL: `id` (ID do item de inventário)
  - Controlado por: `InventoryController.update`
- **`DELETE /api/inventory/:id`**: Deleta um item do inventário.
  - Parâmetros de URL: `id` (ID do item de inventário)
  - Controlado por: `InventoryController.delete`
- **`GET /api/inventory/:id/history`**: Obtém o histórico de um item do inventário.
  - Parâmetros de URL: `id` (ID do item de inventário)
  - Controlado por: `InventoryController.getHistory`

#### Rotas de Logística (`/api/logistics`)
Definidas em `server/routes/logistics.js` e montadas através de `server/src/routes/index.ts` (que referencia `logisticsRoutes`).

- **`GET /api/logistics/check-exists`**: Verifica se um pedido com um `order_id` e `asin` específicos já existe na logística e não está arquivado.
  - Parâmetros de Query: `order_id`, `asin`
- **`GET /api/logistics/stats`**: Obtém estatísticas sobre as entradas de logística (total, entregues, em trânsito, pendentes, atrasadas) que não estão arquivadas.
- **`GET /api/logistics/`**: Obtém uma lista paginada de entradas de logística.
  - Parâmetros de Query: `page`, `size`, `search` (busca em `supplier_order_id`, `asin`, `title`, `order_id`), `status` (filtra por `order_status`), `store`, `dateFrom`, `dateTo`, `archived` (booleano).
- **`GET /api/logistics/search`**: Busca combinada em entradas de logística ativas e arquivadas.
  - Parâmetros de Query: `page`, `size`, `search`, `status`, `store`, `dateFrom`, `dateTo`.
- **`POST /api/logistics/`**: Cria uma nova entrada de logística.
  - Corpo da Requisição: Objeto com os detalhes da entrada de logística.
  - Nota: Força o `order_status` para 'ordered'.
- **`PUT /api/logistics/:id`**: Atualiza uma entrada de logística existente.
  - Parâmetros de URL: `id` (ID da entrada de logística)
  - Corpo da Requisição: Objeto com os campos a serem atualizados.
  - Nota: Se `order_status` for 'to_inventory', a entrada é movida para a tabela `inventory`.
- **`DELETE /api/logistics/:id`**: Deleta uma entrada de logística.
  - Parâmetros de URL: `id` (ID da entrada de logística)
- **`POST /api/logistics/:id/archive`**: Arquiva uma entrada de logística.
  - Parâmetros de URL: `id` (ID da entrada de logística)
- **`POST /api/logistics/:id/restore`**: Restaura uma entrada de logística arquivada.
  - Parâmetros de URL: `id` (ID da entrada de logística)

#### Rotas de Pedidos (`/api/orders`)
Definidas em `server/routes/orders.js` e também parcialmente em `server/server.js`. Estas parecem ser carregadas diretamente pela instância `app` do Express.

- **`GET /api/orders`**: Obtém uma lista paginada de pedidos.
  - Parâmetros de Query: `page`, `size`, `search` (busca em `order_id`, `supplier_order_id`, `sku`, `asin`, `title`), `status` (filtra por `order_status`), `dateFrom`, `dateTo`.
  - Nota: Calcula `profit`, `margin`, `roi`.
- **`GET /api/orders/stats`**: Obtém estatísticas de pedidos.
  - Parâmetros de Query: `search`, `status`, `dateFrom`, `dateTo`.
- **`PUT /api/orders/:id`**: Atualiza um pedido.
  - Parâmetros de URL: `id` (ID do item do pedido, `order_item_id`)
  - Corpo da Requisição: Campos a serem atualizados.
  - Nota: Lógica especial para atualizar informações de rastreamento (`customer_track_id`). O `order_status` original é preservado durante atualizações de rastreamento. Métricas financeiras são recalculadas.

#### Rotas de Devoluções (`/api/returns`)
Definidas em `server/routes/returns.js`. Estas parecem ser carregadas diretamente pela instância `app` do Express.

- **`GET /api/returns/stats`**: Obtém estatísticas de devoluções.
- **`GET /api/returns`**: Obtém uma lista paginada de devoluções.
  - Parâmetros de Query: `page`, `size`, `search` (busca em `order_id`, `amazon_rma_id`, `asin`, `merchant_sku`), `status` (filtra por `return_request_status`), `dateFrom`, `dateTo`, `archived` (booleano).
- **`GET /api/returns/archived`**: Obtém uma lista paginada de devoluções arquivadas.
  - Parâmetros de Query: `page`, `size`, `search`, `status`, `dateFrom`, `dateTo`.
- **`PUT /api/returns/:id/tracking`**: Atualiza o status de rastreamento de uma devolução.
  - Parâmetros de URL: `id` (`amazon_rma_id`)
  - Corpo da Requisição: `tracking_status`, `provider`, `delivery_info`, `expected_date`, `url_carrier`, `return_request_status`.
- **`POST /api/returns/archive`**: Arquiva múltiplas devoluções.
  - Corpo da Requisição: `{ ids: ["id1", "id2", ...] }` (usa `amazon_rma_id`).
- **`POST /api/returns/restore`**: Restaura múltiplas devoluções arquivadas.
  - Corpo da Requisição: `{ ids: ["id1", "id2", ...] }` (usa `amazon_rma_id`).

#### Rotas de Produtos (`/api/products`)
Referenciadas em `server/src/routes/index.ts`, mas os arquivos de definição (`products.ts` ou `products.js`) não foram encontrados nos locais esperados (`server/src/routes/` ou `server/routes/`). Endpoints desconhecidos por enquanto.

### Inconsistências Notadas
- Há uma mistura de definições de rotas usando `express.Router` (em `server/src/routes/` para inventário) e montagem direta na instância `app` (em `server/routes/` para pedidos e devoluções, e em `server/server.js` para pedidos). Isso pode levar a um comportamento inesperado ou dificuldade de manutenção.
- O `server/src/routes/index.ts` referencia `logisticsRoutes`, `ordersRoutes`, e `productsRoutes` que não têm arquivos `.ts` correspondentes em `server/src/routes/`. Ele provavelmente está resolvendo para os arquivos `.js` em `server/routes/` para logística e pedidos (devido à forma como o Node.js resolve módulos), mas a ausência de `products.js` nesse local é um problema.
- O arquivo `server/server.ts` (na raiz de `server/`) parece ser uma tentativa mais antiga ou alternativa de configurar o servidor, que não está alinhada com a estrutura em `server/src/`. O `server/src/server.ts` parece ser o ponto de entrada atual que usa `server/src/app.js`.

## Supabase

O projeto utiliza o Supabase, possivelmente para banco de dados, autenticação ou outras funcionalidades de backend como serviço. Os arquivos de configuração e migração do Supabase estão localizados no diretório `supabase/`.

## Próximos Passos para Documentação

- Detalhar os principais componentes do frontend.
- Listar e descrever todos os endpoints da API do backend.
- Documentar o esquema do banco de dados (se aplicável).
- Explicar o fluxo de autenticação.
- Adicionar instruções sobre como configurar e executar o projeto localmente.

## Deploy

O deploy do frontend é gerenciado pelo script `deploy.sh` localizado na raiz do projeto.

### Processo de Deploy

O script `deploy.sh` automatiza os seguintes passos:

1.  **Build Local**: Executa `npm run build` para criar uma build de produção otimizada do frontend Next.js. O resultado desta build (geralmente o diretório `out/` para aplicações Next.js configuradas para exportação estática) é o que será enviado ao servidor.
2.  **Transferência de Arquivos**: Utiliza `rsync` para transferir os arquivos da build e outros arquivos necessários (como o `.env`) para o servidor de produção (`$SERVER_IP` definido como `167.114.223.83`, no diretório `$SERVER_DIR` que é `/root/NewServer/bolt_front`).
3.  **Configuração no Servidor**:
    *   Limpa instalações antigas (`node_modules`).
    *   Instala as dependências de produção com `npm install --legacy-peer-deps`.
    *   Instala pacotes adicionais para o componente multi-select.
    *   Garante que o `serve` (um servidor estático para Node.js) esteja instalado globalmente.
    *   Para qualquer instância anterior do frontend rodando em uma `screen` (identificada por `$SCREEN_ID`).
    *   Inicia o frontend usando `npx serve out -p $FRONTEND_PORT` (onde `$FRONTEND_PORT` é 9000) dentro de uma nova sessão `screen` chamada `oalizo_frontend`.
    *   Verifica e configura o firewall (UFW, firewalld, ou iptables) para permitir tráfego nas portas `$FRONTEND_PORT` (9000) e `$NGINX_PORT` (5173).
    *   Atualiza a configuração do Nginx (`/etc/nginx/sites-available/oalizo_frontend`) para fazer proxy das requisições da porta `$NGINX_PORT` (5173) para o servidor `serve` rodando na porta 9000.
    *   Reinicia o serviço Nginx.

### Como Executar o Deploy

Para fazer o deploy de novas alterações no frontend:

1.  Certifique-se de que você está na raiz do projeto localmente.
2.  Execute o script:
    ```bash
    ./deploy.sh
    ```

Isso irá buildar a aplicação, transferir os arquivos para o servidor e reiniciar os serviços necessários.

O frontend estará acessível em `http://167.114.223.83:5173` ou através do domínio configurado (mencionado no script como `https://app.oalizo.com`).

### Verificando o Status no Servidor

-   Para verificar se a `screen` do frontend está rodando:
    ```bash
    ssh root@167.114.223.83 "screen -list | grep oalizo_frontend"
    ```
-   Para ver os logs do frontend (anexar à `screen`):
    ```bash
    ssh root@167.114.223.83 "screen -r oalizo_frontend" 
    ```
    (Use `Ctrl+A` seguido de `D` para desanexar da screen sem pará-la). 