"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileText, 
  Upload, 
  Eye, 
  CheckCircle, 
  Archive, 
  Clock,
  User,
  Calendar,
  MessageSquare
} from "lucide-react"
import { format } from "date-fns"

interface TimelineEvent {
  id: string
  event_type: 'CREATED' | 'UPLOADED' | 'REVIEW_REQUESTED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED' | 'EXPIRED' | 'REPLACED'
  event_at: string
  notes?: string
  actor: {
    id: string
    full_name: string
    email: string
  }
  version?: {
    id: string
    version_label: string
  }
}

interface DocumentTimelineProps {
  documentId: string
  events?: TimelineEvent[]
  className?: string
}

export default function DocumentTimeline({ documentId, events: propEvents, className }: DocumentTimelineProps) {
  const { data: session } = useSession()
  const [events, setEvents] = useState<TimelineEvent[]>(propEvents || [])
  const [loading, setLoading] = useState(!propEvents)

  useState(() => {
    if (!propEvents) {
      fetchTimeline()
    }
  })

  const fetchTimeline = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/timeline`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error("Error fetching timeline:", error)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType: string) => {
    const iconMap = {
      CREATED: FileText,
      UPLOADED: Upload,
      REVIEW_REQUESTED: Eye,
      APPROVED: CheckCircle,
      PUBLISHED: FileText,
      ARCHIVED: Archive,
      EXPIRED: Clock,
      REPLACED: FileText
    }
    const Icon = iconMap[eventType as keyof typeof iconMap] || FileText
    return <Icon className="h-4 w-4" />
  }

  const getEventColor = (eventType: string) => {
    const colorMap = {
      CREATED: 'bg-blue-100 text-blue-800',
      UPLOADED: 'bg-green-100 text-green-800',
      REVIEW_REQUESTED: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      PUBLISHED: 'bg-blue-100 text-blue-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-red-100 text-red-800',
      REPLACED: 'bg-orange-100 text-orange-800'
    }
    return colorMap[eventType as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  const formatEventDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
  }

  const getEventTitle = (eventType: string) => {
    const titleMap = {
      CREATED: 'Document Created',
      UPLOADED: 'New Version Uploaded',
      REVIEW_REQUESTED: 'Review Requested',
      APPROVED: 'Document Approved',
      PUBLISHED: 'Document Published',
      ARCHIVED: 'Document Archived',
      EXPIRED: 'Document Expired',
      REPLACED: 'Document Replaced'
    }
    return titleMap[eventType as keyof typeof titleMap] || eventType
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Document Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Document Timeline</CardTitle>
        <CardDescription>
          Track all changes and events related to this document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No timeline events yet</p>
              </div>
            ) : (
              events.map((event, index) => (
                <div key={event.id} className="flex space-x-3">
                  <div className="flex flex-col items-center">
                    <div className={`p-2 rounded-full ${getEventColor(event.event_type)}`}>
                      {getEventIcon(event.event_type)}
                    </div>
                    {index < events.length - 1 && (
                      <div className="w-px h-16 bg-gray-200 mt-2"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {getEventTitle(event.event_type)}
                        </h4>
                        <Badge variant="outline" className={getEventColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                        {event.version && (
                          <Badge variant="secondary">
                            v{event.version.version_label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatEventDate(event.event_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {event.actor.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        {event.actor.full_name}
                      </span>
                    </div>
                    
                    {event.notes && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{event.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}