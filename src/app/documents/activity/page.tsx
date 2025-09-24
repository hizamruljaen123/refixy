"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Activity, Clock, User, FileText, Eye } from "lucide-react"
import AppLayout from "@/components/layouts/app-layout"

interface ActivityEvent {
  id: string
  event_type: string
  event_at: string
  notes?: string
  document: {
    id: string
    title: string
    status: string
    visibility: string
    unit: {
      name: string
    }
  }
  version?: {
    id: string
    version_label: string
  }
  actor: {
    id: string
    full_name: string
  }
}

export default function ActivityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (session && !session.user.permissions.includes('DOC_READ')) {
      router.push("/documents")
    }
  }, [status, session, router])

  useEffect(() => {
    if (session) {
      fetchActivities()
    }
  }, [session])

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities?limit=100')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventTypeColor = (eventType: string) => {
    const colors = {
      CREATED: 'bg-green-100 text-green-800',
      UPLOADED: 'bg-blue-100 text-blue-800',
      REVIEW_REQUESTED: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-emerald-100 text-emerald-800',
      PUBLISHED: 'bg-purple-100 text-purple-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-red-100 text-red-800',
      REPLACED: 'bg-orange-100 text-orange-800'
    }
    return colors[eventType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/documents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Document Activity
            </h2>
            <p className="text-muted-foreground">
              Recent activities and timeline events across all documents
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground">
                All time activities
              </p>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activities.length}</div>
              <p className="text-xs text-muted-foreground">
                Showing latest 100
              </p>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(activities.map(a => a.actor.id)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Users with recent activity
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Recent document activities and events</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getEventTypeColor(activity.event_type)}>
                          {formatEventType(activity.event_type)}
                        </Badge>
                        {activity.version && (
                          <Badge variant="outline" className="text-xs">
                            v{activity.version.version_label}
                          </Badge>
                        )}
                      </div>

                      <div className="mb-2">
                        <h4 className="font-medium text-sm hover:text-primary cursor-pointer"
                            onClick={() => router.push(`/documents/${activity.document.id}`)}>
                          {activity.document.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Unit: {activity.document.unit.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activity.actor.full_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(activity.event_at)}
                        </div>
                      </div>

                      {activity.notes && (
                        <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                          {activity.notes}
                        </p>
                      )}

                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/documents/${activity.document.id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Document
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-muted-foreground">No recent activities found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Activities will appear here as documents are created, updated, and managed
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
