"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth/context"
import { Toaster } from "@/components/ui/toaster"
import { ProtectedLayout } from "./protected-layout"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <ProtectedLayout>{children}</ProtectedLayout>
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  )
}