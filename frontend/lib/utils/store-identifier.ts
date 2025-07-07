import { Store } from "@/lib/constants/logistics-statuses"

export function getStoreFromSku(sku: string): Store {
  const prefix = sku.substring(0, 4).toUpperCase()
  
  switch (prefix) {
    case 'SE2B':
      return 'best_buy'
    case 'SERZ':
      return 'zoro'
    case 'SEDH':
      return 'home_depot'
    case 'SEAC':
      return 'acme_tools'
    case 'SEVC':
      return 'vitacost'
    case 'SERW':
      return 'webstaurant'
    case 'SESJ':
      if (sku.startsWith('SESJB')) return 'bjs'
      return 'best_buy' // Default to Best Buy if not BJs
    default:
      return 'best_buy' // Default store
  }
}