import axios from 'axios'

const api = axios.create({
  baseURL: 'http://167.114.223.83:3007/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

export interface Product {
  sku: string
  sku2: string
  asin: string
  availability: string
  quantity: number
  supplier_price: number
  supplier_price_shipping: number
  freight_cost: number
  customer_price_shipping: number
  total_price: number
  lead_time: string
  lead_time_2: number
  handling_time_amz: number
  brand: string
  source: string
  tax_supplier: number
  last_update: string
}

export async function getProducts(params: {
  page?: number
  size?: number
  search?: string
  asin?: string
  sku2?: string
  brand?: string
  availability?: string
  source?: string
}) {
  try {
    const { data } = await api.get('/produtos', { params })
    return data
  } catch (error) {
    console.error('Error fetching products:', error)
    throw new Error('Failed to fetch products')
  }
}

export async function updateProduct(sku2: string, updates: Partial<Product>): Promise<Product> {
  try {
    const { data } = await api.put<Product>(`/produtos/${sku2}`, updates)
    return data
  } catch (error) {
    console.error('Error updating product:', error)
    throw new Error('Failed to update product')
  }
}

export async function deleteProduct(sku2: string, deleteFromAmazon: boolean = false): Promise<void> {
  const endpoint = deleteFromAmazon ? `/produtos/${sku2}/amazon` : `/produtos/${sku2}`
  try {
    await api.delete(endpoint)
  } catch (error) {
    console.error('Error deleting product:', error)
    throw new Error('Failed to delete product')
  }
}

export async function refreshProduct(sku2: string): Promise<{ success: boolean; message: string; product?: Product }> {
  try {
    const { data } = await api.post(`/produtos/${sku2}/refresh`)
    return data
  } catch (error) {
    console.error('Error refreshing product:', error)
    throw new Error('Failed to refresh product')
  }
}

export async function getFilterOptions() {
  try {
    const { data } = await api.get('/produtos/filter-options')
    return data
  } catch (error) {
    console.error('Error loading filter options:', error)
    throw new Error('Failed to load filter options')
  }
}