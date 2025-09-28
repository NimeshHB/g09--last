"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Users, Plus, Edit, Trash2, Search, UserCheck, UserX, Settings, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { useAdminManagement, type CreateAdminData, type UpdateAdminData } from "@/hooks/use-admin-management"
import { PERMISSIONS, PermissionManager, usePermissions, type AdminLevel } from "@/lib/permissions"

// --- Types
type CurrentUser = {
  id: number
  name: string
  role: string
  adminLevel?: AdminLevel
  permissions?: string[]
}

type Props = { currentUser: CurrentUser }

const DEFAULT_ADMIN: CreateAdminData = {
  name: "",
  email: "",
  password: "",
  role: "admin",
  adminLevel: "manager",
  permissions: [],
  status: "active",
}

// form reducer for add/edit admin
type FormState = CreateAdminData
type FormAction = { type: "reset" } | { type: "patch"; payload: Partial<FormState> }
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "reset":
      return { ...DEFAULT_ADMIN }
    case "patch":
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export default function AdminManagementRefactor({ currentUser }: Props) {
  const {
    admins,
    stats,
    loading,
    error,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    toggleAdminStatus,
    searchAdmins,
  } = useAdminManagement()

  // permissions helpers
  const userPermissions = usePermissions(currentUser.permissions || [])
  const canManageAdmins = userPermissions.hasPermission("admins")

  const [form, dispatch] = useReducer(formReducer, DEFAULT_ADMIN)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // filters
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [levelFilter, setLevelFilter] = useState("")

  // debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  // derived: available permissions for current user
  const availablePermissions = useMemo(() => {
    if (!currentUser.adminLevel) return [] as string[]
    return PermissionManager.getAvailablePermissions(currentUser.adminLevel)
  }, [currentUser.adminLevel])

  const permissionsByCategory = useMemo(() => {
    const grouped = PermissionManager.getPermissionsByCategory()
    const filtered: Record<string, typeof PERMISSIONS> = {}

    Object.entries(grouped).forEach(([category, perms]) => {
      const p = perms.filter((perm) => availablePermissions.includes(perm.id) && userPermissions.hasPermission(perm.id))
      if (p.length) filtered[category] = p
    })

    return filtered
  }, [availablePermissions, userPermissions])

  // filtered admins list
  const filteredAdmins = useMemo(() => searchAdmins(debouncedQuery, statusFilter, levelFilter), [searchAdmins, debouncedQuery, statusFilter, levelFilter])

  // message clearing
  const clearMessages = useCallback(() => {
    setTimeout(() => {
      setActionError(null)
      setSuccessMessage(null)
    }, 4500)
  }, [])

  // handlers
  const openAdd = useCallback(() => {
    dispatch({ type: "reset" })
    setEditing(null)
    setShowForm(true)
  }, [])

  const openEdit = useCallback((admin: any) => {
    setEditing(admin)
    dispatch({ type: "patch", payload: {
      name: admin.name,
      email: admin.email,
      password: "",
      role: admin.role || "admin",
      adminLevel: admin.adminLevel || "manager",
      permissions: admin.permissions || [],
      status: admin.status || "active",
    }})
    setShowForm(true)
  }, [])

  const submitAdd = useCallback(async () => {
    if (!form.name || !form.email || !form.password) {
      setActionError("Please fill in all required fields")
      clearMessages()
      return
    }
    setActionLoading("add")
    setActionError(null)
    try {
      const res = await createAdmin(form)
      if (res.success) {
        setSuccessMessage("Admin added successfully")
        setShowForm(false)
        dispatch({ type: "reset" })
        clearMessages()
      } else {
        setActionError(res.error || "Failed to add admin")
        clearMessages()
      }
    } catch (err) {
      setActionError("Error adding admin: " + (err instanceof Error ? err.message : "Unknown"))
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }, [form, createAdmin, clearMessages])

  const submitUpdate = useCallback(async () => {
    if (!editing) return
    setActionLoading("update")
    setActionError(null)
    try {
      const payload: UpdateAdminData = {
        _id: editing._id,
        name: form.name,
        email: form.email,
        adminLevel: form.adminLevel,
        permissions: form.permissions,
        status: form.status,
      }

      if (form.password && form.password.trim()) payload.password = form.password

      const res = await updateAdmin(payload)
      if (res.success) {
        setSuccessMessage("Admin updated successfully")
        setShowForm(false)
        setEditing(null)
        dispatch({ type: "reset" })
        clearMessages()
      } else {
        setActionError(res.error || "Failed to update admin")
        clearMessages()
      }
    } catch (err) {
      setActionError("Error updating admin: " + (err instanceof Error ? err.message : "Unknown"))
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }, [editing, form, updateAdmin, clearMessages])

  const handleDelete = useCallback(async (adminId: string) => {
    if (adminId === currentUser.id.toString()) {
      setActionError("You cannot delete your own account")
      clearMessages()
      return
    }

    if (!confirm("Are you sure you want to delete this admin?")) return

    setActionLoading(`delete-${adminId}`)
    setActionError(null)
    try {
      const res = await deleteAdmin(adminId)
      if (res.success) {
        setSuccessMessage("Admin deleted successfully")
        clearMessages()
      } else {
        setActionError(res.error || "Failed to delete admin")
        clearMessages()
      }
    } catch (err) {
      setActionError("Error deleting admin: " + (err instanceof Error ? err.message : "Unknown"))
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }, [deleteAdmin, currentUser.id, clearMessages])

  const handleToggle = useCallback(async (adminId: string, currentStatus: string) => {
    setActionLoading(`toggle-${adminId}`)
    setActionError(null)
    try {
      const res = await toggleAdminStatus(adminId, currentStatus)
      if (res.success) {
        setSuccessMessage(`Admin ${currentStatus === 'active' ? 'deactivated' : 'activated'} successfully`)
        clearMessages()
      } else {
        setActionError(res.error || "Failed to update admin status")
        clearMessages()
      }
    } catch (err) {
      setActionError("Error updating status: " + (err instanceof Error ? err.message : "Unknown"))
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }, [toggleAdminStatus, clearMessages])

  const handlePermissionChange = useCallback((permission: string) => {
    if (!PermissionManager.canAssignPermissions(currentUser.adminLevel || 'manager', currentUser.permissions || [], [permission])) {
      setActionError("You don't have permission to assign this permission")
      clearMessages()
      return
    }

    if (form.permissions.includes(permission)) {
      dispatch({ type: 'patch', payload: { permissions: form.permissions.filter(p => p !== permission) } })
    } else {
      dispatch({ type: 'patch', payload: { permissions: [...form.permissions, permission] } })
    }
  }, [form.permissions, currentUser.adminLevel, currentUser.permissions, clearMessages])

  const handleAdminLevelChange = useCallback((level: AdminLevel) => {
    const validation = PermissionManager.validatePermissions(level, form.permissions)
    if (!validation.valid) {
      const validPermissions = form.permissions.filter(p => !validation.invalidPermissions.includes(p))
      dispatch({ type: 'patch', payload: { adminLevel: level, permissions: validPermissions } })
      if (validation.invalidPermissions.length) {
        setActionError(`Some permissions were removed as they're not available for ${level} level`)
        clearMessages()
      }
    } else {
      dispatch({ type: 'patch', payload: { adminLevel: level } })
    }
  }, [form.permissions, clearMessages])

  const canEditAdmin = useCallback((admin: any) => {
    if (!canManageAdmins) return false
    return PermissionManager.canManageAdmin(currentUser.adminLevel || 'manager', currentUser.permissions || [], admin.adminLevel)
  }, [canManageAdmins, currentUser.adminLevel, currentUser.permissions])

  const canDeleteAdmin = useCallback((admin: any) => {
    if (admin._id === currentUser.id.toString()) return false
    return canEditAdmin(admin)
  }, [canEditAdmin, currentUser.id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
          <p className="text-gray-600">Manage admin users and their permissions</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2" disabled={loading || !canManageAdmins}>
          <Plus className="h-4 w-4" /> Add New Admin
        </Button>
      </div>

      {!canManageAdmins && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You don't have permission to manage administrators. Contact a super admin for access.</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-500 text-green-700">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading admin data...</span>
        </div>
      )}

      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load admin data: {error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAdmins}</div>
              <p className="text-xs text-muted-foreground">Registered admins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeAdmins}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
              <Settings className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.superAdmins}</div>
              <p className="text-xs text-muted-foreground">Full access</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
              <UserX className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.recentLogins}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{editing ? <><Edit className="h-5 w-5" /> Edit Admin</> : <><Plus className="h-5 w-5" /> Add New Admin</>}</n            </CardTitle>
            <CardDescription>{editing ? "Update admin information and permissions" : "Create a new admin account with specific permissions"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => dispatch({ type: 'patch', payload: { name: e.target.value } })} placeholder="Enter full name" />
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input type="email" value={form.email} onChange={(e) => dispatch({ type: 'patch', payload: { email: e.target.value } })} placeholder="Enter email" />
              </div>

              <div className="space-y-2">
                <Label>Password {editing ? "(leave blank to keep current)" : "*"}</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => dispatch({ type: 'patch', payload: { password: e.target.value } })} placeholder={editing ? 'Enter new password' : 'Enter password'} />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admin Level</Label>
                <Select value={form.adminLevel} onValueChange={(v) => handleAdminLevelChange(v as AdminLevel)}>
                  <SelectTrigger><SelectValue placeholder="Select admin level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    {(currentUser.adminLevel === 'super' && userPermissions.hasPermission('admins')) && <SelectItem value="super">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => dispatch({ type: 'patch', payload: { status: v as any } })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <Label>Permissions</Label>

              {Object.entries(permissionsByCategory).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 capitalize">{category.replace('_', ' ')} Permissions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                        {permissions.map((perm) => (
                          <div key={perm.id} className="flex items-start space-x-3">
                            <Checkbox id={`perm-${perm.id}`} checked={form.permissions.includes(perm.id)} onCheckedChange={() => handlePermissionChange(perm.id)} disabled={!PermissionManager.canAssignPermissions(currentUser.adminLevel || 'manager', currentUser.permissions || [], [perm.id])} />
                            <div className="flex-1">
                              <Label htmlFor={`perm-${perm.id}`} className="text-sm font-medium cursor-pointer">{perm.name}</Label>
                              <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-4 border border-dashed rounded-lg">No permissions available to assign. Contact a super admin for more permissions.</div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={editing ? submitUpdate : submitAdd} disabled={actionLoading === 'add' || actionLoading === 'update'}>
                {actionLoading === 'add' || actionLoading === 'update' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editing ? 'Update Admin' : 'Add Admin'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); dispatch({ type: 'reset' }) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Admin List</CardTitle>
            <CardDescription>Manage existing admin accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search admins by name or email..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
              </div>

              <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={levelFilter || 'all'} onValueChange={(value) => setLevelFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Levels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="super">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredAdmins.map((admin) => (
                <div key={admin._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full"><Shield className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>{admin.status}</Badge>
                        <Badge variant="outline" className="capitalize">{admin.adminLevel}</Badge>
                        <span className="text-xs text-gray-500">{admin.permissions.length} permissions</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-gray-500 mr-4"><p>Last login:</p><p>{admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}</p></div>

                    <Button size="sm" variant="outline" onClick={() => handleToggle(admin._id, admin.status)} className={admin.status === 'active' ? 'text-red-600' : 'text-green-600'} disabled={actionLoading === `toggle-${admin._id}`}>
                      {actionLoading === `toggle-${admin._id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : (admin.status === 'active' ? 'Deactivate' : 'Activate')}
                    </Button>

                    <Button size="sm" variant="outline" onClick={() => openEdit(admin)} disabled={!!actionLoading || !canEditAdmin(admin)}><Edit className="h-4 w-4" /></Button>

                    {canDeleteAdmin(admin) && (
                      <Button size="sm" variant="outline" onClick={() => handleDelete(admin._id)} className="text-red-600" disabled={actionLoading === `delete-${admin._id}`}>
                        {actionLoading === `delete-${admin._1}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredAdmins.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No admins found matching your search</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
