"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, FileText, Eye, Download, Filter, X } from "lucide-react"
import AppLayout from "@/components/layouts/app-layout"

interface Document {
  id: string
  title: string
  summary?: string
  category?: string
  classification: 'LOW' | 'MEDIUM' | 'HIGH'
  visibility: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED'
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ACTIVE' | 'ARCHIVED' | 'RETIRED'
  created_at: string
  owner: {
    full_name: string
  }
  unit: {
    name: string
  }
  current_version?: {
    version_label: string
    file_size?: number
  }
  tags?: Array<{ name: string }>
}

interface SearchFilters {
  query: string
  status: string
  visibility: string
  classification: string
  category: string
  unit: string
  tags: string[]
  dateFrom: string
  dateTo: string
}

export default function DocumentSearchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: 'all',
    visibility: 'all',
    classification: 'all',
    category: '',
    unit: '',
    tags: [],
    dateFrom: '',
    dateTo: ''
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  const handleSearch = async () => {
    setLoading(true)
    setSearchPerformed(true)

    try {
      const params = new URLSearchParams()

      if (filters.query) params.append('search', filters.query)
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.visibility !== 'all') params.append('visibility', filters.visibility)
      if (filters.classification !== 'all') params.append('classification', filters.classification)
      if (filters.category) params.append('category', filters.category)
      if (filters.unit) params.append('unit', filters.unit)
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','))
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      params.append('limit', '50') // Show more results for search

      const response = await fetch(`/api/documents?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      } else {
        setDocuments([])
      }
    } catch (error) {
      console.error('Error searching documents:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      status: 'all',
      visibility: 'all',
      classification: 'all',
      category: '',
      unit: '',
      tags: [],
      dateFrom: '',
      dateTo: ''
    })
    setDocuments([])
    setSearchPerformed(false)
  }

  const addTag = (tag: string) => {
    if (tag && !filters.tags.includes(tag)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      IN_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      PUBLISHED: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
      RETIRED: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getClassificationColor = (classification: string) => {
    const colors = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800'
    }
    return colors[classification as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (status === "loading") {
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Search</h2>
          <p className="text-muted-foreground">
            Search documents with advanced filters and full-text search
          </p>
        </div>

        {/* Search Filters */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search Filters
            </CardTitle>
            <CardDescription>
              Use multiple filters to find specific documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="query">Search Query</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="query"
                    placeholder="Title, content, or keywords..."
                    value={filters.query}
                    onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="all">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <select
                  id="visibility"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={filters.visibility}
                  onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
                >
                  <option value="all">All Visibility</option>
                  <option value="PUBLIC">Public</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classification">Classification</Label>
                <select
                  id="classification"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={filters.classification}
                  onChange={(e) => setFilters(prev => ({ ...prev, classification: e.target.value }))}
                >
                  <option value="all">All Classifications</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="Document category"
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="Unit name or code"
                  value={filters.unit}
                  onChange={(e) => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2 mb-6">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {filters.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add tag and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag((e.target as HTMLInputElement).value)
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchPerformed && (
          <Card className="admin-card">
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                {documents.length} documents found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{document.title}</div>
                              {document.summary && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {document.summary}
                                </div>
                              )}
                              {document.tags && document.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {document.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag.name} variant="outline" className="text-xs">
                                      {tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(document.status)}>
                              {document.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getClassificationColor(document.classification)}>
                              {document.classification}
                            </Badge>
                          </TableCell>
                          <TableCell>{document.category || '-'}</TableCell>
                          <TableCell>{document.owner.full_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/documents/${document.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {document.current_version && (
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                  <p className="text-gray-500">Try adjusting your search filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
