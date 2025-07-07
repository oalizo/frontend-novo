import { Product } from "@/lib/api"

// Estendendo o tipo TableMeta para incluir nossas propriedades personalizadas
export interface ProductTableMeta {
  updateData: (rowIndex: number, field: string, value: number) => void
  refreshing: string | null
}

// Declarando o tipo para as células editáveis
export interface EditableCellProps {
  value: number
  field: string
  row: Product
  rowIndex: number
  onUpdate: (rowIndex: number, field: string, value: number) => void
}
