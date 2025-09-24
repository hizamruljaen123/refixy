"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Eye, FileText, Archive, Trash2 } from "lucide-react"
import AppLayout from "@/components/layouts/app-layout"

interface ArchivedDocument {
  id: string
  title: string
  summary?: string
  category?: string
  classification: 'LOW' | 'MEDIUM' | 'HIGH'
  visibility: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED'
  status: 'ARCHIVED' | 'RETIRED'
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

export default function ArchivePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<ArchivedDocument[]>([])
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
      fetchArchivedDocuments()
    }
  }, [session])

  const fetchArchivedDocuments = async () => {
    try {
      // Fetch both ARCHIVED and RETIRED documents
      const [archivedResponse, retiredResponse] = await Promise.all([
        fetch('/api/documents?status=ARCHIVED'),
        fetch('/api/documents?status=RETIRED')
      ])

      const archivedData = archivedResponse.ok ? await archivedResponse.json() : { documents: [] }
      const retiredData = retiredResponse.ok ? await retiredResponse.json() : { documents: [] }

      const allDocuments = [
        ...(archivedData.documents || []),
        ...(retiredData.documents || [])
      ]

      setDocuments(allDocuments)
    } catch (error) {
      console.error('Error fetching archived documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      ARCHIVED: 'bg-yellow-100 text-yellow-800',
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
              <Archive className="h-8 w-8" />
              Document Archive
            </h2>
            <p className="text-muted-foreground">
              Archived and retired documents
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Archived</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter(d => d.status === 'ARCHIVED').length}
              </div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retired</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter(d => d.status === 'RETIRED').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Archived Documents */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Archived Documents</CardTitle>
            <CardDescription>Documents that have been archived or retired from active use</CardDescription>
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
                      <TableHead>Archived Date</TableHead>
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
                            {document.status}
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Archive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-muted-foreground">No archived documents found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
