"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Bell, X, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { toast } from "sonner"

interface Notification {
  id: string
  type: 'REVIEW_REQUEST' | 'APPROVAL_RESULT' | 'STATUS_CHANGE' | 'EXPIRY_REMINDER'
  payload?: string
  is_read: boolean
  created_at: string
}

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      fetchNotifications()
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationIds,
          markAsRead: true
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length > 0) {
        await markAsRead(unreadIds)
        toast.success('All notifications marked as read')
      }
    } catch (error) {
      toast.error('Failed to mark notifications as read')
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        const deleted = notifications.find(n => n.id === notificationId)
        if (deleted && !deleted.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
        toast.success('Notification deleted')
      }
    } catch (error) {
      toast.error('Failed to delete notification')
    }
  }

  const getNotificationMessage = (notification: Notification) => {
    const payload = notification.payload ? JSON.parse(notification.payload) : {}
    
    switch (notification.type) {
      case 'REVIEW_REQUEST':
        return `${payload.requesterName} requested your review for document: ${payload.documentTitle}`
      
      case 'APPROVAL_RESULT':
        return payload.approved 
          ? `${payload.approverName} approved your document: ${payload.documentTitle}`
          : `${payload.approverName} rejected your document: ${payload.documentTitle}`
      
      case 'STATUS_CHANGE':
        return `Document "${payload.documentTitle}" status changed to ${payload.newStatus} by ${payload.changedBy}`
      
      case 'EXPIRY_REMINDER':
        return `Document "${payload.documentTitle}" will expire in ${payload.daysUntilExpiry} days`
      
      default:
        return 'You have a new notification'
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      'REVIEW_REQUEST': '📝',
      'APPROVAL_RESULT': '✅',
      'STATUS_CHANGE': '📊',
      'EXPIRY_REMINDER': '⏰'
    }
    return iconMap[type as keyof typeof iconMap] || '📢'
  }

  const getNotificationColor = (type: string) => {
    const colorMap = {
      'REVIEW_REQUEST': 'bg-blue-100 text-blue-800',
      'APPROVAL_RESULT': 'bg-green-100 text-green-800',
      'STATUS_CHANGE': 'bg-yellow-100 text-yellow-800',
      'EXPIRY_REMINDER': 'bg-red-100 text-red-800'
    }
    return colorMap[type as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  if (!session) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-96 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No notifications</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification) => {
                    const payload = notification.payload ? JSON.parse(notification.payload) : {}
                    return (
                      <div key={notification.id}>
                        <div className={`p-4 hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                <Badge variant="outline" className={getNotificationColor(notification.type)}>
                                  {notification.type.replace('_', ' ')}
                                </Badge>
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 mb-2">
                                {getNotificationMessage(notification)}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                                </span>
                                {payload.actionUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      window.open(payload.actionUrl, '_blank')
                                      if (!notification.is_read) {
                                        markAsRead([notification.id])
                                      }
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="ml-2 flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <Separator />
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}