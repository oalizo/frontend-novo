/**
 * Formata um valor para moeda (USD)
 */
export const formatCurrency = (
  value: number,
  options: Partial<Intl.NumberFormatOptions> = {}
): string => {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
};

/**
 * Formata um número com separadores de milhar
 */
export const formatNumber = (
  value: number,
  options: Partial<Intl.NumberFormatOptions> = {}
): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  });
};

/**
 * Formata um valor para percentual
 */
export const formatPercent = (
  value: number,
  options: Partial<Intl.NumberFormatOptions> = {}
): string => {
  return value.toLocaleString('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...options,
  });
};

/**
 * Formata um valor para compacto (K, M, B)
 */
export const formatCompact = (
  value: number,
  options: Partial<Intl.NumberFormatOptions> = {}
): string => {
  return value.toLocaleString('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    ...options,
  });
};

/**
 * Formata uma data para exibição
 */
export const formatDate = (
  date: Date | string,
  formatStr: string = 'MM/dd/yyyy'
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Implementação simples de formatação de data
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return formatStr
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', year.toString())
      .replace('yy', year.toString().slice(-2));
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
}; 