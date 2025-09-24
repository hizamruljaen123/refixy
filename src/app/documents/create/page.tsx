"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Save, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import AppLayout from "@/components/layouts/app-layout"

interface Unit {
  id: string
  code: string
  name: string
}

export default function CreateDocumentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    category: '',
    classification: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH',
    visibility: 'INTERNAL' as 'PUBLIC' | 'INTERNAL' | 'RESTRICTED',
    unit_id: '',
    doc_number: '',
    effective_date: '',
    expiry_date: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (session && !session.user.permissions.includes('DOC_CREATE')) {
      router.push("/")
    }
  }, [status, session, router])

  useEffect(() => {
    if (session) {
      fetchUnits()
    }
  }, [session])

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units')
      if (response.ok) {
        const data = await response.json()
        setUnits(data.units || [])
      }
    } catch (error) {
      console.error('Error fetching units:', error)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      // Client-side validation
      if (!formData.title.trim()) {
        toast.error('Title is required')
        setLoading(false)
        return
      }

      if (!formData.unit_id) {
        toast.error('Unit is required')
        setLoading(false)
        return
      }

      // Show initial loading message
      toast.loading('Creating document...', { id: 'document-creation' })

      // Create document metadata first
      const documentData = {
        ...formData,
        owner_user_id: session.user.id
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create document')
      }

      const result = await response.json()
      const documentId = result.id

      // Update toast to show document created
      toast.loading('Document created successfully. Uploading file...', { id: 'document-creation' })

      // If file is selected, upload it
      if (selectedFile) {
        await uploadFile(documentId, selectedFile)
        // Update toast to show upload completed
        toast.success('Document and file uploaded successfully!', { id: 'document-creation' })
      } else {
        // No file to upload
        toast.success('Document created successfully!', { id: 'document-creation' })
      }

      // Redirect to documents list instead of individual document
      router.push('/documents')
    } catch (error) {
      console.error('Error creating document:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create document', { id: 'document-creation' })
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (documentId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('change_log', 'Initial document upload')
    formData.append('change_type', 'MAJOR')

    const response = await fetch(`/api/documents/${documentId}/versions`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload file')
    }
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

  if (!session || !session.user.permissions.includes('DOC_CREATE')) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to create documents.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Create New Document</h2>
            <p className="text-muted-foreground">
              Add a new document to the system
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Information
                </CardTitle>
                <CardDescription>
                  Basic details about the document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Document title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Brief description of the document"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc_number">Document Number</Label>
                  <Input
                    id="doc_number"
                    value={formData.doc_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, doc_number: e.target.value }))}
                    placeholder="Optional document reference number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Policy, Procedure, Report"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Classification & Access */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Classification & Access</CardTitle>
                <CardDescription>
                  Security and access settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="classification">Classification *</Label>
                  <Select
                    value={formData.classification}
                    onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') =>
                      setFormData(prev => ({ ...prev, classification: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800">Low</Badge>
                          <span>General information</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="MEDIUM">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                          <span>Internal use only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="HIGH">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">High</Badge>
                          <span>Strictly confidential</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility *</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED') =>
                      setFormData(prev => ({ ...prev, visibility: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public - Available to everyone</SelectItem>
                      <SelectItem value="INTERNAL">Internal - Organization members only</SelectItem>
                      <SelectItem value="RESTRICTED">Restricted - Limited access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit_id: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dates */}
          <Card className="admin-card">
            <CardHeader>
              <CardTitle>Dates & Timeline</CardTitle>
              <CardDescription>
                Document validity period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effective_date">Effective Date</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload
              </CardTitle>
              <CardDescription>
                Upload the document file (optional - can be added later)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.txt,.rtf"
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
                          <p className="font-medium">Click to upload a file</p>
                          <p className="text-gray-500">PDF, DOC, DOCX up to 50MB</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove File
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Document'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
