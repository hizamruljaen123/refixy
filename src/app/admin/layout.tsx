"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
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
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Shield, Building, Settings, Home, LogOut, FileText, BarChart3, FolderOpen } from "lucide-react"
import { signOut } from "next-auth/react"
import { Separator } from "@/components/ui/separator"

// Navigation items organized by sections
const navigationGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: Home,
        description: "Admin dashboard overview"
      }
    ]
  },
  {
    label: "User Management",
    items: [
      {
        title: "Users",
        url: "/admin/users",
        icon: Users,
        description: "Manage system users"
      },
      {
        title: "Roles",
        url: "/admin/roles",
        icon: Shield,
        description: "Manage user roles and permissions"
      },
      {
        title: "Units",
        url: "/admin/units",
        icon: Building,
        description: "Manage organizational units"
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
        description: "View and manage all documents"
      },
      {
        title: "Document Analytics",
        url: "/admin/documents/analytics",
        icon: BarChart3,
        description: "Document statistics and reports"
      },
      {
        title: "Document Archive",
        url: "/documents/archive",
        icon: FolderOpen,
        description: "Manage archived documents"
      }
    ]
  }
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const userPermissions = session.user.permissions as string[]
  if (!userPermissions.includes('USER_MANAGE') && !userPermissions.includes('ADMIN')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the admin panel.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="sidebar-header">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Settings className="h-4 w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Admin Panel</span>
              <span className="truncate text-xs text-muted-foreground">
                Document Management System
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
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
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
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="admin-header flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold">
              {(() => {
                for (const group of navigationGroups) {
                  for (const item of group.items) {
                    if (item.url === pathname) {
                      return item.title
                    }
                  }
                }
                return "Admin Panel"
              })()}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Welcome, {session.user.name}</span>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
