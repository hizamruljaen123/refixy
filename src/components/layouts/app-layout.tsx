"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import MainLayout from "@/components/layouts/main-layout"

// Get current page title based on pathname
function getCurrentPageTitle(pathname: string): string {
  const navigationGroups = [
    {
      items: [
        { title: "Dashboard", url: "/" },
        { title: "Analytics", url: "/analytics" },
        { title: "All Documents", url: "/documents" },
        { title: "My Documents", url: "/documents/my" },
        { title: "Create Document", url: "/documents/create" },
        { title: "Advanced Search", url: "/documents/search" },
        { title: "Archive", url: "/documents/archive" },
        { title: "Pending Review", url: "/documents/review" },
        { title: "Recent Activity", url: "/documents/activity" }
      ]
    }
  ]

  for (const group of navigationGroups) {
    for (const item of group.items) {
      if (item.url === pathname) {
        return item.title
      }
    }
  }

  // Handle dynamic routes
  if (pathname.startsWith('/documents/')) {
    if (pathname === '/documents') return 'All Documents'
    if (pathname === '/documents/create') return 'Create Document'
    if (pathname === '/documents/search') return 'Advanced Search'
    if (pathname.includes('/documents/') && pathname.split('/').length === 3) {
      return 'Document Details'
    }
  }

  return 'Document Management System'
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const pageTitle = mounted ? getCurrentPageTitle(pathname) : 'Loading...'

  if (!mounted) {
    return null
  }

  return (
    <SidebarProvider>
      <MainLayout />
      <SidebarInset>
        <header className="admin-header flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold">
              {pageTitle}
            </h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
