/**
 * Utility functions for calculating profit, margin, and ROI for orders
 * Correctly handles orders with quantity > 1
 */

export interface ProfitCalculationInput {
  amazonPrice: number | null;
  amazonFee: number | null;
  supplierPrice: number | null;
  supplierTax: number | null;
  supplierShipping: number | null;
  customerShipping: number | null;
  quantitySold: number | null;
  bundleQty?: number | null; // Mantido para compatibilidade, mas não usado
}

export interface ProfitCalculationResult {
  profit: number;
  margin: number;
  roi: number;
}

/**
 * Calculate profit, margin, and ROI for an order
 * Correctly handles orders with quantity > 1
 */
export function calculateProfit(input: ProfitCalculationInput): ProfitCalculationResult {
  // Garantir que todos os valores sejam números válidos
  const amazonPrice = Number(input.amazonPrice || 0);
  const amazonFee = Number(input.amazonFee || 0);
  const supplierPrice = Number(input.supplierPrice || 0);
  const supplierTax = Number(input.supplierTax || 0);
  const supplierShipping = Number(input.supplierShipping || 0);
  const customerShipping = Number(input.customerShipping || 0);
  const quantitySold = Number(input.quantitySold || 1);
  
  // Calcular receita total (amazon_price e amazon_fee já são valores totais)
  const totalRevenue = amazonPrice - amazonFee;
  
  // Calcular custos totais
  // supplier_price e supplier_tax são valores unitários, devem ser multiplicados pela quantidade
  // supplier_shipping e customer_shipping são valores totais
  const totalCosts = 
    (supplierPrice * quantitySold) + 
    (supplierTax * quantitySold) + 
    supplierShipping + 
    customerShipping;
  
  // Calcular lucro
  const profit = totalRevenue - totalCosts;
  
  // Calcular margem (profit / revenue * 100)
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  
  // Calcular ROI (profit / cost * 100)
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  
  return {
    profit: Number(profit.toFixed(2)),
    margin: Number(margin.toFixed(2)),
    roi: Number(roi.toFixed(2))
  };
}
