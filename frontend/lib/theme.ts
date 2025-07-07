/**
 * Tema claro para o dashboard
 */

export const lightTheme = {
  // Cores primárias
  primary: {
    main: '#3B82F6',     // Azul principal (blue-500)
    light: '#93C5FD',    // Azul claro (blue-300)
    dark: '#1E40AF',     // Azul escuro (blue-800)
    contrast: '#FFFFFF', // Texto sobre azul
  },
  
  // Cores secundárias
  secondary: {
    main: '#10B981',     // Verde (emerald-500)
    light: '#6EE7B7',    // Verde claro (emerald-300)
    dark: '#047857',     // Verde escuro (emerald-700)
    contrast: '#FFFFFF', // Texto sobre verde
  },
  
  // Alertas e indicadores
  warning: '#F59E0B',    // Âmbar (amber-500)
  error: '#EF4444',      // Vermelho (red-500)
  info: '#3B82F6',       // Azul (blue-500)
  success: '#10B981',    // Verde (emerald-500)
  
  // Cores de fundo
  background: {
    default: '#FFFFFF',  // Branco (fundo geral)
    paper: '#F8FAFC',    // Cinza muito claro (slate-50) para cards
    card: '#FFFFFF',     // Branco para cards
    hover: '#F1F5F9',    // Cinza claro para hover (slate-100)
  },
  
  // Cores de texto
  text: {
    primary: '#1E293B',   // Cinza escuro (slate-800)
    secondary: '#64748B', // Cinza médio (slate-500)
    disabled: '#94A3B8',  // Cinza claro (slate-400)
  },
  
  // Bordas e separadores
  border: '#E2E8F0',      // Cinza muito claro (slate-200)
  divider: '#E2E8F0',     // Cinza muito claro (slate-200)
  
  // Gráficos
  chart: {
    revenue: '#3B82F6',   // Azul (blue-500) para receita
    profit: '#10B981',    // Verde (emerald-500) para lucro
    cost: '#F59E0B',      // Âmbar (amber-500) para custos
    loss: '#EF4444',      // Vermelho (red-500) para perdas
    
    // Cores adicionais para gráficos de pizza/barra
    series: [
      '#3B82F6', // Azul (blue-500)
      '#10B981', // Verde (emerald-500)
      '#F59E0B', // Âmbar (amber-500)
      '#6366F1', // Indigo (indigo-500)
      '#8B5CF6', // Violeta (violet-500)
      '#EC4899', // Rosa (pink-500)
      '#14B8A6', // Teal (teal-500)
      '#0EA5E9', // Azul claro (sky-500)
      '#22D3EE', // Ciano (cyan-500)
      '#84CC16', // Verde lima (lime-500)
    ],
  },
  
  // Sombras
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  
  // Arredondamento
  borderRadius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  }
};

export default lightTheme; 