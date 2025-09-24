"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface UploadVersionFormProps {
  documentId: string
  currentVersion?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function UploadVersionForm({ 
  documentId, 
  currentVersion, 
  onSuccess, 
  onCancel 
}: UploadVersionFormProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [changeType, setChangeType] = useState<'MAJOR' | 'MINOR'>('MINOR')
  const [changeLog, setChangeLog] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only PDF, DOC, and DOCX files are allowed')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setError("")
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setError("Please select a file to upload")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('changeType', changeType)
      formData.append('changeLog', changeLog)

      const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        body: formData
      })

      if (response.ok) {
        const version = await response.json()
        toast.success("Document version uploaded successfully!")
        onSuccess?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to upload version")
      }
    } catch (error) {
      console.error("Error uploading version:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getNextVersionLabel = () => {
    if (!currentVersion) return "1.0"
    
    const [major, minor] = currentVersion.split('.').map(Number)
    if (changeType === 'MAJOR') {
      return `${major + 1}.0`
    } else {
      return `${major}.${minor + 1}`
    }
  }

  if (!session) {
    return null
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload New Version</CardTitle>
        <CardDescription>
          Upload a new version of the document. Current version: {currentVersion || 'None'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Document File *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileInputChange}
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <p className="font-medium">Drop your file here or click to browse</p>
                    <p className="text-sm text-gray-500">
                      PDF, DOC, DOCX files up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change Type */}
          <div className="space-y-2">
            <Label>Change Type *</Label>
            <Select value={changeType} onValueChange={(value: 'MAJOR' | 'MINOR') => setChangeType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MINOR">
                  Minor Update (e.g., {currentVersion ? `${currentVersion.split('.')[0]}.${parseInt(currentVersion.split('.')[1]) + 1}` : '1.1'})
                  <span className="text-xs text-gray-500 ml-2">
                    - Small changes, formatting fixes
                  </span>
                </SelectItem>
                <SelectItem value="MAJOR">
                  Major Update (e.g., {currentVersion ? `${parseInt(currentVersion.split('.')[0]) + 1}.0` : '2.0'})
                  <span className="text-xs text-gray-500 ml-2">
                    - Significant content changes
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Next version will be: {getNextVersionLabel()}
            </p>
          </div>

          {/* Change Log */}
          <div className="space-y-2">
            <Label htmlFor="changeLog">Change Log</Label>
            <Textarea
              id="changeLog"
              value={changeLog}
              onChange={(e) => setChangeLog(e.target.value)}
              placeholder="Describe what changed in this version..."
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading || !selectedFile}>
            {loading ? "Uploading..." : "Upload Version"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}