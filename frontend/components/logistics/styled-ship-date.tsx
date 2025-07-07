"use client"

import { formatDateTime } from "@/lib/utils"
import { getShipDateStyle, getShipDateTitle } from "@/lib/utils/date-styling"

interface StyledShipDateProps {
  date: string | null
  status?: string
  showTime?: boolean
  disableStyle?: boolean
}

export function StyledShipDate({ 
  date, 
  status, 
  showTime = false,
  disableStyle = false
}: StyledShipDateProps) {
  const style = disableStyle ? { background: 'transparent', text: 'inherit' } : getShipDateStyle(date, status)
  const title = getShipDateTitle(date)

  return (
    <div
      className="px-2 py-1 rounded whitespace-pre-line text-center"
      style={{
        backgroundColor: style.background,
        color: style.text
      }}
      title={title}
    >
      {formatDateTime(date, showTime)}
    </div>
  )
}