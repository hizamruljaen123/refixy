"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Plus, Shield } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

interface Role {
  id: string
  name: string
  description?: string
  role_permissions: Array<{
    permission: {
      code: string
      description?: string
    }
  }>
}

interface Permission {
  id: string
  code: string
  description?: string
}

// Available permissions based on seed data
const AVAILABLE_PERMISSIONS: Permission[] = [
  { id: '1', code: 'DOC_CREATE', description: 'Create documents' },
  { id: '2', code: 'DOC_READ', description: 'Read documents' },
  { id: '3', code: 'DOC_WRITE', description: 'Write/Edit documents' },
  { id: '4', code: 'DOC_DELETE', description: 'Delete documents' },
  { id: '5', code: 'DOC_APPROVE', description: 'Approve documents' },
  { id: '6', code: 'DOC_REVIEW', description: 'Review documents' },
  { id: '7', code: 'DOC_DOWNLOAD', description: 'Download documents' },
  { id: '8', code: 'USER_MANAGE', description: 'Manage users' },
  { id: '9', code: 'ROLE_MANAGE', description: 'Manage roles' },
  { id: '10', code: 'UNIT_MANAGE', description: 'Manage units' }
]

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_codes: [] as string[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/roles")
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
      toast.error("Failed to load roles")
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for permission selection
  const handlePermissionChange = (permissionCode: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permission_codes: checked
        ? [...prev.permission_codes, permissionCode]
        : prev.permission_codes.filter(code => code !== permissionCode)
    }))
  }

  const isPermissionSelected = (permissionCode: string) => {
    return formData.permission_codes.includes(permissionCode)
  }

  const createRole = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success("Role created successfully")
        setShowCreateDialog(false)
        setFormData({
          name: '',
          description: '',
          permission_codes: []
        })
        fetchRoles()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create role")
      }
    } catch (error) {
      toast.error("Failed to create role")
    } finally {
      setIsSubmitting(false)
    }
  }

  const editRole = async () => {
    if (!roleToEdit) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/roles/${roleToEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success("Role updated successfully")
        setShowEditDialog(false)
        setRoleToEdit(null)
        fetchRoles()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update role")
      }
    } catch (error) {
      toast.error("Failed to update role")
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteRole = async () => {
    if (!roleToDelete) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/roles/${roleToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success("Role deleted successfully")
        setShowDeleteDialog(false)
        setRoleToDelete(null)
        fetchRoles()
      } else {
        toast.error("Failed to delete role")
      }
    } catch (error) {
      toast.error("Failed to delete role")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (role: Role) => {
    setRoleToEdit(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permission_codes: role.role_permissions.map(rp => rp.permission.code)
    })
    setShowEditDialog(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permission_codes: []
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Management
            </CardTitle>
            <CardDescription>
              Manage user roles and their permissions
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Create a new role with specific permissions for system access control.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Role Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                    placeholder="Enter role name (e.g. MANAGER, AUDITOR)"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter role description"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-md p-4">
                    {AVAILABLE_PERMISSIONS.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`create-perm-${permission.id}`}
                          checked={isPermissionSelected(permission.code)}
                          onCheckedChange={(checked) => handlePermissionChange(permission.code, checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label
                            htmlFor={`create-perm-${permission.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {permission.code}
                          </Label>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createRole} disabled={isSubmitting || !formData.name.trim()}>
                  {isSubmitting ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <Badge variant="outline">{role.name}</Badge>
                </TableCell>
                <TableCell>{role.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {role.role_permissions.slice(0, 3).map((rp, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {rp.permission.code}
                      </Badge>
                    ))}
                    {role.role_permissions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{role.role_permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(role)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRoleToDelete(role)
                        setShowDeleteDialog(true)
                      }}
                      disabled={role.name === 'ADMIN'} // Prevent deleting ADMIN role
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_name">Role Name *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                placeholder="Enter role name"
                disabled={roleToEdit?.name === 'ADMIN'} // Prevent editing ADMIN role name
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter role description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-md p-4">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-perm-${permission.id}`}
                      checked={isPermissionSelected(permission.code)}
                      onCheckedChange={(checked) => handlePermissionChange(permission.code, checked as boolean)}
                      disabled={roleToEdit?.name === 'ADMIN' && permission.code === 'ADMIN'} // Prevent removing ADMIN permission from ADMIN role
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor={`edit-perm-${permission.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {permission.code}
                      </Label>
                      {permission.description && (
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editRole} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{roleToDelete?.name}</strong>?
              This action cannot be undone and will permanently remove the role from the system.
              {roleToDelete?.name === 'ADMIN' && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                  ⚠️ ADMIN role cannot be deleted.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={deleteRole} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
