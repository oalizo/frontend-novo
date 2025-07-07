const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://bvbnofnnbfdlnpuswlgy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Ym5vZm5uYmZkbG5wdXN3bGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MzY0NDcsImV4cCI6MjA0ODMxMjQ0N30.-t3fItCTWGLZPN95drtDYgN0FodXsh5bSV6a3jgVPmU'

const supabase = createClient(supabaseUrl, supabaseKey)

// Financial calculation function (copied from financial.ts)
function calculateFinancialMetrics(order) {
  // Get base values and ensure they are numbers
  const amazonPrice = Number(order.amazon_price) || 0
  const amazonFee = Number(order.amazon_fee) || 0
  const supplierPrice = Number(order.supplier_price) || 0
  const supplierTax = Number(order.supplier_tax) || 0
  const supplierShipping = Number(order.supplier_shipping) || 0
  const customerShipping = Number(order.customer_shipping) || 0
  const quantitySold = Number(order.quantity_sold) || 1
  
  // Get order status (lowercase for consistent comparison)
  const orderStatus = order.order_status?.toLowerCase() || ''

  // Special case for canceled orders
  if (orderStatus === 'canceled') {
    return { profit: 0, roi: 0, margin: 0 }
  }
  
  // Special case for refunded orders
  // Profit = -(20% do Amazon Fee + Supplier Price + Supplier Shipping + Customer Shipping)
  if (orderStatus === 'refunded') {
    const refundedProfit = -((amazonFee * 0.2) + supplierPrice + supplierShipping + customerShipping)
    
    // For refunded orders, margin is based on amazon_price (revenue)
    const refundedMargin = amazonPrice !== 0 ? (refundedProfit / amazonPrice) * 100 : 0
    
    // For refunded orders, ROI is based on supplier cost
    const supplierCost = (supplierPrice * quantitySold) + (supplierTax * quantitySold) + supplierShipping
    const refundedRoi = supplierCost !== 0 ? (refundedProfit / supplierCost) * 100 : 0
    
    return {
      profit: Math.round(refundedProfit * 100) / 100,
      roi: Math.round(refundedRoi * 100) / 100,
      margin: Math.round(refundedMargin * 100) / 100
    }
  }

  // Regular calculation for other statuses
  // Calculate total revenue (amazon_price - amazon_fee)
  const totalRevenue = amazonPrice - amazonFee
  
  // Calculate total cost
  // supplier_price e supplier_tax são valores unitários, devem ser multiplicados pela quantidade
  // supplier_shipping e customer_shipping são valores totais
  const totalCost = 
    (supplierPrice * quantitySold) + 
    (supplierTax * quantitySold) + 
    supplierShipping + 
    customerShipping

  // Calculate profit
  const profit = totalRevenue - totalCost

  // Calculate margin (as percentage of revenue)
  const margin = totalRevenue !== 0 ? (profit / totalRevenue) * 100 : 0

  // Calculate ROI (as percentage of cost)
  // supplier_price e supplier_tax são valores unitários multiplicados pela quantidade
  // supplier_shipping e customer_shipping são valores totais
  const supplierCost = (supplierPrice * quantitySold) + (supplierTax * quantitySold) + supplierShipping
  const roi = supplierCost !== 0 ? (profit / supplierCost) * 100 : 0

  return {
    profit: Math.round(profit * 100) / 100,
    roi: Math.round(roi * 100) / 100, 
    margin: Math.round(margin * 100) / 100
  }
}

async function recalculateRefundedOrders() {
  try {
    console.log('🔍 Fetching refunded orders...')
    
    // Get all refunded orders
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_status', 'refunded')
    
    if (fetchError) {
      throw fetchError
    }

    console.log(`📊 Found ${orders.length} refunded orders to process`)
    
    let processedCount = 0
    let errorCount = 0
    
    // Process orders in batches of 10 to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize)
      
      console.log(`⚙️  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(orders.length / batchSize)}...`)
      
      // Process each order in the batch
      const batchPromises = batch.map(async (order) => {
        try {
          // Calculate new financial metrics
          const metrics = calculateFinancialMetrics(order)
          
          // Update the order with new calculations
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              profit: metrics.profit,
              roi: metrics.roi,
              margin: metrics.margin
            })
            .eq('order_item_id', order.order_item_id)
          
          if (updateError) {
            console.error(`❌ Error updating order ${order.order_id}:`, updateError)
            errorCount++
            return false
          }
          
          processedCount++
          return true
        } catch (error) {
          console.error(`❌ Error processing order ${order.order_id}:`, error)
          errorCount++
          return false
        }
      })
      
      // Wait for batch to complete
      await Promise.all(batchPromises)
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('\n✅ Recalculation completed!')
    console.log(`📈 Successfully processed: ${processedCount} orders`)
    console.log(`❌ Errors: ${errorCount} orders`)
    console.log(`📊 Total orders: ${orders.length}`)
    
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
console.log('🚀 Starting refunded orders recalculation...')
recalculateRefundedOrders()
  .then(() => {
    console.log('🎉 Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
