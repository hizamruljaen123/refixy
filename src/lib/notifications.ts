import { db } from '@/lib/db'

export interface NotificationPayload {
  type: 'REVIEW_REQUEST' | 'APPROVAL_RESULT' | 'STATUS_CHANGE' | 'EXPIRY_REMINDER'
  userId: string
  documentId?: string
  message?: string
  metadata?: Record<string, any>
}

export class NotificationService {
  static async createNotification(payload: NotificationPayload) {
    try {
      const notificationData: any = {
        user_id: payload.userId,
        type: payload.type,
        payload: payload.metadata ? JSON.stringify(payload.metadata) : null
      }

      // Create notification
      const notification = await db.notification.create({
        data: notificationData
      })

      // Here you could also send real-time notifications via WebSocket
      // or send email notifications

      return notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  static async sendReviewRequest(documentId: string, reviewerId: string, requesterName: string, documentTitle: string) {
    return this.createNotification({
      type: 'REVIEW_REQUEST',
      userId: reviewerId,
      documentId,
      metadata: {
        documentTitle,
        requesterName,
        actionUrl: `/documents/${documentId}`
      }
    })
  }

  static async sendApprovalResult(documentId: string, ownerId: string, documentTitle: string, approved: boolean, approverName: string) {
    return this.createNotification({
      type: 'APPROVAL_RESULT',
      userId: ownerId,
      documentId,
      metadata: {
        documentTitle,
        approved,
        approverName,
        actionUrl: `/documents/${documentId}`
      }
    })
  }

  static async sendStatusChange(documentId: string, userId: string, documentTitle: string, newStatus: string, changedBy: string) {
    return this.createNotification({
      type: 'STATUS_CHANGE',
      userId,
      documentId,
      metadata: {
        documentTitle,
        newStatus,
        changedBy,
        actionUrl: `/documents/${documentId}`
      }
    })
  }

  static async sendExpiryReminder(documentId: string, ownerId: string, documentTitle: string, daysUntilExpiry: number) {
    return this.createNotification({
      type: 'EXPIRY_REMINDER',
      userId: ownerId,
      documentId,
      metadata: {
        documentTitle,
        daysUntilExpiry,
        actionUrl: `/documents/${documentId}`
      }
    })
  }

  static async markAsRead(notificationIds: string[], userId: string) {
    return db.notification.updateMany({
      where: {
        id: {
          in: notificationIds
        },
        user_id: userId
      },
      data: {
        is_read: true
      }
    })
  }

  static async markAllAsRead(userId: string) {
    return db.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false
      },
      data: {
        is_read: true
      }
    })
  }

  static async deleteNotification(notificationId: string, userId: string) {
    return db.notification.delete({
      where: {
        id: notificationId,
        user_id: userId
      }
    })
  }

  static async getUnreadCount(userId: string) {
    return db.notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    })
  }

  static async getUserNotifications(userId: string, limit: number = 20, unreadOnly: boolean = false) {
    const where: any = {
      user_id: userId
    }

    if (unreadOnly) {
      where.is_read = false
    }

    return db.notification.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    })
  }
}

// Helper function to get notification message
export function getNotificationMessage(notification: any): string {
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

// Helper function to get notification icon
export function getNotificationIcon(type: string): string {
  const iconMap = {
    'REVIEW_REQUEST': '📝',
    'APPROVAL_RESULT': '✅',
    'STATUS_CHANGE': '📊',
    'EXPIRY_REMINDER': '⏰'
  }
  return iconMap[type as keyof typeof iconMap] || '📢'
}

// Helper function to get notification color
export function getNotificationColor(type: string): string {
  const colorMap = {
    'REVIEW_REQUEST': 'bg-blue-100 text-blue-800',
    'APPROVAL_RESULT': 'bg-green-100 text-green-800',
    'STATUS_CHANGE': 'bg-yellow-100 text-yellow-800',
    'EXPIRY_REMINDER': 'bg-red-100 text-red-800'
  }
  return colorMap[type as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
}