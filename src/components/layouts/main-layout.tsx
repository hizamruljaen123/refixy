"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Home, FileText, Plus, Search, Settings, User, LogOut, Shield, Archive, FolderOpen, BarChart3, Users, MessageSquare, Clock } from "lucide-react"
import { signOut } from "next-auth/react"
import NotificationBell from "@/components/notifications/notification-bell"

// Navigation items organized by sections
const navigationGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: Home,
        description: "Main dashboard overview"
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
        description: "Document statistics and reports"
      }
    ]
  },
  {
    label: "Document Management",
    items: [
      {
        title: "All Documents",
        url: "/documents",
        icon: FileText,
        description: "Browse all documents"
      },
      {
        title: "My Documents",
        url: "/documents/my",
        icon: FolderOpen,
        description: "Documents I own"
      },
      {
        title: "Create Document",
        url: "/documents/create",
        icon: Plus,
        description: "Add new document"
      },
      {
        title: "Advanced Search",
        url: "/documents/search",
        icon: Search,
        description: "Search with filters"
      },
      {
        title: "Archive",
        url: "/documents/archive",
        icon: Archive,
        description: "Archived documents"
      }
    ]
  },
  {
    label: "Workflow",
    items: [
      {
        title: "Pending Review",
        url: "/documents/review",
        icon: MessageSquare,
        description: "Documents awaiting review"
      },
      {
        title: "Recent Activity",
        url: "/documents/activity",
        icon: Clock,
        description: "Recent document activity"
      }
    ]
  }
]

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || status === "loading") {
    return null
  }

  if (!session) {
    return null
  }

  const userPermissions = session.user.permissions as string[]
  const isAdmin = userPermissions.includes('USER_MANAGE') || userPermissions.includes('ADMIN')

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="sidebar-header">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Document Management</span>
            <span className="truncate text-xs text-muted-foreground">
              Instansi DMS
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="sidebar-content">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="sidebar-group">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className="sidebar-menu-button"
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isAdmin && (
          <SidebarGroup className="sidebar-group">
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/admin"}
                    tooltip="Admin Panel"
                    className="sidebar-menu-button"
                  >
                    <a href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 space-y-2">
          <div className="flex items-center gap-2 px-2 py-1 text-sm">
            <User className="h-4 w-4" />
            <span className="truncate">{session.user.name}</span>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => signOut({ callbackUrl: "/" })}
                tooltip="Sign Out"
                className="text-destructive hover:text-destructive sidebar-menu-button"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
