"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Filter, Download, User, FileText, Settings, Calendar } from "lucide-react"
import { format } from "date-fns"

interface AuditLog {
  id: string
  action: string
  resource_type: string
  resource_id?: string
  at: string
  meta?: string
  actor?: {
    id: string
    full_name: string
    email: string
  }
}

interface AuditLogViewerProps {
  className?: string
  filters?: {
    action?: string
    resource_type?: string
    user_id?: string
    date_from?: string
    date_to?: string
  }
}

export default function AuditLogViewer({ className, filters: initialFilters = {} }: AuditLogViewerProps) {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState(initialFilters)

  useEffect(() => {
    if (session) {
      fetchAuditLogs()
    }
  }, [session, page, filters, searchTerm])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '50')
      
      if (searchTerm) params.append('search', searchTerm)
      if (filters.action) params.append('action', filters.action)
      if (filters.resource_type) params.append('resource_type', filters.resource_type)
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)

      const response = await fetch(`/api/audit-logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('DOC')) return <FileText className="h-4 w-4" />
    if (action.includes('USER')) return <User className="h-4 w-4" />
    if (action.includes('ROLE') || action.includes('UNIT') || action.includes('PERM')) return <Settings className="h-4 w-4" />
    return <Calendar className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800'
    if (action.includes('UPDATE') || action.includes('UPLOAD')) return 'bg-blue-100 text-blue-800'
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800'
    if (action.includes('READ') || action.includes('DOWNLOAD') || action.includes('VIEW')) return 'bg-gray-100 text-gray-800'
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  const formatLogDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss')
  }

  const parseMeta = (metaString?: string) => {
    if (!metaString) return null
    try {
      return JSON.parse(metaString)
    } catch {
      return metaString
    }
  }

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filters.action) params.append('action', filters.action)
      if (filters.resource_type) params.append('resource_type', filters.resource_type)
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)

      const response = await fetch(`/api/audit-logs/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error exporting audit logs:", error)
    }
  }

  if (!session) {
    return null
  }

  const userPermissions = session.user.permissions as string[]
  if (!userPermissions.includes('USER_MANAGE') && !userPermissions.includes('ADMIN')) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">You don't have permission to view audit logs</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Track all system activities and user actions
            </CardDescription>
          </div>
          <Button onClick={exportLogs} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filters.action || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value || undefined }))}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              <SelectItem value="DOC_CREATE">Document Create</SelectItem>
              <SelectItem value="DOC_UPDATE">Document Update</SelectItem>
              <SelectItem value="DOC_DELETE">Document Delete</SelectItem>
              <SelectItem value="DOC_READ">Document Read</SelectItem>
              <SelectItem value="DOC_DOWNLOAD">Document Download</SelectItem>
              <SelectItem value="DOC_UPLOAD">Document Upload</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="USER_CREATE">User Create</SelectItem>
              <SelectItem value="USER_UPDATE">User Update</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAuditLogs}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Audit Logs Table */}
        <ScrollArea className="h-[500px] w-full border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-gray-500">
                      <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No audit logs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {formatLogDate(log.at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {log.actor?.full_name?.charAt(0).toUpperCase() || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{log.actor?.full_name || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {log.resource_type}
                        {log.resource_id && (
                          <span className="text-gray-500 ml-1">
                            ({log.resource_id.substring(0, 8)}...)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {log.meta && (
                          <span className="font-mono text-xs">
                            {JSON.stringify(parseMeta(log.meta)).substring(0, 100)}
                            {JSON.stringify(parseMeta(log.meta)).length > 100 && '...'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {logs.length} of {total} entries
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={logs.length < 50}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}