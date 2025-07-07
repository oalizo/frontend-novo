export function calculateRefundValues(order: {
  amazon_fee: number | null;
  supplier_shipping: number | null;
  customer_shipping: number | null;
}) {
  const amazonFee = Number(order.amazon_fee || 0);
  const supplierShipping = Number(order.supplier_shipping || 0);
  const customerShipping = Number(order.customer_shipping || 0);

  // Calculate refund fee (20% of amazon_fee)
  const refundFee = Number((amazonFee * 0.20).toFixed(2));

  // Sum all costs (refund fee + shipping costs)
  const totalCosts = refundFee + supplierShipping + customerShipping;

  // Ensure the profit is negative since it represents a cost
  const profit = Number((-totalCosts).toFixed(2));

  return {
    amazonPrice: 0,
    profit: profit,
    margin: 0,
    roi: 0
  };
}