"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, TrendingUp, Users, BarChart3, PieChart, Activity, Calendar, Tag, Shield } from "lucide-react"
import { toast } from "sonner"

interface AnalyticsData {
  totalDocuments: number
  documentsByStatus: Record<string, number>
  documentsByClassification: Record<string, number>
  documentsByCategory: Record<string, number>
  documentsCreatedOverTime: Array<{ date: string; count: number }>
  userActivity: Array<{
    user: string
    documentsCreated: number
    lastActivity: string
  }>
}

const STATUS_COLORS = {
  DRAFT: 'bg-gray-500',
  REVIEW: 'bg-yellow-500',
  APPROVED: 'bg-green-500',
  PUBLISHED: 'bg-blue-500',
  ARCHIVED: 'bg-purple-500'
}

const CLASSIFICATION_COLORS = {
  PUBLIC: 'bg-green-500',
  INTERNAL: 'bg-blue-500',
  CONFIDENTIAL: 'bg-yellow-500',
  SECRET: 'bg-red-500'
}

export default function DocumentsAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalDocuments: 0,
    documentsByStatus: {},
    documentsByClassification: {},
    documentsByCategory: {},
    documentsCreatedOverTime: [],
    userActivity: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/analytics")
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      } else {
        toast.error("Failed to load analytics data")
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      toast.error("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-500'
  }

  const getClassificationColor = (classification: string) => {
    return CLASSIFICATION_COLORS[classification as keyof typeof CLASSIFICATION_COLORS] || 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Document Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for document management
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalDocuments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All documents in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.userActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Users creating documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Document Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(analyticsData.documentsByCategory).length}</div>
            <p className="text-xs text-muted-foreground">
              Different categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Daily Creation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.documentsCreatedOverTime.length > 0
                ? Math.round(analyticsData.documentsCreatedOverTime.reduce((sum, item) => sum + item.count, 0) / 30)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Documents per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Documents by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Documents by Status
            </CardTitle>
            <CardDescription>
              Distribution of documents across different statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analyticsData.documentsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                    <span className="text-sm font-medium capitalize">{status.toLowerCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{count}</span>
                    <Badge variant="secondary" className="text-xs">
                      {analyticsData.totalDocuments > 0 ? Math.round((count / analyticsData.totalDocuments) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents by Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Documents by Classification
            </CardTitle>
            <CardDescription>
              Security classification distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analyticsData.documentsByClassification).map(([classification, count]) => (
                <div key={classification} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getClassificationColor(classification)}`}></div>
                    <span className="text-sm font-medium capitalize">{classification.toLowerCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{count}</span>
                    <Badge variant="secondary" className="text-xs">
                      {analyticsData.totalDocuments > 0 ? Math.round((count / analyticsData.totalDocuments) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Documents by Category
            </CardTitle>
            <CardDescription>
              Content categories distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analyticsData.documentsByCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{category || 'Uncategorized'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{count}</span>
                    <Badge variant="outline" className="text-xs">
                      {analyticsData.totalDocuments > 0 ? Math.round((count / analyticsData.totalDocuments) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Creation Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Creation Timeline (30 Days)
            </CardTitle>
            <CardDescription>
              Documents created over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {analyticsData.documentsCreatedOverTime.slice(-10).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${Math.max((item.count / Math.max(...analyticsData.documentsCreatedOverTime.map(d => d.count))) * 100, 10)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Top Document Contributors
          </CardTitle>
          <CardDescription>
            Users with the most document creation activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Documents Created</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData.userActivity.map((user, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{user.user}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.documentsCreated}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastActivity ? formatDate(user.lastActivity) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
