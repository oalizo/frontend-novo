import "./globals.css"
import { ClientLayout } from "@/components/client-layout"

export const metadata = {
  title: 'OM Digital',
  description: 'Manage your products and orders efficiently',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}