"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Eye, CheckCircle, Clock, FileText } from "lucide-react"
import AppLayout from "@/components/layouts/app-layout"

interface ReviewDocument {
  id: string
  title: string
  summary?: string
  category?: string
  classification: 'LOW' | 'MEDIUM' | 'HIGH'
  visibility: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED'
  status: 'IN_REVIEW' | 'APPROVED'
  created_at: string
  updated_at: string
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
}

export default function ReviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<ReviewDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (session && !session.user.permissions.includes('DOC_READ')) {
      router.push("/documents")
    }
  }, [status, session, router])

  useEffect(() => {
    if (session) {
      fetchReviewDocuments()
    }
  }, [session])

  const fetchReviewDocuments = async () => {
    try {
      const response = await fetch('/api/documents?status=IN_REVIEW')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching review documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      IN_REVIEW: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800'
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
              <Clock className="h-8 w-8" />
              Document Review
            </h2>
            <p className="text-muted-foreground">
              Documents awaiting review and approval
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
              <p className="text-xs text-muted-foreground">
                Documents waiting for approval
              </p>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter(d => d.status === 'IN_REVIEW').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Require your attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Review Documents */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Documents for Review</CardTitle>
            <CardDescription>Documents submitted for review and approval</CardDescription>
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
                      <TableHead>Owner</TableHead>
                      <TableHead>Submitted</TableHead>
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
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(document.status)}>
                            {document.status === 'IN_REVIEW' ? 'In Review' : document.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getClassificationColor(document.classification)}>
                            {document.classification}
                          </Badge>
                        </TableCell>
                        <TableCell>{document.owner.full_name}</TableCell>
                        <TableCell>
                          {new Date(document.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/documents/${document.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {document.status === 'IN_REVIEW' && (
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                <CheckCircle className="h-4 w-4" />
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
                <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
                <p className="text-muted-foreground">No documents awaiting review</p>
                <p className="text-sm text-muted-foreground mt-2">
                  All documents have been reviewed and approved
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
