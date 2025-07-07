"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExpandableProductTitleProps {
  title: string
}

export function ExpandableProductTitle({ title }: ExpandableProductTitleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldShowToggle = title.length > 50

  return (
    <div className="group relative flex items-start gap-2 max-w-[300px]">
      <div
        className={cn(
          "text-sm",
          !isExpanded && shouldShowToggle && "line-clamp-1"
        )}
      >
        {title}
      </div>
      
      {shouldShowToggle && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 p-0 hover:bg-accent/50"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Show less" : "Show more"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}