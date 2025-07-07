"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserProfile } from "./user-profile"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  ChevronLeft,
  Package2,
  ShoppingCart,
  Truck,
  Menu,
  LayoutDashboard,
  Archive,
  Box,
  RotateCcw,
  Ban
} from "lucide-react"

const sidebarLinks = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/"
  },
  {
    title: "Products",
    icon: Package2,
    href: "/products"
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/orders"
  },
  {
    title: "Logistics",
    icon: Truck,
    href: "/logistics"
  },
  {
    title: "Local Inventory",
    icon: Box,
    href: "/inventory"
  },
  {
    title: "Returns",
    icon: RotateCcw,
    href: "/returns"
  },
  {
    title: "Blacklist",
    icon: Ban,
    href: "/blacklist"
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-card text-card-foreground",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <Package2 className="h-6 w-6 text-card-foreground" />
            <span className="font-bold text-card-foreground">OM Digital</span>
          </Link>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-card-foreground hover:bg-white/10"
          >
            {isCollapsed ? <Menu /> : <ChevronLeft />}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-1 px-2">
          {sidebarLinks.map((link, index) => {
            const Icon = link.icon
            return (
              <Link
                key={index}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-card-foreground/80 transition-colors hover:bg-white/10 hover:text-card-foreground",
                  pathname === link.href && "bg-white/10 text-card-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && <span>{link.title}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
      {!isCollapsed && <UserProfile />}
    </div>
  )
}