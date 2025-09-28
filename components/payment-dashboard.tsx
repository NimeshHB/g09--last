"use client"

import { useState, useEffect, useMemo } from 'react'
import { usePayments, type Payment, type PaymentFilters } from '@/hooks/use-payments'
import { usePricing } from '@/hooks/use-pricing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Search,
  Filter,
  Eye,
  Undo2,
  Calculator,
  Calendar,
  MoreHorizontal
} from 'lucide-react'
import { format } from 'date-fns'

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    pending: { label: 'Pending', variant: 'secondary' as const },
    processing: { label: 'Processing', variant: 'default' as const },
    completed: { label: 'Completed', variant: 'default' as const },
    failed: { label: 'Failed', variant: 'destructive' as const },
    cancelled: { label: 'Cancelled', variant: 'secondary' as const },
    refunded: { label: 'Refunded', variant: 'outline' as const },
    partially_refunded: { label: 'Partial Refund', variant: 'outline' as const }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return <Badge variant={config.variant}>{config.label}</Badge>
}

const PaymentMethodBadge = ({ method }: { method: string }) => {
  const methodConfig = {
    cash: { label: 'Cash', color: 'bg-green-100 text-green-800' },
    card: { label: 'Card', color: 'bg-blue-100 text-blue-800' },
    mobile: { label: 'Mobile', color: 'bg-purple-100 text-purple-800' },
    online: { label: 'Online', color: 'bg-orange-100 text-orange-800' },
    stripe: { label: 'Stripe', color: 'bg-indigo-100 text-indigo-800' },
    paypal: { label: 'PayPal', color: 'bg-yellow-100 text-yellow-800' }
  }

  const config = methodConfig[method as keyof typeof methodConfig] || methodConfig.online

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}

interface RefundDialogProps {
  payment: Payment
  onRefund: (paymentId: string, amount: number, reason: string) => Promise<void>
}

const RefundDialog = ({ payment, onRefund }: RefundDialogProps) => {
  const [open, setOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [loading, setLoading] = useState(false)

  const maxRefundAmount = payment.amount - (payment.refundDetails?.reduce((sum, refund) => 
    refund.refundStatus === 'completed' ? sum + refund.refundAmount : sum, 0
  ) || 0)

  const handleSubmit = async () => {
    if (!refundAmount || !refundReason) {
      toast.error('Please fill in all fields')
      return
    }

    const amount = parseFloat(refundAmount)
    if (amount <= 0 || amount > maxRefundAmount) {
      toast.error(`Refund amount must be between $0.01 and $${maxRefundAmount.toFixed(2)}`)
      return
    }

    setLoading(true)
    try {
      await onRefund(payment._id, amount, refundReason)
      setOpen(false)
      setRefundAmount('')
      setRefundReason('')
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={maxRefundAmount <= 0}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Create a refund for payment {payment._id}. Maximum refundable amount: ${maxRefundAmount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refundAmount">Refund Amount</Label>
            <Input
              id="refundAmount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxRefundAmount}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="Enter refund amount"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refundReason">Refund Reason</Label>
            <Textarea
              id="refundReason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Enter reason for refund"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PriceCalculatorProps {
  onCalculate: (result: any) => void
}

const PriceCalculator = ({ onCalculate }: PriceCalculatorProps) => {
  const [open, setOpen] = useState(false)
  const [vehicleType, setVehicleType] = useState('')
  const [duration, setDuration] = useState('')
  const [startTime, setStartTime] = useState('')
  const { calculatePrice } = usePricing()
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    if (!vehicleType || !duration || !startTime) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const startDate = new Date(startTime)
      const endDate = new Date(startDate.getTime() + parseFloat(duration) * 60 * 60 * 1000)

      const result = await calculatePrice({
        vehicleType,
        duration: parseFloat(duration),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
      })

      onCalculate(result)
      setOpen(false)
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Calculator className="h-4 w-4 mr-2" />
          Price Calculator
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calculate Parking Price</DialogTitle>
          <DialogDescription>
            Calculate pricing for a potential booking
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Vehicle Type</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duration (hours)</Label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Enter duration in hours"
            />
          </div>
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCalculate} disabled={loading}>
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Calculate Price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PaymentDashboard() {
  const {
    payments,
    loading,
    pagination,
    statistics,
    fetchPayments,
    createRefund,
    updatePaymentStatus,
    exportPayments
  } = usePayments()

  const [filters, setFilters] = useState<PaymentFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [priceResult, setPriceResult] = useState<any>(null)

  // Load initial data
  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Apply filters
  const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
    // Convert 'all' values to undefined for filtering
    const filterValue = value === 'all' ? undefined : value
    const newFilters = { ...filters, [key]: filterValue }
    setFilters(newFilters)
    fetchPayments(newFilters, 1)
  }

  // Search
  const handleSearch = () => {
    const newFilters = { ...filters, search: searchTerm || undefined }
    setFilters(newFilters)
    fetchPayments(newFilters, 1)
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    fetchPayments({}, 1)
  }

  // Handle refund
  const handleRefund = async (paymentId: string, amount: number, reason: string) => {
    await createRefund({ paymentId, refundAmount: amount, refundReason: reason })
    fetchPayments(filters, pagination.currentPage) // Refresh data
  }

  // Statistics cards data
  const statsCards = useMemo(() => [
    {
      title: 'Total Revenue',
      value: statistics ? `$${statistics.totalAmount.toLocaleString()}` : '$0',
      icon: DollarSign,
      change: '+12.5%',
      changeType: 'positive' as const
    },
    {
      title: 'Total Payments',
      value: statistics ? statistics.totalPayments.toString() : '0',
      icon: CreditCard,
      change: '+8.2%',
      changeType: 'positive' as const
    },
    {
      title: 'Average Payment',
      value: statistics ? `$${statistics.avgAmount.toFixed(2)}` : '$0',
      icon: TrendingUp,
      change: '-2.1%',
      changeType: 'negative' as const
    },
    {
      title: 'Refunded Amount',
      value: statistics ? `$${statistics.refundedAmount.toLocaleString()}` : '$0',
      icon: TrendingDown,
      change: '+5.3%',
      changeType: 'negative' as const
    }
  ], [statistics])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payment Management</h2>
          <p className="text-muted-foreground">
            Manage payments, process refunds, and analyze revenue
          </p>
        </div>
        <div className="flex space-x-2">
          <PriceCalculator onCalculate={setPriceResult} />
          <Button
            variant="outline"
            onClick={() => exportPayments(filters)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => fetchPayments(filters, pagination.currentPage)}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Price Calculator Result */}
      {priceResult && (
        <Card>
          <CardHeader>
            <CardTitle>Price Calculation Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tier</p>
                <p className="font-medium">{priceResult.recommendedPricing?.tierName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Base Amount</p>
                <p className="font-medium">${priceResult.recommendedPricing?.baseAmount.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Surcharge</p>
                <p className="font-medium">{priceResult.recommendedPricing?.surchargeMultiplier || 1}x</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Final Amount</p>
                <p className="font-bold text-lg">${priceResult.recommendedPricing?.finalAmount.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  placeholder="Search by transaction ID, vehicle number..."
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
              value={filters.paymentStatus || ''}
              onValueChange={(value) => handleFilterChange('paymentStatus', value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.paymentMethod || ''}
              onValueChange={(value) => handleFilterChange('paymentMethod', value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payments ({pagination.totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell className="font-mono text-sm">
                      {payment._id.slice(-8)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </TableCell>
                    <TableCell>
                      <PaymentMethodBadge method={payment.paymentMethod} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      {payment.metadata.vehicleNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {payment.metadata.slotNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {payment.paymentStatus === 'completed' && (
                          <RefundDialog payment={payment} onRefund={handleRefund} />
                        )}
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
                onClick={() => fetchPayments(filters, pagination.currentPage - 1)}
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-sm">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={!pagination.hasNext}
                onClick={() => fetchPayments(filters, pagination.currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                Complete information for payment {selectedPayment._id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment ID</Label>
                  <p className="font-mono text-sm">{selectedPayment._id}</p>
                </div>
                <div>
                  <Label>Booking ID</Label>
                  <p className="font-mono text-sm">{selectedPayment.bookingId}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-semibold">
                    ${selectedPayment.amount.toFixed(2)} {selectedPayment.currency}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <PaymentStatusBadge status={selectedPayment.paymentStatus} />
                  </div>
                </div>
                <div>
                  <Label>Method</Label>
                  <div className="mt-1">
                    <PaymentMethodBadge method={selectedPayment.paymentMethod} />
                  </div>
                </div>
                <div>
                  <Label>Transaction ID</Label>
                  <p className="font-mono text-sm">{selectedPayment.transactionId || '-'}</p>
                </div>
              </div>
              
              {selectedPayment.refundDetails && selectedPayment.refundDetails.length > 0 && (
                <div>
                  <Label>Refunds</Label>
                  <div className="mt-2 space-y-2">
                    {selectedPayment.refundDetails.map((refund, index) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">${refund.refundAmount.toFixed(2)}</span>
                          <Badge variant={
                            refund.refundStatus === 'completed' ? 'default' :
                            refund.refundStatus === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {refund.refundStatus}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{refund.refundReason}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(refund.refundDate), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}