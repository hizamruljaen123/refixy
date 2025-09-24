"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Download, Eye, Edit, MessageSquare, Clock, Upload, ArrowLeft, User, Calendar } from "lucide-react"
import { toast } from "sonner"
import AppLayout from "@/components/layouts/app-layout"

interface Document {
  id: string
  title: string
  summary?: string
  category?: string
  classification: 'LOW' | 'MEDIUM' | 'HIGH'
  visibility: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED'
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ACTIVE' | 'ARCHIVED' | 'RETIRED'
  doc_number?: string
  created_at: string
  updated_at: string
  effective_date?: string
  expiry_date?: string
  owner: {
    id: string
    full_name: string
  }
  unit: {
    id: string
    name: string
    code: string
  }
  current_version?: {
    id: string
    version_label: string
    file_path: string
    file_size?: number
    file_mime?: string
    created_at: string
    created_by: {
      full_name: string
    }
  }
  versions?: Array<{
    id: string
    version_label: string
    change_type: string
    change_log?: string
    file_size?: number
    file_mime?: string
    created_at: string
    created_by: {
      full_name: string
    }
  }>
  tags?: Array<{ id: string; name: string }>
}

interface TimelineEvent {
  id: string
  event_type: string
  event_at: string
  notes?: string
  actor: {
    full_name: string
  }
  version?: {
    version_label: string
  }
}

interface Comment {
  id: string
  content: string
  created_at: string
  author: {
    full_name: string
  }
  version?: {
    version_label: string
  }
}

export default function DocumentDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [newComment, setNewComment] = useState("")
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadForm, setUploadForm] = useState({
    change_log: "",
    change_type: "MINOR" as "MINOR" | "MAJOR"
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session && documentId) {
      fetchDocument()
      fetchTimeline()
      fetchComments()
    }
  }, [session, documentId])

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setDocument(data)
      } else if (response.status === 404) {
        toast.error("Document not found")
        router.push("/documents")
      } else {
        toast.error("Failed to load document")
      }
    } catch (error) {
      console.error('Error fetching document:', error)
      toast.error("Failed to load document")
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeline = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/timeline`)
      if (response.ok) {
        const data = await response.json()
        setTimeline(data.timeline || [])
      }
    } catch (error) {
      console.error('Error fetching timeline:', error)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          version_id: document?.current_version?.id
        }),
      })

      if (response.ok) {
        toast.success("Comment added successfully")
        setNewComment("")
        setShowCommentDialog(false)
        fetchComments()
      } else {
        toast.error("Failed to add comment")
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error("Failed to add comment")
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 15
        })
      }, 200)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('change_log', uploadForm.change_log)
      formData.append('change_type', uploadForm.change_type)

      const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        // Add a small delay to show 100% completion
        setTimeout(() => {
          toast.success("File uploaded successfully!")
          setShowUploadDialog(false)
          setSelectedFile(null)
          setUploadForm({ change_log: "", change_type: "MINOR" })
          setIsUploading(false)
          setUploadProgress(0)
          fetchDocument()
          fetchTimeline()
        }, 500)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to upload file")
        setIsUploading(false)
        setUploadProgress(0)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error("Failed to upload file")
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handlePreview = async (versionId: string, fileName: string, mimeType: string) => {
    // Open file in new tab using browser's native viewer
    const downloadUrl = `/api/documents/${documentId}/versions/${versionId}/download`
    window.open(downloadUrl, '_blank')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  if (!document) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground">The document you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{document.title}</h2>
              {document.doc_number && (
                <p className="text-muted-foreground">Document #{document.doc_number}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(document.status)}>
              {document.status.replace('_', ' ')}
            </Badge>
            <Badge className={getClassificationColor(document.classification)}>
              {document.classification}
            </Badge>
            {document.current_version && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Document Details Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
          </TabsList>

          {/* Upload Modal - Always Available */}
          {session?.user.permissions.includes('DOC_WRITE') && (
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Version</DialogTitle>
                  <DialogDescription>
                    Upload a new version of this document. Current version: {document.current_version?.version_label || 'None'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {/* File Upload Section */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file" className="text-base font-medium">Select File *</Label>
                      <div className="mt-2">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                          <input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="file-upload"
                            accept=".pdf,.doc,.docx,.txt,.rtf"
                            disabled={isUploading}
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <div className="text-sm text-gray-600">
                              {selectedFile ? (
                                <div>
                                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                  <p className="text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-medium">Click to select a file</p>
                                  <p className="text-gray-500">PDF, DOC, DOCX up to 50MB</p>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Version Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="change_type" className="text-base font-medium">Change Type *</Label>
                      <select
                        id="change_type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={uploadForm.change_type}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, change_type: e.target.value as "MINOR" | "MAJOR" }))}
                        disabled={isUploading}
                      >
                        <option value="MINOR">Minor Changes</option>
                        <option value="MAJOR">Major Changes</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Minor: Typos, formatting. Major: Content changes, new features.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium">New Version</Label>
                      <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                        {(() => {
                          const latestVersion = document.versions?.[0]?.version_label || '0.0'
                          const [major, minor] = latestVersion.split('.').map(Number)
                          if (uploadForm.change_type === 'MAJOR') {
                            return `${major + 1}.0`
                          } else {
                            return `${major}.${minor + 1}`
                          }
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Auto-calculated based on change type
                      </p>
                    </div>
                  </div>

                  {/* Change Log */}
                  <div className="space-y-2">
                    <Label htmlFor="change_log" className="text-base font-medium">Change Description *</Label>
                    <Textarea
                      id="change_log"
                      placeholder="Describe what changes were made in this version..."
                      value={uploadForm.change_log}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, change_log: e.target.value }))}
                      rows={4}
                      className="resize-none"
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide a clear description of changes for version tracking
                    </p>
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Uploading file...</span>
                        <span className="font-medium">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-xs text-muted-foreground text-center">
                        Please wait while we process your file
                      </p>
                    </div>
                  )}

                  {/* Preview */}
                  {selectedFile && !isUploading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Version Preview</h4>
                      <div className="space-y-1 text-sm text-blue-800">
                        <p><strong>File:</strong> {selectedFile.name}</p>
                        <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p><strong>Type:</strong> {selectedFile.type || 'Unknown'}</p>
                        <p><strong>Change Type:</strong> {uploadForm.change_type}</p>
                        <p><strong>New Version:</strong> {(() => {
                          const latestVersion = document.versions?.[0]?.version_label || '0.0'
                          const [major, minor] = latestVersion.split('.').map(Number)
                          if (uploadForm.change_type === 'MAJOR') {
                            return `${major + 1}.0`
                          } else {
                            return `${major}.${minor + 1}`
                          }
                        })()}</p>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowUploadDialog(false)
                    setSelectedFile(null)
                    setUploadForm({ change_log: "", change_type: "MINOR" })
                  }} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || !uploadForm.change_log.trim() || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Version
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Document Information */}
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Document Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-sm text-muted-foreground">{document.title}</p>
                  </div>

                  {document.summary && (
                    <div>
                      <Label className="text-sm font-medium">Summary</Label>
                      <p className="text-sm text-muted-foreground">{document.summary}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Category</Label>
                      <p className="text-sm text-muted-foreground">{document.category || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Visibility</Label>
                      <Badge variant="outline">{document.visibility}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Unit</Label>
                      <p className="text-sm text-muted-foreground">{document.unit.name} ({document.unit.code})</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Owner</Label>
                      <p className="text-sm text-muted-foreground">{document.owner.full_name}</p>
                    </div>
                  </div>

                  {document.tags && document.tags.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {document.tags.map((tag) => (
                          <Badge key={tag.id} variant="secondary" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Version */}
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Current Version</CardTitle>
                </CardHeader>
                <CardContent>
                  {document.current_version ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{document.current_version.version_label}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(document.current_version.file_size)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Uploaded by</Label>
                        <p className="text-sm text-muted-foreground">{document.current_version.created_by.full_name}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Upload date</Label>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(document.current_version.created_at)}
                        </p>
                      </div>

                      {session?.user.permissions.includes('DOC_WRITE') && (
                        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload New Version
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-muted-foreground">No file uploaded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Document Timeline
                </CardTitle>
                <CardDescription>
                  History of all activities on this document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{event.event_type.replace('_', ' ')}</p>
                          {event.version && (
                            <Badge variant="outline" className="text-xs">
                              v{event.version.version_label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.actor.full_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(event.event_at)}
                          </div>
                        </div>
                        {event.notes && (
                          <p className="text-sm text-muted-foreground">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No timeline events yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions">
            <Card className="admin-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Version History
                    </CardTitle>
                    <CardDescription>
                      All versions of this document with change details
                    </CardDescription>
                  </div>
                  {session?.user.permissions.includes('DOC_WRITE') && (
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Add New Version
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {document.versions && document.versions.length > 0 ? (
                  <div className="space-y-4">
                    {document.versions.map((version, index) => (
                      <div key={version.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">{version.version_label}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant={version.change_type === 'MAJOR' ? 'default' : 'secondary'}>
                                  {version.change_type}
                                </Badge>
                                <span>•</span>
                                <span>{formatFileSize(version.file_size)}</span>
                                {version.file_mime && (
                                  <>
                                    <span>•</span>
                                    <span>{version.file_mime}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{version.created_by.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(version.created_at)}
                            </p>
                          </div>
                        </div>

                        {version.change_log && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-1">Change Description</h5>
                            <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                              {version.change_log}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreview(version.id, `${document.title}_v${version.version_label}`, version.file_mime || 'application/octet-stream')}
                            title="Open file in new tab"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                          {index === 0 && (
                            <Badge variant="default" className="ml-auto">
                              Current Version
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-muted-foreground">No version history available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Version history will appear here once files are uploaded
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-4">
            <Card className="admin-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Comments & Reviews
                    </CardTitle>
                    <CardDescription>
                      Discussion and feedback on this document
                    </CardDescription>
                  </div>
                  <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Comment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Comment</DialogTitle>
                        <DialogDescription>
                          Share your thoughts or feedback on this document
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="comment">Comment</Label>
                          <Textarea
                            id="comment"
                            placeholder="Write your comment here..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                          Post Comment
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {comment.author.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{comment.author.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                            {comment.version && ` • v${comment.version.version_label}`}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
