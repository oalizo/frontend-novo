"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"

export type Option = {
  value: string
  label: string
  color?: string
  disabled?: boolean
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  badgeClassName?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
  badgeClassName,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false) // Iniciar fechado
  const [inputValue, setInputValue] = React.useState("")
  
  // Removido o efeito que forçava o dropdown a abrir automaticamente
  
  const handleUnselect = React.useCallback((option: string) => {
    onChange(selected.filter((s) => s !== option))
  }, [onChange, selected])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          handleUnselect(selected[selected.length - 1])
        }
      }
      // This is not a default behavior of the <input /> field
      if (e.key === "Escape") {
        input.blur()
        setOpen(false)
      }
    }
  }, [handleUnselect, selected])

  const selectables = options.filter((option) => !selected.includes(option.value))

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={cn(
        "overflow-visible bg-transparent",
        className
      )}
    >
      <div
        className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-pointer hover:bg-accent hover:text-accent-foreground relative"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="flex gap-1 flex-wrap">
          {selected.map((selectedValue) => {
            const option = options.find((o) => o.value === selectedValue)
            if (!option) return null
            
            return (
              <Badge
                key={selectedValue}
                variant="secondary"
                className={cn(
                  "flex items-center gap-1 rounded-sm px-2 py-0.5",
                  option.color,
                  badgeClassName
                )}
              >
                {option.label}
                <button
                  type="button"
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(selectedValue)
                    }
                  }}
                  onClick={() => handleUnselect(selectedValue)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            )
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            placeholder={selected.length === 0 ? placeholder : undefined}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative">
        {open ? (
          <div className="absolute w-full z-[9999] top-[calc(100%+5px)] left-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in" style={{ position: 'absolute', maxHeight: '300px', overflow: 'auto' }}>
            <div className="flex justify-between items-center p-2 border-b">
              <span className="text-sm font-medium">Select options</span>
              <button 
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                Done
              </button>
            </div>
            <CommandGroup className="h-full overflow-auto max-h-[300px]">
              {open && selectables.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No options available
                </div>
              )}
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "cursor-pointer hover:bg-accent/50 px-2 py-1.5 text-sm rounded-md font-medium",
                      isSelected && "bg-accent",
                      option.disabled && "cursor-not-allowed opacity-50"
                    )}
                    onClick={(e) => {
                      if (option.disabled) return;
                      
                      // Prevenir fechamento do dropdown
                      e.preventDefault();
                      e.stopPropagation();
                      
                      console.log("Clicou em opção:", option.label, "Status atual:", selected);
                      
                      // Atualizar seleção manualmente
                      if (isSelected) {
                        console.log("Removendo status:", option.value);
                        onChange(selected.filter(s => s !== option.value));
                      } else {
                        console.log("Adicionando status:", option.value);
                        onChange([...selected, option.value]);
                      }
                      
                      // Log após atualização
                      setTimeout(() => {
                        console.log("Status após atualização:", selected);
                      }, 100);
                      
                      // Manter dropdown aberto
                      setOpen(true);
                      setInputValue("");
                      setTimeout(() => {
                        inputRef.current?.focus();
                      }, 0);
                    }}
                  >
                    <div className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-full",
                      option.color,
                      "text-foreground"
                    )}>
                      {isSelected && (
                        <span className="mr-2 text-primary">✓</span>
                      )}
                      {option.label}
                    </div>
                  </div>
                )
              })}
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  )
}