"use client"

import * as React from "react"
import { useEffect, useMemo, useReducer, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Car,
  Calendar,
  Clock,
  Activity,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import {
  useUserManagement,
  type UserData,
  type CreateUserData,
  type UpdateUserData,
} from "@/hooks/use-user-management"
import { format, formatDistanceToNow } from "date-fns"

// --- Types & defaults
export interface UserManagementDashboardProps {
  currentUser?: {
    id: string
    name: string
    role: string
    permissions?: string[]
  }
}

const DEFAULT_FORM: CreateUserData = {
  name: "",
  email: "",
  password: "",
  role: "user",
  phone: "",
  vehicleNumber: "",
  vehicleType: "",
  status: "active",
}

type FormState = CreateUserData & Partial<Pick<CreateUserData, 'adminLevel' | 'permissions'>>

type FormAction =
  | { type: "reset" }
  | { type: "patch"; payload: Partial<FormState> }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "reset":
      return { ...DEFAULT_FORM }
    case "patch":
      return { ...state, ...action.payload }
    default:
      return state
  }
}

// --- Small helpers
const roleBadge = (role: string) =>
  role === "admin"
    ? "bg-red-100 text-red-800 border-red-200"
    : role === "attendant"
    ? "bg-blue-100 text-blue-800 border-blue-200"
    : "bg-green-100 text-green-800 border-green-200"

const statusBadge = (status: string) =>
  status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"

// --- Refactor component (default export)
export default function UserManagementDashboardRefactor({ currentUser }: UserManagementDashboardProps) {
  const {
    users,
    stats,
    pagination,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkUpdateUsers,
    exportUsers,
    searchUsers,
    filterUsers,
    resetFilters,
  } = useUserManagement()

  // UI state
  const [selected, setSelected] = useState<string[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editing, setEditing] = useState<UserData | null>(null)
  const [deleting, setDeleting] = useState<UserData | null>(null)

  // Filters
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [page, setPage] = useState(1)

  // Form reducer
  const [form, dispatch] = useReducer(formReducer, DEFAULT_FORM)

  // Fetch users once
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400)
    return () => clearTimeout(t)
  }, [query])

  // Apply filters (debounced)
  useEffect(() => {
    const filters = {
      role: roleFilter !== "all" ? roleFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: debouncedQuery || undefined,
      page,
      limit: 20,
      sortBy,
      sortOrder,
    }
    filterUsers(filters)
  }, [roleFilter, statusFilter, debouncedQuery, page, sortBy, sortOrder, filterUsers])

  // Selection helpers
  const toggle = useCallback((id: string) => {
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  }, [])

  const toggleAll = useCallback(() => {
    setSelected(s => (s.length === users.length ? [] : users.map(u => u._id)))
  }, [users])

  // Create user
  const handleCreate = useCallback(async () => {
    const ok = await createUser(form as CreateUserData)
    if (ok) {
      setShowCreate(false)
      dispatch({ type: "reset" })
    }
  }, [createUser, form])

  // Start edit
  const beginEdit = useCallback((u: UserData) => {
    setEditing(u)
    dispatch({ type: "patch", payload: {
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      phone: u.phone || "",
      vehicleNumber: u.vehicleNumber || "",
      vehicleType: u.vehicleType || "",
      status: u.status,
      adminLevel: (u as any).adminLevel,
      permissions: (u as any).permissions,
    }})
    setShowEdit(true)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!editing) return
    const payload: UpdateUserData = { _id: editing._id, ...(form as any) }
    if (!form.password) delete (payload as any).password
    const ok = await updateUser(payload)
    if (ok) {
      setShowEdit(false)
      setEditing(null)
      dispatch({ type: "reset" })
    }
  }, [editing, form, updateUser])

  // Delete
  const handleDelete = useCallback((u: UserData) => {
    setDeleting(u)
    setShowDelete(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleting) return
    const ok = await deleteUser(deleting._id)
    if (ok) {
      setShowDelete(false)
      setDeleting(null)
    }
  }, [deleting, deleteUser])

  // Bulk
  const bulkUpdate = useCallback(async (status: 'active' | 'inactive') => {
    const ok = await bulkUpdateUsers(selected, { status })
    if (ok) setSelected([])
  }, [selected, bulkUpdateUsers])

  // Memo stats for local use (unchanged, just derived)
  const derivedStats = useMemo(() => stats || null, [stats])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage all users, roles, and permissions in your system</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportUsers()}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => { dispatch({ type: 'reset' }); setShowCreate(true) }}>
            <UserPlus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      {derivedStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derivedStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">+{derivedStats.newUsersThisMonth} this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derivedStats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">{((derivedStats.activeUsers / derivedStats.totalUsers) * 100).toFixed(1)}% of total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derivedStats.inactiveUsers}</div>
              <p className="text-xs text-muted-foreground">{((derivedStats.inactiveUsers / derivedStats.totalUsers) * 100).toFixed(1)}% of total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Active</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derivedStats.recentlyActive.length}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users by name, email, or vehicle..." className="pl-10" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} />
            </div>

            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="attendant">Attendants</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [f, o] = value.split('-'); setSortBy(f); setSortOrder(o) }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="lastLogin-desc">Recently Active</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters}><RefreshCw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox checked={selected.length === users.length} onCheckedChange={toggleAll} />
                <span className="text-sm font-medium">{selected.length} user{selected.length !== 1 ? 's' : ''} selected</span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => bulkUpdate('active')}><UserCheck className="h-4 w-4 mr-2" />Activate</Button>
                <Button variant="outline" size="sm" onClick={() => bulkUpdate('inactive')}><UserX className="h-4 w-4 mr-2" />Deactivate</Button>
                <Button variant="outline" size="sm" onClick={() => setSelected([])}>Clear Selection</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users ({pagination?.totalCount || 0})</CardTitle>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map(u => (
              <div key={u._id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Checkbox checked={selected.includes(u._id)} onCheckedChange={() => toggle(u._id)} />

                <Avatar>
                  <AvatarFallback>{u.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">{u.name}</p>
                    <Badge className={roleBadge(u.role)}>{u.role}</Badge>
                    <Badge className={statusBadge(u.status)}>{u.status}</Badge>
                    {u.isVerified && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</div>
                    {u.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{u.phone}</div>}
                    {u.vehicleNumber && <div className="flex items-center gap-1"><Car className="h-3 w-3" />{u.vehicleNumber} ({u.vehicleType})</div>}
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {format(new Date(u.createdAt), 'MMM d, yyyy')}</div>
                    {u.lastLogin && <div className="flex items-center gap-1"><Clock className="h-3 w-3" />Active {formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true })}</div>}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => beginEdit(u)}><Edit className="h-4 w-4 mr-2" />Edit User</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(u)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete User</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {!loading && users.length === 0 && <div className="text-center py-8 text-muted-foreground">No users found matching your criteria.</div>}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total users)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system with appropriate role and permissions.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => dispatch({ type: 'patch', payload: { name: e.target.value } })} placeholder="Enter full name" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => dispatch({ type: 'patch', payload: { email: e.target.value } })} placeholder="Enter email" /></div>
            <div className="space-y-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => dispatch({ type: 'patch', payload: { password: e.target.value } })} placeholder="Enter password" /></div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => dispatch({ type: 'patch', payload: { role: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="attendant">Attendant</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => dispatch({ type: 'patch', payload: { phone: e.target.value } })} placeholder="Enter phone number" /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => dispatch({ type: 'patch', payload: { status: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === 'user' && (
              <>
                <div className="space-y-2"><Label>Vehicle Number</Label><Input value={form.vehicleNumber} onChange={(e) => dispatch({ type: 'patch', payload: { vehicleNumber: e.target.value.toUpperCase() } })} placeholder="e.g., ABC123" /></div>
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select value={form.vehicleType} onValueChange={(v) => dispatch({ type: 'patch', payload: { vehicleType: v } })}>
                    <SelectTrigger><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="electric">Electric Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {form.role === 'admin' && (
              <div className="space-y-2">
                <Label>Admin Level</Label>
                <Select value={(form as any).adminLevel} onValueChange={(v) => dispatch({ type: 'patch', payload: { adminLevel: v } })}>
                  <SelectTrigger><SelectValue placeholder="Select admin level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="super">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => dispatch({ type: 'patch', payload: { name: e.target.value } })} /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => dispatch({ type: 'patch', payload: { email: e.target.value } })} /></div>
            <div className="space-y-2"><Label>New Password</Label><Input type="password" value={form.password} onChange={(e) => dispatch({ type: 'patch', payload: { password: e.target.value } })} placeholder="Leave empty to keep current" /></div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => dispatch({ type: 'patch', payload: { role: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="attendant">Attendant</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => dispatch({ type: 'patch', payload: { phone: e.target.value } })} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => dispatch({ type: 'patch', payload: { status: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === 'user' && (
              <>
                <div className="space-y-2"><Label>Vehicle Number</Label><Input value={form.vehicleNumber} onChange={(e) => dispatch({ type: 'patch', payload: { vehicleNumber: e.target.value.toUpperCase() } })} /></div>
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select value={form.vehicleType} onValueChange={(v) => dispatch({ type: 'patch', payload: { vehicleType: v } })}>
                    <SelectTrigger><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="electric">Electric Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {form.role === 'admin' && (
              <div className="space-y-2">
                <Label>Admin Level</Label>
                <Select value={(form as any).adminLevel} onValueChange={(v) => dispatch({ type: 'patch', payload: { adminLevel: v } })}>
                  <SelectTrigger><SelectValue placeholder="Select admin level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="super">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete {deleting?.name}? This action cannot be undone.</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
