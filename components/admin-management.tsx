"use client"

import { useState, useMemo } from "react"
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

export function AdminManagement({ 
  currentUser 
}: { 
  currentUser: { 
    id: number; 
    name: string; 
    role: string; 
    adminLevel?: AdminLevel;
    permissions?: string[];
  } 
}) {
  const {
    admins,
    stats,
    loading,
    error,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    toggleAdminStatus,
    searchAdmins
  } = useAdminManagement()

  // Current user permissions
  const userPermissions = usePermissions(currentUser.permissions || [])
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [levelFilter, setLevelFilter] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [newAdmin, setNewAdmin] = useState<CreateAdminData>({
    name: "",
    email: "",
    password: "",
    adminLevel: "manager",
    permissions: [],
    status: "active",
  })

  // Check if current user can manage admins
  const canManageAdmins = userPermissions.hasPermission('admins')
  
  // Get available permissions for current user
  const availablePermissions = useMemo(() => {
    if (!currentUser.adminLevel) return []
    return PermissionManager.getAvailablePermissions(currentUser.adminLevel)
  }, [currentUser.adminLevel])

  // Get permissions grouped by category
  const permissionsByCategory = useMemo(() => {
    const grouped = PermissionManager.getPermissionsByCategory()
    // Filter to only show permissions the current user can assign
    const filtered: Record<string, typeof PERMISSIONS> = {}
    
    Object.entries(grouped).forEach(([category, perms]) => {
      const filteredPerms = perms.filter(p => 
        availablePermissions.includes(p.id) && 
        userPermissions.hasPermission(p.id)
      )
      if (filteredPerms.length > 0) {
        filtered[category] = filteredPerms
      }
    })
    
    return filtered
  }, [availablePermissions, userPermissions])

  // Filter admins based on search and filters
  const filteredAdmins = useMemo(() => {
    return searchAdmins(searchTerm, statusFilter, levelFilter)
  }, [searchAdmins, searchTerm, statusFilter, levelFilter])

  // Clear messages after a delay
  const clearMessages = () => {
    setTimeout(() => {
      setActionError(null)
      setSuccessMessage(null)
    }, 5000)
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      setActionError("Please fill in all required fields")
      clearMessages()
      return
    }

    setActionLoading("add")
    setActionError(null)
    
    try {
      const result = await createAdmin(newAdmin)
      if (result.success) {
        setSuccessMessage("Admin added successfully")
        setNewAdmin({
          name: "",
          email: "",
          password: "",
          adminLevel: "manager",
          permissions: [],
          status: "active",
        })
        setShowAddForm(false)
        clearMessages()
      } else {
        setActionError(result.error || "Failed to add admin")
        clearMessages()
      }
    } catch (err) {
      setActionError("Error adding admin: " + (err instanceof Error ? err.message : "Unknown error"))
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditAdmin = (admin: any) => {
    setEditingAdmin(admin)
    setNewAdmin({
      name: admin.name,
      email: admin.email,
      password: "",
      adminLevel: admin.adminLevel,
      permissions: admin.permissions,
      status: admin.status,
    })
    setShowAddForm(true)
  }

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return

    setActionLoading("update")
    setActionError(null)

    const updateData: UpdateAdminData = {
      _id: editingAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      adminLevel: newAdmin.adminLevel,
      permissions: newAdmin.permissions,
      status: newAdmin.status,
    }

    if (newAdmin.password && newAdmin.password.trim()) {
      updateData.password = newAdmin.password
    }

    try {
      const result = await updateAdmin(updateData)
      if (result.success) {
        setSuccessMessage("Admin updated successfully")
        setEditingAdmin(null)
        setShowAddForm(false)
        setNewAdmin({
          name: "",
          email: "",
          password: "",
          adminLevel: "manager",
          permissions: [],
          status: "active",
        })
        clearMessages()
      } else {
        setActionError(result.error || "Failed to update admin")
        clearMessages()
      }
    } catch (err) {
      setActionError("Error updating admin: " + (err instanceof Error ? err.message : "Unknown error"))
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    if (adminId === currentUser.id.toString()) {
      setActionError("You cannot delete your own account")
      clearMessages()
      return
    }
    
    if (!confirm("Are you sure you want to delete this admin?")) {
      return
    }

    setActionLoading(`delete-${adminId}`)
    setActionError(null)

    try {
      const result = await deleteAdmin(adminId)
      if (result.success) {
        setSuccessMessage("Admin deleted successfully")
        clearMessages()
      } else {
        setActionError(result.error || "Failed to delete admin")
        clearMessages()
      }
    } catch (err) {
      setActionError("Error deleting admin: " + (err instanceof Error ? err.message : "Unknown error"))
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async (adminId: string, currentStatus: string) => {
    setActionLoading(`toggle-${adminId}`)
    setActionError(null)

    try {
      const result = await toggleAdminStatus(adminId, currentStatus)
      if (result.success) {
        setSuccessMessage(`Admin ${currentStatus === 'active' ? 'deactivated' : 'activated'} successfully`)
        clearMessages()
      } else {
        setActionError(result.error || "Failed to update admin status")
        clearMessages()
      }
    } catch (err) {
      setActionError("Error updating status: " + (err instanceof Error ? err.message : "Unknown error"))
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermissionChange = (permission: string) => {
    // Check if user can assign this permission
    if (!PermissionManager.canAssignPermissions(
      currentUser.adminLevel || 'manager',
      currentUser.permissions || [],
      [permission]
    )) {
      setActionError("You don't have permission to assign this permission")
      clearMessages()
      return
    }

    if (newAdmin.permissions.includes(permission)) {
      setNewAdmin({
        ...newAdmin,
        permissions: newAdmin.permissions.filter((p) => p !== permission),
      })
    } else {
      setNewAdmin({
        ...newAdmin,
        permissions: [...newAdmin.permissions, permission],
      })
    }
  }

  const handleAdminLevelChange = (level: AdminLevel) => {
    // Validate permissions for new level
    const validation = PermissionManager.validatePermissions(level, newAdmin.permissions)
    
    if (!validation.valid) {
      // Remove invalid permissions
      const validPermissions = newAdmin.permissions.filter(
        p => !validation.invalidPermissions.includes(p)
      )
      setNewAdmin({
        ...newAdmin,
        adminLevel: level,
        permissions: validPermissions
      })
      
      if (validation.invalidPermissions.length > 0) {
        setActionError(`Some permissions were removed as they're not available for ${level} level`)
        clearMessages()
      }
    } else {
      setNewAdmin({
        ...newAdmin,
        adminLevel: level
      })
    }
  }

  const canEditAdmin = (admin: any) => {
    if (!canManageAdmins) return false
    
    return PermissionManager.canManageAdmin(
      currentUser.adminLevel || 'manager',
      currentUser.permissions || [],
      admin.adminLevel
    )
  }

  const canDeleteAdmin = (admin: any) => {
    if (admin._id === currentUser.id.toString()) return false
    return canEditAdmin(admin)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
          <p className="text-gray-600">Manage admin users and their permissions</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="flex items-center gap-2" 
          disabled={loading || !canManageAdmins}
        >
          <Plus className="h-4 w-4" />
          Add New Admin
        </Button>
      </div>

      {/* Access Control Check */}
      {!canManageAdmins && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to manage administrators. Contact a super admin for access.
          </AlertDescription>
        </Alert>
      )}

      {/* Error and Success Messages */}
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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading admin data...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load admin data: {error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
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

      {/* Add/Edit Admin Form */}
      {showAddForm && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {editingAdmin ? "Edit Admin" : "Add New Admin"}
            </CardTitle>
            <CardDescription>
              {editingAdmin
                ? "Update admin information and permissions"
                : "Create a new admin account with specific permissions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-name">Full Name *</Label>
                <Input
                  id="admin-name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-email">Email Address *</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Password {editingAdmin ? "(leave blank to keep current)" : "*"}</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    placeholder={editingAdmin ? "Enter new password" : "Enter password"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-level">Admin Level</Label>
                <Select
                  value={newAdmin.adminLevel}
                  onValueChange={handleAdminLevelChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select admin level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    {(currentUser.adminLevel === 'super' && userPermissions.hasPermission('admins')) && (
                      <SelectItem value="super">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-status">Status</Label>
                <Select 
                  value={newAdmin.status} 
                  onValueChange={(value: "active" | "inactive") => setNewAdmin({ ...newAdmin, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
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
                      <h4 className="text-sm font-medium text-gray-700 capitalize">
                        {category.replace('_', ' ')} Permissions
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-start space-x-3">
                            <Checkbox
                              id={`permission-${permission.id}`}
                              checked={newAdmin.permissions.includes(permission.id)}
                              onCheckedChange={() => handlePermissionChange(permission.id)}
                              disabled={!PermissionManager.canAssignPermissions(
                                currentUser.adminLevel || 'manager',
                                currentUser.permissions || [],
                                [permission.id]
                              )}
                            />
                            <div className="flex-1">
                              <Label 
                                htmlFor={`permission-${permission.id}`} 
                                className="text-sm font-medium cursor-pointer"
                              >
                                {permission.name}
                              </Label>
                              <p className="text-xs text-gray-500 mt-1">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-4 border border-dashed rounded-lg">
                  No permissions available to assign. Contact a super admin for more permissions.
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button 
                onClick={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                disabled={actionLoading === "add" || actionLoading === "update"}
              >
                {actionLoading === "add" || actionLoading === "update" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingAdmin ? "Update Admin" : "Add Admin"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingAdmin(null)
                  setNewAdmin({
                    name: "",
                    email: "",
                    password: "",
                    adminLevel: "manager",
                    permissions: [],
                    status: "active",
                  })
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
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
                <Input
                  placeholder="Search admins by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={levelFilter || "all"} onValueChange={(value) => setLevelFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
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
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={admin.status === "active" ? "default" : "secondary"}>
                          {admin.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {admin.adminLevel}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {admin.permissions.length} permissions
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-gray-500 mr-4">
                      <p>Last login:</p>
                      <p>
                        {admin.lastLogin 
                          ? new Date(admin.lastLogin).toLocaleDateString() 
                          : "Never"
                        }
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(admin._id, admin.status)}
                      className={admin.status === "active" ? "text-red-600" : "text-green-600"}
                      disabled={actionLoading === `toggle-${admin._id}`}
                    >
                      {actionLoading === `toggle-${admin._id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        admin.status === "active" ? "Deactivate" : "Activate"
                      )}
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditAdmin(admin)}
                      disabled={!!actionLoading || !canEditAdmin(admin)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {canDeleteAdmin(admin) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAdmin(admin._id)}
                        className="text-red-600"
                        disabled={actionLoading === `delete-${admin._id}`}
                      >
                        {actionLoading === `delete-${admin._id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
