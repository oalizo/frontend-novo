"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"

interface CopyButtonProps {
  value: string
  label?: string
}

export function CopyButton({ value, label = "Copy to clipboard" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopy = async () => {
    try {
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        toast({
          description: "Copied to clipboard",
          duration: 2000
        })
        setTimeout(() => setCopied(false), 2000)
      } else {
        throw new Error("Clipboard API not available")
      }
    } catch (err) {
      console.error("Clipboard API failed, trying alternative method", err);
      
      try {
        // Alternative method using temporary element
        const textArea = document.createElement("textarea");
        textArea.value = value;
        
        // Hide temporary element
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        
        // Select and copy text
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        
        // Remove temporary element
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          toast({
            description: "Copied to clipboard",
            duration: 2000
          });
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error("Alternative copy method failed");
        }
      } catch (fallbackErr) {
        console.error("Alternative copy method failed", fallbackErr);
        toast({
          variant: "destructive",
          description: "Failed to copy. Try again or use Ctrl+C manually."
        });
      }
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();  // Previne propagação do evento
              handleCopy();
            }}
            className="h-4 w-4 p-0 hover:bg-accent hover:text-accent-foreground"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}