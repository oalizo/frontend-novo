# Plano de Implementação Multi-Loja: Sistema frontend_oalizo

Este documento detalha o plano para transformar o sistema atual (que gerencia uma única loja Amazon) em uma plataforma capaz de gerenciar múltiplas lojas com isolamento completo de dados.

## Sumário Executivo

O projeto atual `frontend_oalizo` oferece gerenciamento de operações de e-commerce (pedidos, inventário, logística) para uma única loja. O objetivo é expandir para suportar múltiplas lojas, permitindo que:

1. Usuários possam selecionar entre diferentes lojas
2. Dados de cada loja fiquem completamente isolados
3. Permissões possam ser atribuídas por loja
4. A interface mantenha-se intuitiva com mínimas alterações

## Estratégia de Migração

### Fase 1: Backup e Nova Infraestrutura

1. **Backup Completo**
   - Exportar todo o banco de dados Supabase atual
   - Criar cópia de segurança do código-fonte completo
   - Documentar a estrutura e relacionamentos atuais

2. **Novo Projeto Supabase**
   - Criar novo projeto no Supabase (recomendado vs. migração in-place)
   - Configurar novos parâmetros de segurança e autenticação
   - Preservar a URL/chave do projeto original para referência

3. **Clonar Código Base**
   - Criar novo repositório para a versão multi-loja
   - Iniciar com cópia limpa do código atual
   - Configurar CI/CD para o novo ambiente

### Fase 2: Design do Novo Banco de Dados

#### Novas Tabelas

```sql
-- Tabela de lojas
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  source TEXT NOT NULL UNIQUE,
  sku_prefix TEXT,
  logo_url TEXT,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de credenciais da Amazon por loja
CREATE TABLE amazon_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  seller_id CHARACTER VARYING(50),
  client_id CHARACTER VARYING(100),
  client_secret CHARACTER VARYING(100),
  refresh_token TEXT,
  marketplace_id CHARACTER VARYING(50),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id)
);

-- Tabela de permissões de loja por usuário
CREATE TABLE user_store_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, store_id)
);
```

#### Modificações em Tabelas Existentes

Adicionar `store_id` como chave estrangeira para todas as tabelas principais:

```sql
-- Exemplo para tabela orders
ALTER TABLE orders 
ADD COLUMN store_id UUID REFERENCES stores(id);

-- Repetir para: inventory, logistics, returns, products, etc.
```

#### Índices para Otimização

```sql
-- Criar índices para melhorar performance em queries filtradas por loja
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_inventory_store_id ON inventory(store_id);
CREATE INDEX idx_logistics_store_id ON logistics(store_id);
-- etc. para todas as tabelas principais
```

### Fase 3: Arquitetura da Aplicação

#### 1. Contexto de Loja

```typescript
// lib/store/context.tsx
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../auth/supabase';
import { useAuth } from '../auth/context';

export type Store = {
  id: string;
  name: string;
  source: string;
  logo_url?: string;
};

type StoreContextType = {
  currentStore: Store | null;
  setCurrentStore: (store: Store) => void;
  availableStores: Store[];
  loading: boolean;
};

const StoreContext = createContext<StoreContextType>({
  currentStore: null,
  setCurrentStore: () => {},
  availableStores: [],
  loading: true,
});

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar lojas que o usuário tem acesso
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadStores = async () => {
      try {
        // Obter lojas que o usuário tem acesso
        const { data, error } = await supabase
          .from('user_store_access')
          .select('store_id, stores(*)')
          .eq('user_id', user.id)
          .join('stores', 'stores.id', 'user_store_access.store_id')
          .eq('stores.is_active', true);

        if (error) throw error;

        const stores = data.map(item => item.stores as Store);
        setAvailableStores(stores);

        // Tentar restaurar da preferência anterior
        const savedStoreId = localStorage.getItem('currentStoreId');
        if (savedStoreId) {
          const savedStore = stores.find(s => s.id === savedStoreId);
          if (savedStore) {
            setCurrentStore(savedStore);
          } else if (stores.length > 0) {
            setCurrentStore(stores[0]);
          }
        } else if (stores.length > 0) {
          setCurrentStore(stores[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar lojas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, [user]);

  // Persistir seleção no localStorage
  const handleSetCurrentStore = (store: Store) => {
    setCurrentStore(store);
    localStorage.setItem('currentStoreId', store.id);
  };

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        setCurrentStore: handleSetCurrentStore,
        availableStores,
        loading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
```

#### 2. Componente Seletor de Loja

```typescript
// components/store-select.tsx
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useStore, Store } from "@/lib/store/context";
import { Badge } from "@/components/ui/badge";

export function StoreSelect() {
  const [open, setOpen] = useState(false);
  const { currentStore, setCurrentStore, availableStores } = useStore();

  if (!currentStore) return null;

  return (
    <div className="w-full px-2 my-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              {currentStore.logo_url && (
                <img 
                  src={currentStore.logo_url} 
                  alt={currentStore.name} 
                  className="w-4 h-4 object-contain" 
                />
              )}
              <span>{currentStore.name}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar loja..." />
            <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
            <CommandGroup>
              {availableStores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={store.id}
                  onSelect={() => {
                    setCurrentStore(store);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentStore.id === store.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {store.logo_url && (
                      <img 
                        src={store.logo_url} 
                        alt={store.name} 
                        className="w-4 h-4 object-contain" 
                      />
                    )}
                    <span>{store.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

#### 3. Modificação do Layout Principal

```typescript
// app/layout.tsx
import { AuthProvider } from "@/lib/auth/context";
import { StoreProvider } from "@/lib/store/context";
import { ThemeProvider } from "@/components/theme-provider";
// Outros imports...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <StoreProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

#### 4. Atualização do Sidebar

```typescript
// components/sidebar.tsx
import { StoreSelect } from "./store-select";
// Outros imports...

export function Sidebar() {
  // Lógica existente...

  return (
    <div className="...">
      <div className="...">
        {/* Logo */}
        <div className="...">
          {/* ... código logo existente ... */}
        </div>
        
        {/* Adicionar seletor de loja abaixo do logo */}
        <StoreSelect />
        
        {/* Navegação existente */}
        <div className="...">
          {/* ... items do menu ... */}
        </div>
      </div>
      
      {/* User profile no rodapé */}
      <UserProfile />
    </div>
  );
}
```

### Fase 4: APIs e Serviços

#### 1. Middleware de Autorização por Loja

```typescript
// middleware/store-access.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function storeAccessMiddleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Verificar autenticação
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
  
  // Extrair store_id da URL ou query params
  const url = new URL(req.url);
  const storeId = url.searchParams.get('store_id');
  
  if (!storeId) {
    // Se não houver store_id, permitir (pode ser uma página sem contexto de loja)
    return res;
  }
  
  // Verificar acesso à loja
  const { data, error } = await supabase
    .from('user_store_access')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('store_id', storeId)
    .maybeSingle();
  
  if (error || !data) {
    // Redirecionar para página de acesso negado ou página inicial
    return NextResponse.redirect(new URL('/access-denied', req.url));
  }
  
  return res;
}
```

#### 2. Adaptação das Rotas de API

```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Extrair parâmetros
  const url = new URL(req.url);
  const storeId = url.searchParams.get('store_id');
  
  // Verificar se foi informado store_id
  if (!storeId) {
    return NextResponse.json({ error: 'store_id é obrigatório' }, { status: 400 });
  }
  
  // Verificar acesso à loja
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  
  // Verificar se usuário tem acesso à loja
  const { data: storeAccess, error: accessError } = await supabase
    .from('user_store_access')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('store_id', storeId)
    .maybeSingle();
  
  if (accessError || !storeAccess) {
    return NextResponse.json({ error: 'Acesso negado à loja' }, { status: 403 });
  }
  
  // Buscar dados filtrados por loja
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

// Implementar abordagem similar para TODAS as rotas da API:
// - orders
// - inventory 
// - logistics
// - returns
// - products
// - dashboard (todos os endpoints)
```

#### 3. Novo Endpoint para Gerenciamento de Lojas

```typescript
// app/api/stores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verificar autenticação
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  
  // Buscar lojas que o usuário tem acesso
  const { data, error } = await supabase
    .from('user_store_access')
    .select('store_id, stores(*)')
    .eq('user_id', session.user.id)
    .join('stores', 'stores.id', 'user_store_access.store_id')
    .eq('stores.is_active', true);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Extrair apenas os dados da loja
  const stores = data.map(item => item.stores);
  
  return NextResponse.json(stores);
}

// POST, PUT, DELETE para gerenciamento de lojas (apenas para admins)
```

#### 4. Adaptação dos Serviços de Integração Amazon

A integração com a API da Amazon precisa ser modificada para usar as credenciais específicas de cada loja. Abaixo estão as principais alterações necessárias:

##### 4.1 Adaptação do serviço amazonService.js

```javascript
// backend/services/amazonService.js

class AmazonService {
  constructor() {
    this.region = 'us-east-1';
    this.host = 'sellingpartnerapi-na.amazon.com';
    this.credentials = null;
    this.storeId = null;
  }

  async setStoreId(storeId) {
    this.storeId = storeId;
    this.credentials = null; // Reset credentials when store changes
    await this.loadCredentials(); // Preload credentials
    return this;
  }

  async loadCredentials() {
    try {
      if (!this.storeId) {
        throw new Error('Store ID must be set before loading credentials');
      }
      
      // Buscar credenciais da Amazon do banco de dados para a loja específica
      const result = await db.query(
        'SELECT * FROM amazon_credentials WHERE store_id = $1 LIMIT 1', 
        [this.storeId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Amazon credentials not found for store ${this.storeId}`);
      }
      
      this.credentials = result.rows[0];
      return this.credentials;
    } catch (error) {
      console.error('Error loading Amazon credentials:', error);
      throw error;
    }
  }

  // Métodos existentes adaptados para usar this.credentials
  async getAccessToken() {
    if (!this.credentials) {
      await this.loadCredentials();
    }

    try {
      const response = await axios.post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refresh_token,
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Error getting Amazon access token:', error);
      throw error;
    }
  }

  // Outros métodos adaptados para usar this.credentials...
}

// Exportar com factory method para facilitar uso
module.exports = {
  // Factory method para criar instância com store_id
  createForStore: async (storeId) => {
    const service = new AmazonService();
    await service.setStoreId(storeId);
    return service;
  }
};
```

##### 4.2 Adaptação do script fetchAmazonOrders.js

```javascript
// scripts/fetchAmazonOrders.js

const { createForStore } = require('../backend/services/amazonService');
const db = require('../backend/db');

async function processOrdersForStore(storeId) {
  console.log(`Fetching orders for store ${storeId}...`);
  
  try {
    // Criar serviço Amazon com credenciais específicas da loja
    const amazonService = await createForStore(storeId);
    
    // Obter e processar pedidos usando o serviço configurado
    const orders = await amazonService.getOrders();
    
    // Processar e salvar pedidos com o store_id correto
    for (const order of orders) {
      await db.query(
        'INSERT INTO orders (order_id, amazon_order_id, ..., store_id) VALUES ($1, $2, ..., $LAST)',
        [order.id, order.amazonOrderId, ..., storeId]
      );
    }
    
    console.log(`Processed ${orders.length} orders for store ${storeId}`);
    return orders.length;
  } catch (error) {
    console.error(`Error processing orders for store ${storeId}:`, error);
    throw error;
  }
}

async function main() {
  try {
    // Se um store_id específico for passado como argumento
    if (process.argv.length > 2) {
      const storeId = process.argv[2];
      await processOrdersForStore(storeId);
      return;
    }
    
    // Caso contrário, processar todas as lojas ativas
    const storesResult = await db.query(
      `SELECT s.id 
       FROM stores s 
       JOIN amazon_credentials ac ON s.id = ac.store_id 
       WHERE s.is_active = true`
    );
    
    console.log(`Processing orders for ${storesResult.rows.length} stores...`);
    
    for (const store of storesResult.rows) {
      try {
        await processOrdersForStore(store.id);
      } catch (error) {
        console.error(`Failed to process store ${store.id}:`, error);
        // Continue with next store
      }
    }
    
    console.log('All stores processed');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
```

##### 4.3 Adaptação do módulo lib/amazon/auth.ts

```typescript
// lib/amazon/auth.ts

import axios from 'axios';
import { supabase } from '../auth/supabase';

// Nova função para obter credenciais específicas da loja
export async function getStoreCredentials(storeId: string) {
  const { data, error } = await supabase
    .from('amazon_credentials')
    .select('*')
    .eq('store_id', storeId)
    .single();
  
  if (error || !data) {
    throw new Error(`Credenciais não encontradas para loja ${storeId}`);
  }
  
  return data;
}

// Função atualizada de autenticação que recebe o storeId
export async function getAccessToken(storeId: string): Promise<string> {
  try {
    // Buscar credenciais específicas da loja
    const credentials = await getStoreCredentials(storeId);
    
    // Implementar rate limiting para evitar erros de API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Função de compatibilidade que usa o contexto de loja atual
// Usada como fallback para código existente
export async function getAccessTokenFromContext(): Promise<string> {
  // Obter store_id do contexto atual (via localStorage ou context API)
  const storeId = localStorage.getItem('currentStoreId');
  
  if (!storeId) {
    throw new Error('No store selected in current context');
  }
  
  return getAccessToken(storeId);
}
```

##### 4.4 Adaptação do módulo lib/amazon/orders.ts

```typescript
// lib/amazon/orders.ts

import { getAccessToken } from './auth';
import axios from 'axios';
import { formatISO } from 'date-fns';

// Função atualizada que requer storeId explícito
export async function fetchAmazonOrders(storeId: string, daysAgo: number = 7) {
  try {
    // Obter token usando credenciais específicas da loja
    const accessToken = await getAccessToken(storeId);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const endpoint = 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders';
    const params = {
      MarketplaceIds: [await getMarketplaceId(storeId)],
      CreatedAfter: formatISO(startDate),
      CreatedBefore: formatISO(endDate),
      MaxResultsPerPage: 100
    };
    
    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params
    });
    
    // Processar e retornar ordens com o store_id incluído
    return response.data.Orders.map(order => ({
      ...order,
      store_id: storeId // Incluir store_id com as ordens
    }));
  } catch (error) {
    console.error('Error fetching Amazon orders:', error);
    throw error;
  }
}

// Função auxiliar para obter MarketplaceId da loja
async function getMarketplaceId(storeId: string): Promise<string> {
  const { data } = await supabase
    .from('amazon_credentials')
    .select('marketplace_id')
    .eq('store_id', storeId)
    .single();
    
  return data.marketplace_id;
}
```

### Fase 5: Interface de Administração

#### 1. Página de Gerenciamento de Lojas com Credenciais Amazon

```typescript
// app/settings/stores/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/auth/supabase';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Esquema de validação de loja
const storeSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
  source: z.string().min(2, { message: 'Código da fonte deve ter pelo menos 2 caracteres.' }),
  sku_prefix: z.string().min(2, { message: 'Prefixo SKU deve ter pelo menos 2 caracteres.' }),
  logo_url: z.string().url().optional().or(z.literal('')),
});

// Esquema de validação de credenciais Amazon
const amazonCredentialsSchema = z.object({
  seller_id: z.string().min(2, { message: 'Seller ID obrigatório' }),
  client_id: z.string().min(2, { message: 'Client ID obrigatório' }),
  client_secret: z.string().min(2, { message: 'Client Secret obrigatório' }),
  refresh_token: z.string().min(2, { message: 'Refresh Token obrigatório' }),
  marketplace_id: z.string().min(2, { message: 'Marketplace ID obrigatório' }),
});

type StoreFormValues = z.infer<typeof storeSchema>;
type AmazonCredentialsFormValues = z.infer<typeof amazonCredentialsSchema>;

export default function StoresManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  
  // Configuração do form - Detalhes da Loja
  const storeForm = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      source: '',
      sku_prefix: '',
      logo_url: '',
    },
  });

  // Configuração do form - Credenciais Amazon
  const amazonForm = useForm<AmazonCredentialsFormValues>({
    resolver: zodResolver(amazonCredentialsSchema),
    defaultValues: {
      seller_id: '',
      client_id: '',
      client_secret: '',
      refresh_token: '',
      marketplace_id: '',
    },
  });

  // Carregar lojas
  useEffect(() => {
    async function fetchStores() {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select(`
            *,
            amazon_credentials(*)
          `)
          .order('name');
          
        if (error) throw error;
        setStores(data || []);
      } catch (error) {
        console.error('Erro ao carregar lojas:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as lojas.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchStores();
  }, [toast]);
  
  // Resetar formulários ao abrir o modal
  const handleOpenDialog = (store = null) => {
    setEditingStore(store);
    setActiveTab('details');
    
    if (store) {
      // Preencher form com dados da loja existente
      storeForm.reset({
        name: store.name,
        source: store.source,
        sku_prefix: store.sku_prefix,
        logo_url: store.logo_url || '',
      });
      
      // Preencher credenciais Amazon se existirem
      if (store.amazon_credentials && store.amazon_credentials.length > 0) {
        const credentials = store.amazon_credentials[0];
        amazonForm.reset({
          seller_id: credentials.seller_id || '',
          client_id: credentials.client_id || '',
          client_secret: credentials.client_secret || '',
          refresh_token: credentials.refresh_token || '',
          marketplace_id: credentials.marketplace_id || '',
        });
      } else {
        amazonForm.reset();
      }
    } else {
      // Resetar forms para nova loja
      storeForm.reset();
      amazonForm.reset();
    }
    
    setDialogOpen(true);
  };
  
  // Adicionar/Atualizar loja
  async function onSubmitStoreDetails(values: StoreFormValues) {
    try {
      let storeData;
      
      if (editingStore) {
        // Atualizar loja existente
        const { data, error } = await supabase
          .from('stores')
          .update(values)
          .eq('id', editingStore.id)
          .select()
          .single();
          
        if (error) throw error;
        storeData = data;
        
        // Atualizar lista de lojas
        setStores(stores.map(s => s.id === storeData.id ? {...s, ...storeData} : s));
        
      } else {
        // Adicionar nova loja
        const { data, error } = await supabase
          .from('stores')
          .insert([values])
          .select()
          .single();
          
        if (error) throw error;
        storeData = data;
        
        // Adicionar à lista de lojas
        setStores([...stores, storeData]);
      }
      
      toast({
        title: 'Sucesso',
        description: `Loja ${values.name} ${editingStore ? 'atualizada' : 'adicionada'} com sucesso.`,
      });
      
      // Se for nova loja e houver campos de Amazon preenchidos, mudar para tab de credenciais
      if (!editingStore && 
          (amazonForm.getValues().seller_id || 
           amazonForm.getValues().client_id || 
           amazonForm.getValues().client_secret)) {
        setEditingStore(storeData);
        setActiveTab('amazon');
      } else if (!editingStore) {
        // Fechar diálogo se for nova loja sem credenciais
        setDialogOpen(false);
      } else {
        // Manter aberto se estiver editando
        setActiveTab('amazon');
      }
      
    } catch (error) {
      console.error('Erro ao salvar loja:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível ${editingStore ? 'atualizar' : 'adicionar'} a loja.`,
        variant: 'destructive',
      });
    }
  }
  
  // Adicionar/Atualizar credenciais Amazon
  async function onSubmitAmazonCredentials(values: AmazonCredentialsFormValues) {
    if (!editingStore) {
      toast({
        title: 'Erro',
        description: 'É necessário primeiro salvar os detalhes da loja.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Verificar se já existem credenciais para esta loja
      const { data: existingCreds } = await supabase
        .from('amazon_credentials')
        .select('*')
        .eq('store_id', editingStore.id)
        .maybeSingle();
      
      let result;
      
      if (existingCreds) {
        // Atualizar credenciais existentes
        const { data, error } = await supabase
          .from('amazon_credentials')
          .update({
            ...values,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCreds.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Inserir novas credenciais
        const { data, error } = await supabase
          .from('amazon_credentials')
          .insert([{
            ...values,
            store_id: editingStore.id
          }])
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      // Atualizar store com credenciais
      setStores(stores.map(s => {
        if (s.id === editingStore.id) {
          return {
            ...s,
            amazon_credentials: [result]
          };
        }
        return s;
      }));
      
      toast({
        title: 'Sucesso',
        description: `Credenciais da Amazon salvas com sucesso.`,
      });
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as credenciais da Amazon.',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Lojas</h1>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>Adicionar Nova Loja</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingStore ? 'Editar Loja' : 'Adicionar Nova Loja'}</DialogTitle>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Detalhes da Loja</TabsTrigger>
                <TabsTrigger value="amazon">Credenciais Amazon</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <Form {...storeForm}>
                  <form onSubmit={storeForm.handleSubmit(onSubmitStoreDetails)} className="space-y-4">
                    <FormField
                      control={storeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Loja</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Amazon Brasil" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={storeForm.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código da Fonte</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: amazon_br" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={storeForm.control}
                      name="sku_prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prefixo SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: SEBR" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={storeForm.control}
                      name="logo_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Logo</FormLabel>
                          <FormControl>
                            <Input placeholder="https://exemplo.com/logo.png" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full">
                      {editingStore ? 'Atualizar Detalhes' : 'Avançar para Credenciais'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="amazon">
                <Form {...amazonForm}>
                  <form onSubmit={amazonForm.handleSubmit(onSubmitAmazonCredentials)} className="space-y-4">
                    <FormField
                      control={amazonForm.control}
                      name="seller_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seller ID</FormLabel>
                          <FormControl>
                            <Input placeholder="ID do vendedor na Amazon" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amazonForm.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client ID</FormLabel>
                          <FormControl>
                            <Input placeholder="ID do cliente da API" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amazonForm.control}
                      name="client_secret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Secret</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Secret do cliente da API" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amazonForm.control}
                      name="refresh_token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Refresh Token</FormLabel>
                          <FormControl>
                            <Input placeholder="Token de atualização" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amazonForm.control}
                      name="marketplace_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marketplace ID</FormLabel>
                          <FormControl>
                            <Input placeholder="ID do marketplace (ex: A2Q3Y263D00KWC)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('details')} className="flex-1">
                        Voltar
                      </Button>
                      <Button type="submit" className="flex-1">
                        Salvar Credenciais
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <div className="flex justify-center">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">{store.name}</CardTitle>
                
                {store.logo_url && (
                  <img 
                    src={store.logo_url} 
                    alt={store.name} 
                    className="w-8 h-8 object-contain" 
                  />
                )}
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Código:</div>
                  <div>{store.source}</div>
                  
                  <div className="font-medium">Prefixo SKU:</div>
                  <div>{store.sku_prefix}</div>
                  
                  <div className="font-medium">Status:</div>
                  <div>{store.is_active ? 'Ativo' : 'Inativo'}</div>
                  
                  <div className="font-medium">Credenciais Amazon:</div>
                  <div>{store.amazon_credentials?.length > 0 ? 'Configuradas' : 'Não configuradas'}</div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleOpenDialog(store)}
                  >
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1">
                    {store.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 2. Gestão de Permissões de Usuário por Loja

```typescript
// app/settings/users/page.tsx
// Interface para associar usuários a lojas específicas com níveis de permissão
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/auth/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function UserStoreManagementPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [userStoreAccess, setUserStoreAccess] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Carregar usuários, lojas e permissões
  useEffect(() => {
    async function fetchData() {
      try {
        // Carregar usuários
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name');
          
        if (userError) throw userError;
        
        // Carregar lojas
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .order('name');
          
        if (storeError) throw storeError;
        
        // Carregar permissões de loja por usuário
        const { data: accessData, error: accessError } = await supabase
          .from('user_store_access')
          .select('*');
          
        if (accessError) throw accessError;
        
        // Organizar dados de acesso
        const accessMap = {};
        accessData.forEach(access => {
          if (!accessMap[access.user_id]) {
            accessMap[access.user_id] = {};
          }
          accessMap[access.user_id][access.store_id] = access.access_level;
        });
        
        setUsers(userData || []);
        setStores(storeData || []);
        setUserStoreAccess(accessMap);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [toast]);
  
  // Atualizar permissão de acesso
  async function updateAccess(userId, storeId, accessLevel) {
    try {
      // Verificar se já existe
      const exists = userStoreAccess[userId]?.[storeId];
      
      if (accessLevel) {
        // Adicionar ou atualizar
        if (exists) {
          await supabase
            .from('user_store_access')
            .update({ access_level: accessLevel })
            .eq('user_id', userId)
            .eq('store_id', storeId);
        } else {
          await supabase
            .from('user_store_access')
            .insert([{
              user_id: userId,
              store_id: storeId,
              access_level: accessLevel
            }]);
        }
      } else {
        // Remover acesso
        if (exists) {
          await supabase
            .from('user_store_access')
            .delete()
            .eq('user_id', userId)
            .eq('store_id', storeId);
        }
      }
      
      // Atualizar estado local
      setUserStoreAccess(prev => {
        const updated = { ...prev };
        if (!updated[userId]) updated[userId] = {};
        
        if (accessLevel) {
          updated[userId][storeId] = accessLevel;
        } else {
          delete updated[userId][storeId];
        }
        
        return updated;
      });
      
      toast({
        title: 'Sucesso',
        description: 'Permissões de acesso atualizadas.',
      });
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as permissões.',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Permissões de Usuários por Loja</h1>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Usuário</th>
              {stores.map(store => (
                <th key={store.id} className="p-2 text-center">{store.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="p-2">
                  {user.first_name} {user.last_name}
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </td>
                
                {stores.map(store => {
                  const accessLevel = userStoreAccess[user.id]?.[store.id] || null;
                  return (
                    <td key={store.id} className="p-2 text-center">
                      <Select
                        value={accessLevel || ""}
                        onValueChange={(value) => 
                          updateAccess(user.id, store.id, value === "" ? null : value)
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Sem acesso" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem acesso</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Fase 6: Scripts de Migração

#### 1. Script de Migração Inicial

```sql
-- 1. Criar tabela de lojas
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  source TEXT NOT NULL UNIQUE,
  sku_prefix TEXT,
  logo_url TEXT,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar tabela de credenciais da Amazon por loja
CREATE TABLE IF NOT EXISTS amazon_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  seller_id VARCHAR(50),
  client_id VARCHAR(100),
  client_secret VARCHAR(100),
  refresh_token TEXT,
  marketplace_id VARCHAR(50),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id)
);

-- 3. Preencher com lojas iniciais (converter da configuração atual)
INSERT INTO stores (name, source, sku_prefix) VALUES
('Amazon Brasil', 'amazon_br', 'AMZB'),
('Shopee', 'shopee', 'SHOP'),
('Mercado Livre', 'mercadolivre', 'MELI'),
('Best Buy', 'bestbuy', 'SE2B'),
('Home Depot', 'homedepot', 'SEHD'),
('Zoro', 'zoro', 'SERZ'),
('Outras', 'other', 'OTH');

-- 4. Adicionar coluna store_id a todas as tabelas principais
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE logistics ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- 5. Migrar dados existentes (usando o campo source e regras de SKU)
-- Para ordens da Amazon
UPDATE orders 
SET store_id = (SELECT id FROM stores WHERE source = 'amazon_br')
WHERE source = 'amazon' OR source IS NULL;

-- 6. Migrar credenciais atuais da Amazon para a primeira loja
INSERT INTO amazon_credentials (
  store_id,
  seller_id,
  client_id,
  client_secret,
  refresh_token,
  marketplace_id
)
SELECT 
  (SELECT id FROM stores WHERE source = 'amazon_br'),
  seller_id,
  client_id,
  client_secret,
  refresh_token,
  marketplace_id
FROM 
  amazon_credentials
WHERE 
  id = (SELECT MAX(id) FROM amazon_credentials)
ON CONFLICT (store_id) DO NOTHING;

-- 7. Tabela de permissões de acesso
CREATE TABLE IF NOT EXISTS user_store_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- 8. Dar acesso inicial aos usuários existentes
INSERT INTO user_store_access (user_id, store_id, access_level)
SELECT 
  auth.users.id, 
  stores.id, 
  'admin' -- Todos os usuários existentes recebem acesso de admin
FROM 
  auth.users
CROSS JOIN 
  stores
ON CONFLICT DO NOTHING;

-- 9. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_logistics_store_id ON logistics(store_id);
CREATE INDEX IF NOT EXISTS idx_returns_store_id ON returns(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_user_store_access_user_id ON user_store_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_store_access_store_id ON user_store_access(store_id);
```

#### 2. Script de Migração de Dados de Produção

```javascript
// scripts/migrateStoreData.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuração de conexão
const oldSupabase = createClient(
  process.env.OLD_SUPABASE_URL,
  process.env.OLD_SUPABASE_SERVICE_KEY
);

const newSupabase = createClient(
  process.env.NEW_SUPABASE_URL,
  process.env.NEW_SUPABASE_SERVICE_KEY
);

async function migrateStoreData() {
  console.log('Iniciando migração de dados...');

  try {
    // 1. Obter mapeamento de lojas
    const { data: stores } = await newSupabase
      .from('stores')
      .select('id, source');
    
    const storeMap = {};
    stores.forEach(store => {
      storeMap[store.source] = store.id;
    });
    
    console.log(`Mapeamento de lojas: ${JSON.stringify(storeMap)}`);

    // 2. Migrar dados para cada tabela principal
    await migrateTable('orders', storeMap);
    await migrateTable('inventory', storeMap);
    await migrateTable('logistics', storeMap);
    await migrateTable('returns', storeMap);
    await migrateTable('products', storeMap);
    
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

async function migrateTable(tableName, storeMap) {
  console.log(`Migrando tabela ${tableName}...`);
  
  // Determinar o tamanho do lote com base na tabela
  const batchSize = 1000;
  let count = 0;
  
  // Obter o total de registros
  const { count: totalCount } = await oldSupabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total de registros em ${tableName}: ${totalCount}`);
  
  // Processar em lotes
  for (let offset = 0; offset < totalCount; offset += batchSize) {
    // Obter dados do supabase antigo
    const { data, error } = await oldSupabase
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error(`Erro ao buscar dados de ${tableName}:`, error);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`Nenhum dado encontrado para ${tableName} no intervalo ${offset}-${offset + batchSize - 1}`);
      continue;
    }
    
    // Transformar dados para adicionar store_id
    const transformedData = data.map(item => {
      // Determinar store_id baseado em regras
      let storeId;
      
      // Regra 1: Usar o campo source se existir
      if (item.source && storeMap[item.source]) {
        storeId = storeMap[item.source];
      } 
      // Regra 2: Verificar pelo prefixo do SKU
      else if (item.sku) {
        const skuPrefix = item.sku.substring(0, 4);
        if (skuPrefix === 'SE2B') storeId = storeMap['bestbuy'];
        else if (skuPrefix === 'SEHD') storeId = storeMap['homedepot'];
        else if (skuPrefix === 'SERZ') storeId = storeMap['zoro'];
        else storeId = storeMap['amazon_br']; // Default para compatibilidade
      }
      // Regra 3: Default para Amazon
      else {
        storeId = storeMap['amazon_br'];
      }
      
      return {
        ...item,
        store_id: storeId
      };
    });
    
    // Inserir no novo Supabase
    const { error: insertError } = await newSupabase
      .from(tableName)
      .insert(transformedData);
    
    if (insertError) {
      console.error(`Erro ao inserir dados em ${tableName}:`, insertError);
      continue;
    }
    
    count += data.length;
    console.log(`Processados ${count} de ${totalCount} registros em ${tableName}`);
  }
  
  console.log(`Migração da tabela ${tableName} concluída. Total: ${count} registros.`);
}

migrateStoreData().catch(console.error);
```

## Fase 7: Teste e Validação

### 1. Plano de Testes

- **Validação de estrutura do banco:**
  - Confirmar criação de tabelas e relações
  - Verificar índices para performance

- **Validação de dados migrados:**
  - Verificar se todos os dados foram migrados corretamente
  - Confirmar store_id atribuído corretamente

- **Teste de autenticação e permissões:**
  - Verificar permissões por loja
  - Testar acesso negado para lojas não autorizadas

- **Testes de interface:**
  - Verificar seletor de loja no sidebar
  - Testar mudança de loja e atualização dos dados
  - Verificar persistência de seleção

- **Testes de API:**
  - Verificar se todos os endpoints respeitam o store_id
  - Testar cenários de erro (store_id ausente, inválido)

### 2. Lista de Verificação de Implementação

- [ ] Criar novo projeto Supabase
- [ ] Executar migrações de esquema
- [ ] Criar tabelas de suporte multi-loja
- [ ] Configurar estrutura de permissões
- [ ] Migrar dados do ambiente de produção
- [ ] Implementar componentes de UI
- [ ] Adaptar APIs para suporte a store_id
- [ ] Implementar interface de administração
- [ ] Realizar testes de validação
- [ ] Atualizar documentação

## Considerações Adicionais

### Desempenho e Otimização

1. **Índices de Banco de Dados:**
   - Índices compostos para consultas frequentes (`store_id, created_at`)
   - Índices para campos de filtro comuns

2. **Caching:**
   - Implementar cache por loja para reduzir consultas
   - Armazenar preferências de usuário em localStorage

3. **Consultas Otimizadas:**
   - Minimizar joins desnecessários
   - Usar consultas parametrizadas

### Segurança

1. **Row Level Security (RLS):**
   - Implementar RLS no Supabase para isolamento de dados por loja
   - Políticas baseadas no acesso do usuário

2. **Validação de Entrada:**
   - Validar store_id em todas as requisições
   - Verificar permissões antes de operações de escrita

3. **Auditoria:**
   - Registrar acessos e alterações por loja
   - Manter histórico de mudanças de permissão

### Escalabilidade Futura

1. **Novas Funcionalidades:**
   - Métricas comparativas entre lojas
   - Consolidação de dados para visão geral
   - Dashboard de múltiplas lojas

2. **Expansão de Integração:**
   - Framework padronizado para novas integrações de marketplace
   - API comum para todas as lojas

3. **Gerenciamento Avançado:**
   - Regras de negócio específicas por loja
   - Permissões granulares por funcionalidade

## Conclusão

Este plano oferece uma abordagem estruturada para transformar o sistema atual em uma plataforma multi-loja com isolamento completo de dados. A abordagem mantém a estrutura existente, adicionando apenas as camadas necessárias para suportar múltiplas lojas, minimizando o impacto nas funcionalidades existentes.

A estratégia de adicionar store_id às tabelas existentes, em vez de criar tabelas separadas por loja, oferece o melhor equilíbrio entre isolamento de dados, facilidade de manutenção e performance. Esta abordagem também facilita a adição de novas lojas sem necessidade de alterações estruturais significativas.