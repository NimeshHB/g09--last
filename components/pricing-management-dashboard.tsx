"use client"

import { useState, useEffect, useMemo } from 'react'
import { usePricing, type PricingTier, type PricingFilters, type CreatePricingTierData } from '@/hooks/use-pricing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Download,
  Search,
  Filter,
  Calculator,
  Clock,
  Car,
  TrendingUp,
  Settings
} from 'lucide-react'
import { format } from 'date-fns'

const VehicleTypeBadge = ({ type }: { type: string }) => {
  const typeConfig = {
    car: { label: 'Car', color: 'bg-blue-100 text-blue-800' },
    motorcycle: { label: 'Motorcycle', color: 'bg-green-100 text-green-800' },
    truck: { label: 'Truck', color: 'bg-orange-100 text-orange-800' },
    van: { label: 'Van', color: 'bg-purple-100 text-purple-800' },
    suv: { label: 'SUV', color: 'bg-red-100 text-red-800' },
    bus: { label: 'Bus', color: 'bg-yellow-100 text-yellow-800' },
    all: { label: 'All Vehicles', color: 'bg-gray-100 text-gray-800' }
  }

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.all

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}

const PricingTypeBadge = ({ type }: { type: string }) => {
  const typeConfig = {
    hourly: { label: 'Hourly', variant: 'default' as const },
    daily: { label: 'Daily', variant: 'secondary' as const },
    weekly: { label: 'Weekly', variant: 'outline' as const },
    monthly: { label: 'Monthly', variant: 'outline' as const },
    flat: { label: 'Flat Rate', variant: 'secondary' as const }
  }

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.hourly

  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface PricingTierFormProps {
  tier?: PricingTier
  onSubmit: (data: CreatePricingTierData) => Promise<void>
  onClose: () => void
}

const PricingTierForm = ({ tier, onSubmit, onClose }: PricingTierFormProps) => {
  const [formData, setFormData] = useState<CreatePricingTierData>({
    name: tier?.name || '',
    description: tier?.description || '',
    vehicleType: tier?.vehicleType || 'car',
    basePrice: tier?.basePrice || 5.00,
    currency: tier?.currency || 'USD',
    pricingType: tier?.pricingType || 'hourly',
    durationRange: tier?.durationRange || { min: 1, max: 24 },
    discounts: tier?.discounts || [],
    surcharges: tier?.surcharges || [],
    priority: tier?.priority || 0,
    validFrom: tier?.validFrom ? new Date(tier.validFrom).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    validUntil: tier?.validUntil ? new Date(tier.validUntil).toISOString().slice(0, 16) : '',
    applicableSlots: tier?.applicableSlots || [],
    isActive: tier?.isActive ?? true
  })
  
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    console.log('Form submission triggered with data:', formData)
    
    if (!formData.name || !formData.basePrice || formData.basePrice <= 0) {
      console.log('Validation failed:', { name: formData.name, basePrice: formData.basePrice })
      toast.error('Please fill in required fields (name and base price > 0)')
      return
    }

    console.log('Validation passed, submitting...')
    setLoading(true)
    try {
      await onSubmit(formData)
      console.log('Submission successful')
      onClose()
    } catch (error) {
      console.error('Submission error:', error)
      // Error handling is done in the hook
    } finally {
      setLoading(false)
    }
  }

  const addDiscount = () => {
    setFormData(prev => ({
      ...prev,
      discounts: [
        ...prev.discounts!,
        { type: 'percentage', value: 0, description: '' }
      ]
    }))
  }

  const addSurcharge = () => {
    setFormData(prev => ({
      ...prev,
      surcharges: [
        ...prev.surcharges!,
        { type: 'peak_hours', multiplier: 1.5, description: '' }
      ]
    }))
  }

  return (
    <div className="space-y-6 max-h-96 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter pricing tier name"
          />
        </div>
        <div className="space-y-2">
          <Label>Vehicle Type</Label>
          <Select
            value={formData.vehicleType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="motorcycle">Motorcycle</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="bus">Bus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Base Price *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.basePrice}
            onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="LKR">LKR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Pricing Type</Label>
          <Select
            value={formData.pricingType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, pricingType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="flat">Flat Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Min Duration (hours)</Label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            value={formData.durationRange?.min}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              durationRange: { ...prev.durationRange!, min: parseFloat(e.target.value) || 0.5 }
            }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Duration (hours)</Label>
          <Input
            type="number"
            min="1"
            value={formData.durationRange?.max}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              durationRange: { ...prev.durationRange!, max: parseFloat(e.target.value) || 24 }
            }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Input
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valid From</Label>
          <Input
            type="datetime-local"
            value={formData.validFrom}
            onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Valid Until (Optional)</Label>
          <Input
            type="datetime-local"
            value={formData.validUntil}
            onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter description for this pricing tier"
          rows={2}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
        <Label>Active</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
          {tier ? 'Update' : 'Create'} Tier
        </Button>
      </div>
    </div>
  )
}

export default function PricingManagementDashboard() {
  const {
    pricingTiers,
    loading,
    pagination,
    fetchPricingTiers,
    createPricingTier,
    updatePricingTier,
    deletePricingTier,
    togglePricingTierStatus,
    duplicatePricingTier,
    exportPricingTiers
  } = usePricing()

  const [filters, setFilters] = useState<PricingFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [duplicateName, setDuplicateName] = useState('')
  const [duplicateDialog, setDuplicateDialog] = useState<PricingTier | null>(null)

  // Load initial data
  useEffect(() => {
    fetchPricingTiers()
  }, [fetchPricingTiers])

  // Apply filters
  const handleFilterChange = (key: keyof PricingFilters, value: string | boolean | undefined) => {
    // Convert 'all' prefixed values to undefined for filtering
    let filterValue: string | boolean | undefined = value
    if (typeof value === 'string' && (value === 'all' || value.startsWith('all-'))) {
      filterValue = undefined
    } else if (value === '') {
      filterValue = undefined
    }
    const newFilters = { ...filters, [key]: filterValue }
    setFilters(newFilters)
    fetchPricingTiers(newFilters, 1)
  }

  // Search
  const handleSearch = () => {
    // For now, we'll implement client-side search since the API doesn't support text search
    // In a real implementation, you'd add search to the API
    fetchPricingTiers(filters, 1)
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    fetchPricingTiers({}, 1)
  }

  // Handle create/update
  const handleSubmit = async (data: CreatePricingTierData) => {
    if (selectedTier) {
      await updatePricingTier(selectedTier._id, data)
    } else {
      await createPricingTier(data)
    }
    await fetchPricingTiers(filters, pagination.currentPage)
  }

  // Handle duplicate
  const handleDuplicate = async () => {
    if (!duplicateDialog || !duplicateName) {
      toast.error('Please enter a name for the duplicate')
      return
    }

    await duplicatePricingTier(duplicateDialog._id, duplicateName)
    setDuplicateDialog(null)
    setDuplicateName('')
    await fetchPricingTiers(filters, pagination.currentPage)
  }

  // Statistics
  const statistics = useMemo(() => {
    return {
      totalTiers: pricingTiers.length,
      activeTiers: pricingTiers.filter(t => t.isActive).length,
      avgBasePrice: pricingTiers.length > 0 
        ? pricingTiers.reduce((sum, t) => sum + t.basePrice, 0) / pricingTiers.length 
        : 0,
      vehicleTypes: new Set(pricingTiers.map(t => t.vehicleType)).size
    }
  }, [pricingTiers])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pricing Management</h2>
          <p className="text-muted-foreground">
            Configure pricing tiers, discounts, and surcharges
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={exportPricingTiers}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => {
              setSelectedTier(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tier
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tiers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalTiers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tiers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.activeTiers}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.totalTiers > 0 
                ? `${Math.round((statistics.activeTiers / statistics.totalTiers) * 100)}% active`
                : '0% active'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Base Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${statistics.avgBasePrice.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicle Types</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.vehicleTypes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search pricing tiers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Select
              value={filters.isActive?.toString() || ''}
              onValueChange={(value) => handleFilterChange('isActive', value === 'all' ? undefined : value === 'true')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.vehicleType || ''}
              onValueChange={(value) => handleFilterChange('vehicleType', value === 'all-types' ? undefined : value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All Types</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="all">All Vehicles</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.pricingType || ''}
              onValueChange={(value) => handleFilterChange('pricingType', value === 'all-pricing-types' ? undefined : value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Pricing Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-pricing-types">All Types</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="flat">Flat Rate</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pricing Tiers ({pagination.totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Vehicle Type</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration Range</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingTiers.map((tier) => (
                  <TableRow key={tier._id}>
                    <TableCell className="font-medium">{tier.name}</TableCell>
                    <TableCell>
                      <VehicleTypeBadge type={tier.vehicleType} />
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${tier.basePrice.toFixed(2)} {tier.currency}
                    </TableCell>
                    <TableCell>
                      <PricingTypeBadge type={tier.pricingType} />
                    </TableCell>
                    <TableCell>
                      {tier.durationRange.min}h - {tier.durationRange.max}h
                    </TableCell>
                    <TableCell>{tier.priority}</TableCell>
                    <TableCell>
                      <Switch
                        checked={tier.isActive}
                        onCheckedChange={(checked) => togglePricingTierStatus(tier._id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {tier.validUntil 
                        ? format(new Date(tier.validUntil), 'MMM dd, yyyy')
                        : 'No expiry'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTier(tier)
                            setFormOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDuplicateDialog(tier)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePricingTier(tier._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <Button
                variant="outline"
                disabled={!pagination.hasPrev}
                onClick={() => fetchPricingTiers(filters, pagination.currentPage - 1)}
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-sm">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={!pagination.hasNext}
                onClick={() => fetchPricingTiers(filters, pagination.currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTier ? 'Edit' : 'Create'} Pricing Tier
            </DialogTitle>
            <DialogDescription>
              {selectedTier 
                ? 'Update the pricing tier configuration'
                : 'Create a new pricing tier for parking charges'
              }
            </DialogDescription>
          </DialogHeader>
          <PricingTierForm
            tier={selectedTier || undefined}
            onSubmit={handleSubmit}
            onClose={() => {
              setFormOpen(false)
              setSelectedTier(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={() => setDuplicateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Pricing Tier</DialogTitle>
            <DialogDescription>
              Create a copy of "{duplicateDialog?.name}" with a new name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Name</Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter name for the duplicate tier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate}>
              Create Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}