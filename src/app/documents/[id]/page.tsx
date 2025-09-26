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
import { FileText, Download, Eye, Edit, MessageSquare, Clock, Upload, ArrowLeft, User, Calendar, Paperclip, Image as ImageIcon, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import AppLayout from "@/components/layouts/app-layout"

type RevisionStatus = 'DONE' | 'POSTPONE' | 'PROGRESS' | 'DENIED'

const REVISION_STATUS_CONFIG: Record<RevisionStatus, { label: string; badgeClass: string }> = {
  DONE: {
    label: 'Done',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  POSTPONE: {
    label: 'Postpone',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  PROGRESS: {
    label: 'In Progress',
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200'
  },
  DENIED: {
    label: 'Denied',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200'
  }
}

interface RevisionAttachment {
  id: string
  file_url: string
  file_path?: string
  file_name?: string
  file_mime?: string
  file_size?: number
  image_width?: number
  image_height?: number
  created_at: string
}

interface RevisionRequest {
  id: string
  title?: string
  notes: string
  requirements?: string
  created_at: string
  status: RevisionStatus
  requester: {
    id: string
    full_name: string
  }
  attachments: RevisionAttachment[]
}

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
    file_path: string
    file_size?: number
    file_mime?: string
    created_at: string
    created_by: {
      full_name: string
    }
    revision_requests?: RevisionRequest[]
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
  const [activeRevisionVersion, setActiveRevisionVersion] = useState<string | null>(null)
  const [revisionForm, setRevisionForm] = useState({
    title: "",
    notes: "",
    requirements: "",
    attachments: [] as File[]
  })
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

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

  const handlePreview = async (versionId: string, fileName: string, mimeType: string, filePath?: string) => {
    // If filePath is provided directly, use it
    if (filePath) {
      window.open(filePath, '_blank')
      return
    }

    // Fallback: find the version in current data
    const version = document?.versions?.find(v => v.id === versionId)
    if (version?.file_path) {
      window.open(version.file_path, '_blank')
      return
    }

    // Last fallback: fetch from API
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}`)
      if (response.ok) {
        const versionData = await response.json()
        if (versionData.file_path) {
          window.open(versionData.file_path, '_blank')
          return
        }
      }
    } catch (error) {
      console.error('Error fetching version data:', error)
    }

    // Final fallback to old API
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

  const formatDateLabel = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const resetRevisionForm = () => {
    setRevisionForm({
      title: "",
      notes: "",
      requirements: "",
      attachments: []
    })
  }

  const handleRevisionDialogToggle = (versionId: string, open: boolean) => {
    if (open) {
      setActiveRevisionVersion(versionId)
      resetRevisionForm()
    } else {
      setActiveRevisionVersion(prev => (prev === versionId ? null : prev))
      resetRevisionForm()
    }
  }

  const handleRevisionFileChange = (files: FileList | null) => {
    if (!files) return
    setRevisionForm(prev => {
      const existing = prev.attachments
      const incoming = Array.from(files)
      const merged = [...existing, ...incoming]
      const unique = merged.filter((file, index, self) =>
        self.findIndex(other =>
          other.name === file.name &&
          other.lastModified === file.lastModified &&
          other.size === file.size
        ) === index
      )
      return {
        ...prev,
        attachments: unique.slice(0, 5)
      }
    })
  }

  const handleRemoveRevisionAttachment = (index: number) => {
    setRevisionForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const handleRevisionSubmit = async () => {
    if (!activeRevisionVersion) return
    if (!revisionForm.notes.trim()) {
      toast.error("Catatan revisi wajib diisi")
      return
    }

    setIsSubmittingRevision(true)

    try {
      const formData = new FormData()
      formData.append('notes', revisionForm.notes.trim())
      if (revisionForm.title.trim()) {
        formData.append('title', revisionForm.title.trim())
      }
      if (revisionForm.requirements.trim()) {
        formData.append('requirements', revisionForm.requirements.trim())
      }
      revisionForm.attachments.forEach(file => {
        formData.append('attachments', file)
      })

      const response = await fetch(`/api/documents/${documentId}/versions/${activeRevisionVersion}/revision-requests`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        toast.success("Revision request submitted")
        resetRevisionForm()
        setActiveRevisionVersion(null)
        await fetchDocument()
      } else {
        let message = 'Failed to submit revision request'
        try {
          const error = await response.json()
          if (error?.error) message = error.error
        } catch (err) {
          console.error('Failed to parse revision request error', err)
        }
        toast.error(message)
      }
    } catch (error) {
      console.error('Error submitting revision request:', error)
      toast.error('Failed to submit revision request')
    } finally {
      setIsSubmittingRevision(false)
    }
  }

  const handleStatusChange = async (versionId: string, requestId: string, status: RevisionStatus) => {
    setUpdatingStatusId(requestId)
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/revision-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Failed to update status')
      }

      await fetchDocument()
      toast.success('Revision status updated')
    } catch (err) {
      console.error('Failed to update revision status:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatusId(null)
    }
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
                      <p className="text-sm text-muted-foreground">{document.owner?.full_name || 'Unknown User'}</p>
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
                        <p className="text-sm text-muted-foreground">{document.current_version?.created_by?.full_name || 'Unknown User'}</p>
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
                            {event.actor?.full_name || 'Unknown User'}
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
                  <div className="relative pl-6">
                    <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" aria-hidden />
                    <div className="space-y-6">
                      {document.versions.map((version, index) => (
                        <div key={version.id} className="relative pb-6 last:pb-0">
                          <div className="absolute left-[-3px] top-1 flex h-4 w-4 items-center justify-center">
                            <span
                              className={`h-2.5 w-2.5 rounded-full border-2 ${
                                index === 0
                                  ? 'border-primary bg-primary'
                                  : 'border-muted-foreground/40 bg-background'
                              }`}
                            />
                          </div>

                          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateLabel(version.created_at)}</span>
                          </div>

                          <div className="mt-3 rounded-lg border bg-card p-4 shadow-sm">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-lg font-semibold">v{version.version_label}</h4>
                                    <Badge variant={version.change_type === 'MAJOR' ? 'default' : 'secondary'}>
                                      {version.change_type}
                                    </Badge>
                                    <Badge variant="outline">{formatFileSize(version.file_size)}</Badge>
                                    {version.file_mime && (
                                      <Badge variant="outline">{version.file_mime}</Badge>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <User className="h-3.5 w-3.5" />
                                      {version.created_by?.full_name || 'Unknown User'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      {formatDate(version.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {index === 0 && (
                                <Badge variant="default" className="self-start">
                                  Current Version
                                </Badge>
                              )}
                            </div>

                            {version.change_log && (
                              <div className="mt-4">
                                <h5 className="text-sm font-medium mb-1">Change Description</h5>
                                <p className="text-sm text-muted-foreground rounded-md bg-muted/60 p-3">
                                  {version.change_log}
                                </p>
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handlePreview(
                                    version.id,
                                    `${document.title}_v${version.version_label}`,
                                    version.file_mime || 'application/octet-stream',
                                    version.file_path
                                  )
                                }
                                title="Open file in new tab"
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="mr-1 h-3 w-3" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevisionDialogToggle(version.id, true)}
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Request Revision
                              </Button>
                            </div>

                            <div className="mt-6 space-y-4">
                              <div className="space-y-1">
                                <h5 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revision Requests</h5>
                                <p className="text-xs text-muted-foreground">Kumpulkan catatan revisi dan lampirkan gambar pendukung.</p>
                              </div>

                              {version.revision_requests && version.revision_requests.length > 0 ? (
                                <div className="space-y-3">
                                  {version.revision_requests.map((request) => (
                                    <div key={request.id} className="rounded-md border bg-muted/40 p-4">
                                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                          <p className="text-sm font-semibold">{request.title || 'Revision Request'}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {request.requester?.full_name || 'Unknown User'} • {formatDate(request.created_at)}
                                          </p>
                                        </div>
                                        <div className="flex flex-col items-start gap-2 md:items-end">
                                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${REVISION_STATUS_CONFIG[request.status].badgeClass}`}>
                                            {REVISION_STATUS_CONFIG[request.status].label}
                                          </span>
                                          {(session?.user?.permissions?.includes('DOC_WRITE') || session?.user?.permissions?.includes('DOC_REVIEW') || session?.user?.roles?.includes('ADMIN')) && (
                                            <Select
                                              value={request.status}
                                              onValueChange={(value) => handleStatusChange(version.id, request.id, value as RevisionStatus)}
                                              disabled={updatingStatusId === request.id}
                                            >
                                              <SelectTrigger size="sm" className="min-w-[150px]">
                                                <SelectValue placeholder="Update status" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="PROGRESS">In Progress</SelectItem>
                                                <SelectItem value="DONE">Done</SelectItem>
                                                <SelectItem value="POSTPONE">Postpone</SelectItem>
                                                <SelectItem value="DENIED">Denied</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                      </div>

                                      <div className="mt-3 space-y-3 text-sm">
                                        <div>
                                          <p className="font-medium">Catatan</p>
                                          <p className="text-muted-foreground whitespace-pre-line">{request.notes}</p>
                                        </div>
                                        {request.requirements && (
                                          <div>
                                            <p className="font-medium">Kebutuhan</p>
                                            <p className="text-muted-foreground whitespace-pre-line">{request.requirements}</p>
                                          </div>
                                        )}
                                      </div>

                                      {request.attachments && request.attachments.length > 0 && (
                                        <div className="mt-4">
                                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lampiran</p>
                                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {request.attachments.map((attachment) => (
                                              <a
                                                key={attachment.id}
                                                href={attachment.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                                              >
                                                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                  <ImageIcon className="h-5 w-5" />
                                                </span>
                                                <span className="truncate">{attachment.file_name || 'attachment.jpg'}</span>
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Belum ada permintaan revisi untuk versi ini.</p>
                              )}
                            </div>

                            <Dialog
                              open={activeRevisionVersion === version.id}
                              onOpenChange={(open) => handleRevisionDialogToggle(version.id, open)}
                            >
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Request Revision - v{version.version_label}</DialogTitle>
                                  <DialogDescription>
                                    Sampaikan catatan revisi dan lampirkan gambar pendukung. Gambar akan dikompresi otomatis sebelum diunggah.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label htmlFor={`revision-title-${version.id}`}>Judul (opsional)</Label>
                                      <Input
                                        id={`revision-title-${version.id}`}
                                        placeholder="Contoh: Perbaiki diagram bab 2"
                                        value={revisionForm.title}
                                        onChange={(e) => setRevisionForm(prev => ({ ...prev, title: e.target.value }))}
                                        disabled={isSubmittingRevision}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`revision-requirements-${version.id}`}>Kebutuhan (opsional)</Label>
                                      <Textarea
                                        id={`revision-requirements-${version.id}`}
                                        placeholder="Daftar kebutuhan atau referensi tambahan"
                                        value={revisionForm.requirements}
                                        onChange={(e) => setRevisionForm(prev => ({ ...prev, requirements: e.target.value }))}
                                        rows={3}
                                        disabled={isSubmittingRevision}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`revision-notes-${version.id}`}>Catatan Revisi *</Label>
                                    <Textarea
                                      id={`revision-notes-${version.id}`}
                                      placeholder="Jelaskan perubahan atau perbaikan yang diharapkan"
                                      value={revisionForm.notes}
                                      onChange={(e) => setRevisionForm(prev => ({ ...prev, notes: e.target.value }))}
                                      rows={5}
                                      disabled={isSubmittingRevision}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`revision-attachments-${version.id}`}>Lampiran Gambar (maks. 5)</Label>
                                    <div className="rounded-md border border-dashed p-4 text-center">
                                      <input
                                        id={`revision-attachments-${version.id}`}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleRevisionFileChange(e.target.files)}
                                        disabled={isSubmittingRevision}
                                        className="hidden"
                                      />
                                      <label htmlFor={`revision-attachments-${version.id}`} className="flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground">
                                        <Paperclip className="h-5 w-5" />
                                        <span>Klik untuk memilih gambar (JPEG/PNG/WebP)</span>
                                      </label>
                                      <p className="mt-2 text-xs text-muted-foreground">Gambar akan dikompresi otomatis sebelum disimpan.</p>
                                    </div>
                                    {revisionForm.attachments.length > 0 && (
                                      <div className="space-y-2">
                                        {revisionForm.attachments.map((file, index) => (
                                          <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                                            <div className="flex items-center gap-2">
                                              <Paperclip className="h-4 w-4" />
                                              <div>
                                                <p className="font-medium">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                              </div>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleRemoveRevisionAttachment(index)}
                                              disabled={isSubmittingRevision}
                                            >
                                              <X className="h-4 w-4" />
                                              <span className="sr-only">Remove attachment</span>
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleRevisionDialogToggle(version.id, false)}
                                    disabled={isSubmittingRevision}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleRevisionSubmit}
                                    disabled={isSubmittingRevision || !revisionForm.notes.trim()}
                                  >
                                    {isSubmittingRevision ? (
                                      <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                                        Mengirim...
                                      </>
                                    ) : (
                                      'Submit Request'
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <p className="text-muted-foreground">No version history available</p>
                    <p className="mt-2 text-sm text-muted-foreground">
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
                          {comment.author?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{comment.author?.full_name || 'Unknown User'}</p>
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
