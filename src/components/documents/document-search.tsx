"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Search, Filter, FileText, Calendar, User } from "lucide-react"
import { toast } from "sonner"

interface SearchFilters {
  query: string
  fullText: boolean
  status: string
  visibility: string
  classification: string
  dateFrom: string
  dateTo: string
  owner: string
  category: string
}

interface DocumentSearchProps {
  onSearch: (filters: SearchFilters) => void
  onResults?: (results: any[]) => void
  className?: string
}

export default function DocumentSearch({ onSearch, onResults, className }: DocumentSearchProps) {
  const { data: session } = useSession()
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    fullText: false,
    status: 'all',
    visibility: 'all',
    classification: 'all',
    dateFrom: '',
    dateTo: '',
    owner: '',
    category: ''
  })
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearch = async () => {
    if (!filters.query.trim()) {
      toast.error("Please enter a search query")
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('search', filters.query)
      if (filters.fullText) params.append('fullText', 'true')
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.visibility !== 'all') params.append('visibility', filters.visibility)

      const response = await fetch(`/api/documents?${params}`)
      if (response.ok) {
        const data = await response.json()
        onResults?.(data.documents || [])
        toast.success(`Found ${data.documents?.length || 0} documents`)
      }
    } catch (error) {
      console.error("Error searching documents:", error)
      toast.error("Failed to search documents")
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  const handleFilterChange = (key: keyof SearchFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      fullText: false,
      status: 'all',
      visibility: 'all',
      classification: 'all',
      dateFrom: '',
      dateTo: '',
      owner: '',
      category: ''
    })
  }

  if (!session) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Document Search
        </CardTitle>
        <CardDescription>
          Search through documents by title, content, or metadata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Search */}
        <form onSubmit={handleQuickSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </form>

        {/* Search Options */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="fullText"
              checked={filters.fullText}
              onCheckedChange={(checked) => handleFilterChange('fullText', checked as boolean)}
            />
            <Label htmlFor="fullText" className="text-sm">
              Search in document content
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={filters.visibility} onValueChange={(value) => handleFilterChange('visibility', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Visibility</SelectItem>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="RESTRICTED">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Classification</Label>
                <Select value={filters.classification} onValueChange={(value) => handleFilterChange('classification', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classification</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g., Policy, SOP, Report"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {filters.status !== 'all' && (
                  <Badge variant="secondary">
                    Status: {filters.status}
                  </Badge>
                )}
                {filters.visibility !== 'all' && (
                  <Badge variant="secondary">
                    Visibility: {filters.visibility}
                  </Badge>
                )}
                {filters.classification !== 'all' && (
                  <Badge variant="secondary">
                    Classification: {filters.classification}
                  </Badge>
                )}
                {filters.category && (
                  <Badge variant="secondary">
                    Category: {filters.category}
                  </Badge>
                )}
                {filters.dateFrom && (
                  <Badge variant="secondary">
                    From: {filters.dateFrom}
                  </Badge>
                )}
                {filters.dateTo && (
                  <Badge variant="secondary">
                    To: {filters.dateTo}
                  </Badge>
                )}
              </div>
              
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </>
        )}

        {/* Search Tips */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Search Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use quotes for exact phrases: "annual report"</li>
            <li>• Use AND/OR to combine terms: policy AND procedure</li>
            <li>• Enable "Search in document content" to find text within uploaded files</li>
            <li>• Use filters to narrow down results by status, visibility, or date range</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}