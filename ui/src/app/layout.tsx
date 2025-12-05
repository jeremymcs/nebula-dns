import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SafeDNS - Admin Dashboard',
  description: 'SafeDNS Control Plane - DNS Security & Content Filtering',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={`${inter.className} h-full`}>{children}</body>
    </html>
  )
}
