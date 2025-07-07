# Plano de Migração da Funcionalidade Blacklist

Este documento detalha os arquivos, configurações e passos necessários para migrar a funcionalidade de blacklist para um novo servidor.

## 1. Visão Geral da Funcionalidade

A funcionalidade de blacklist permite aos usuários adicionar ASINs (Amazon Standard Identification Number) e marcas inteiras a uma lista de restrição. A interface web permite inserção manual, upload de CSV, listagem e verificação de status da API da Amazon. O backend lida com a lógica de negócios, interação com a Amazon Selling Partner API (SP-API) e persistência de dados em um banco de dados PostgreSQL.

## 2. Arquivos de Código Essenciais

É crucial migrar os seguintes arquivos e seus respectivos diretórios completos:

### 2.1. Frontend (Interface do Usuário)

*   **Arquivo:** `public/blacklist.html`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/public/blacklist.html`
    *   **Descrição:** Contém toda a estrutura HTML da interface da blacklist e o código JavaScript embutido que gerencia as interações do usuário, chamadas AJAX para o backend, e a lógica de Server-Sent Events (SSE) para atualizações em tempo real.

### 2.2. Backend - Rotas da API

*   **Arquivo:** `src/routes/blacklistRoutes.js`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/routes/blacklistRoutes.js`
    *   **Descrição:** Define todas as rotas da API Express para a funcionalidade de blacklist. Inclui endpoints para listar, adicionar (ASIN/marca), verificar ASIN, fazer upload de CSV, e a rota de stream para SSE (`/api/blacklist/brand/stream`). Também inclui a rota para verificar o status da API Amazon (`/api/amazon/status`).

### 2.3. Backend - Lógica de Negócios e Integração Amazon

*   **Arquivo:** `src/services/amazonSpService.js`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/services/amazonSpService.js`
    *   **Descrição:** Componente central da lógica de backend. Responsável por:
        *   Interagir com a Amazon Selling Partner API (SP-API) para buscar informações de ASINs e marcas.
        *   Processar ASINs individualmente e marcas inteiras (fornecendo callbacks de progresso para a rota SSE).
        *   Salvar e recuperar dados da tabela `black_list` no banco de dados.
        *   Verificar o status da conexão com a SP-API.

### 2.4. Backend - Configuração e Autenticação Amazon

*   **Arquivo:** `src/config/amazon.js`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/config/amazon.js`
    *   **Descrição:** Gerencia a autenticação com a SP-API. Suas responsabilidades incluem:
        *   Carregar credenciais do arquivo `amazon_credentials.json`.
        *   Implementar a rotação entre múltiplas credenciais da Amazon.
        *   Obter, armazenar em cache e renovar tokens de acesso da SP-API.
        *   Lidar com erros de autenticação e implementar lógica de retentativa.

*   **Arquivo:** `src/config/amazon_credentials.json`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/config/amazon_credentials.json`
    *   **Descrição:** **ARQUIVO ALTAMENTE SENSÍVEL.** Contém as credenciais reais (client ID, client secret, refresh token) para acessar a SP-API. **Este arquivo NÃO deve ser versionado em repositórios públicos e deve ser gerenciado de forma segura (ex: variáveis de ambiente ou secret manager) no novo servidor.**

### 2.5. Backend - Configuração do Banco de Dados

*   **Arquivo:** `src/config/database.js`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/config/database.js`
    *   **Descrição:** Configura a conexão com o banco de dados PostgreSQL usando a biblioteca `pg`. **Atualmente, as credenciais do banco de dados (usuário, senha, host, porta, nome do banco) estão hardcoded neste arquivo. Elas DEVEM ser migradas para variáveis de ambiente ou um sistema de gerenciamento de segredos no novo servidor.**

### 2.6. Backend - Utilitários

*   **Arquivo:** `src/utils/logger.js`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/utils/logger.js`
    *   **Descrição:** Logger customizado que grava mensagens em `../../logs/server.log` (relativo ao diretório `src/utils`) e no console. (Nota: Logs de nível `info` estão atualmente configurados para serem ignorados no arquivo de log).

*   **Arquivo:** `src/utils/retryUtils.js`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/utils/retryUtils.js`
    *   **Descrição:** Fornece a função `withRetry` utilizada para tentar novamente operações assíncronas falhadas (especialmente chamadas à SP-API) com uma estratégia de exponential backoff e jitter.

*   **Arquivo:** `src/utils/rateLimiter.js`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/utils/rateLimiter.js`
    *   **Descrição:** Implementa rate limiting para chamadas à API da Amazon e para o processo de autenticação, utilizando a biblioteca `limiter` para controlar a frequência das requisições.

### 2.7. Estrutura do Servidor Principal (Referência)

*   **Arquivo:** `src/server.js`
    *   **Diretório Completo:** `/Users/elizandromoreira/Desktop/OMD/ship/USAR-ESSE-2025/src/server.js`
    *   **Descrição:** Arquivo principal que configura e inicia o servidor Express. Mostra como as `blacklistRoutes` são montadas e como o arquivo `public/blacklist.html` é servido estaticamente.

## 3. Checklist para Migração

1.  **Transferir Arquivos de Código:**
    *   Copiar todos os arquivos listados na seção 2 para a estrutura de diretórios correspondente no novo servidor.

2.  **Configurar Ambiente do Novo Servidor:**
    *   **Node.js e npm/yarn:** Garantir que estão instalados.
    *   **Dependências do Projeto:** Obter o arquivo `package.json` do projeto original (não visualizado, mas essencial) e executar `npm install` (ou `yarn install`) no novo servidor para instalar todas as bibliotecas (Express, pg, axios, multer, csv-parser, amazon-sp-api, limiter, etc.).
    *   **Credenciais da Amazon SP-API:**
        *   Transferir `src/config/amazon_credentials.json` de forma segura.
        *   **RECOMENDAÇÃO:** Modificar `src/config/amazon.js` para ler estas credenciais de variáveis de ambiente ou de um secret manager no novo servidor, em vez de usar o arquivo JSON diretamente.
    *   **Diretório de Logs:** Criar o diretório `logs` (ex: `/raiz_do_projeto/logs`) se o logging de arquivo for mantido, conforme configurado em `src/utils/logger.js`.

3.  **Configurar Banco de Dados PostgreSQL:**
    *   **Instância do Banco:** Provisionar um servidor PostgreSQL acessível pelo novo servidor de aplicação.
    *   **Credenciais do Banco:**
        *   Modificar `src/config/database.js` para usar variáveis de ambiente para as credenciais do banco de dados (usuário, senha, host, porta, nome do banco).
    *   **Schema da Tabela `black_list`:**
        *   Obter o DDL (Data Definition Language) da tabela `black_list` do banco de dados original e executá-lo no novo banco. As colunas esperadas incluem `id` (serial, primary key), `asin` (text, unique), `brand` (text), `created_at` (timestamp, default now()). Verificar se há índices adicionais.
    *   **Migração de Dados (Opcional):** Se os dados existentes na blacklist precisarem ser mantidos, realizar um backup/dump da tabela `black_list` do banco de dados antigo e restaurar/importar no novo.

4.  **Variáveis de Ambiente Adicionais:**
    *   Verificar se há outras variáveis de ambiente que o servidor (`src/server.js`) ou outras partes da aplicação possam necessitar (ex: `PORT` para o servidor Express, configurações de ambiente `NODE_ENV`).

5.  **Testes Exaustivos:**
    *   Após a configuração, testar todas as funcionalidades da interface da blacklist:
        *   Adicionar ASIN individualmente.
        *   Adicionar ASINs por marca (verificar o feedback em tempo real via SSE).
        *   Fazer upload de um arquivo CSV.
        *   Listar e filtrar os itens na blacklist.
        *   Verificar o status da API Amazon.
        *   Remover um ASIN da blacklist (se a funcionalidade existir e for migrada).
    *   Monitorar os logs do servidor para identificar e corrigir quaisquer erros.

## 4. Considerações de Segurança e Melhorias Pós-Migração

*   **Gerenciamento de Segredos:** Priorizar a remoção de todas as credenciais hardcoded (Amazon SP-API e banco de dados) dos arquivos de código. Utilizar variáveis de ambiente, arquivos de configuração não versionados e protegidos, ou um sistema de gerenciamento de segredos (como HashiCorp Vault, AWS Secrets Manager, etc.).
*   **Logging:** Revisar a configuração do logger (`src/utils/logger.js`), especialmente a decisão de ignorar logs de nível `info`, e ajustar conforme necessário para o novo ambiente de produção/desenvolvimento.
*   **Controle de Acesso:** Garantir que as permissões de arquivo e diretório no novo servidor estejam configuradas corretamente, especialmente para arquivos sensíveis.

Este plano deve fornecer à equipe de migração as informações necessárias para uma transição bem-sucedida da funcionalidade de blacklist.
