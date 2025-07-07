"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"

interface TruncatedTitleProps {
  title: string
  maxLength?: number
}

export function TruncatedTitle({ title, maxLength = 50 }: TruncatedTitleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = title.length > maxLength

  const displayText = shouldTruncate && !isExpanded 
    ? `${title.slice(0, maxLength)}...` 
    : title

  if (!shouldTruncate) {
    return <div className="font-medium">{title}</div>
  }

  return (
    <div className="flex items-start gap-2">
      <div className="font-medium">{displayText}</div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-5 w-5 p-0 hover:bg-accent hover:text-accent-foreground shrink-0"
        title={isExpanded ? "Mostrar menos" : "Mostrar mais"}
      >
        {isExpanded ? (
          <Minus className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}