import { useState, useEffect, useCallback } from 'react';

export interface UserData {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'attendant';
  phone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  adminLevel?: 'manager' | 'super';
  permissions?: string[];
  status: 'active' | 'inactive';
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  usersByRole: {
    user: number;
    admin: number;
    attendant: number;
  };
  recentlyActive: UserData[];
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'attendant';
  phone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  adminLevel?: 'manager' | 'super';
  permissions?: string[];
  status?: 'active' | 'inactive';
}

export interface UpdateUserData {
  _id: string;
  name?: string;
  email?: string;
  password?: string;
  role?: 'user' | 'admin' | 'attendant';
  phone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  adminLevel?: 'manager' | 'super';
  permissions?: string[];
  status?: 'active' | 'inactive';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Fetch users with filters and pagination
  const fetchUsers = useCallback(async (filters: UserFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      
      if (filters.role) searchParams.append('role', filters.role);
      if (filters.status) searchParams.append('status', filters.status);
      if (filters.search) searchParams.append('search', filters.search);
      if (filters.page) searchParams.append('page', filters.page.toString());
      if (filters.limit) searchParams.append('limit', filters.limit.toString());
      if (filters.sortBy) searchParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) searchParams.append('sortOrder', filters.sortOrder);
      
      // Request stats on first load or when no filters are applied
      const shouldIncludeStats = !filters.role && !filters.status && !filters.search;
      if (shouldIncludeStats) {
        searchParams.append('includeStats', 'true');
      }

      const response = await fetch(`/api/users?${searchParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
        
        // Use server-provided stats if available
        if (data.stats) {
          setStats(data.stats);
        } else if (shouldIncludeStats) {
          // Fallback calculation from current data
          const totalUsers = data.pagination?.totalCount || 0;
          const activeUsers = data.users?.filter((u: UserData) => u.status === 'active').length || 0;
          const inactiveUsers = totalUsers - activeUsers;
          
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const newUsersThisMonth = data.users?.filter((u: UserData) => 
            new Date(u.createdAt) >= startOfMonth
          ).length || 0;
          
          const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const recentlyActive = data.users?.filter((u: UserData) => 
            u.lastLogin && new Date(u.lastLogin) >= lastWeek
          ) || [];
          
          // Calculate users by role
          const usersByRole = {
            user: data.users?.filter((u: UserData) => u.role === 'user').length || 0,
            admin: data.users?.filter((u: UserData) => u.role === 'admin').length || 0,
            attendant: data.users?.filter((u: UserData) => u.role === 'attendant').length || 0
          };
          
          setStats({
            totalUsers,
            activeUsers,
            inactiveUsers,
            newUsersThisMonth,
            usersByRole,
            recentlyActive: recentlyActive.slice(0, 10)
          });
        }
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new user
  const createUser = useCallback(async (userData: CreateUserData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh users list
        await fetchUsers();
        return true;
      } else {
        setError(data.error || 'Failed to create user');
        return false;
      }
    } catch (err) {
      setError('Failed to create user');
      console.error('Create user error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // Update an existing user
  const updateUser = useCallback(async (userData: UpdateUserData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        // Update user in local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userData._id ? { ...user, ...data.user } : user
          )
        );
        return true;
      } else {
        setError(data.error || 'Failed to update user');
        return false;
      }
    } catch (err) {
      setError('Failed to update user');
      console.error('Update user error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a user
  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users?_id=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove user from local state
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        return true;
      } else {
        setError(data.error || 'Failed to delete user');
        return false;
      }
    } catch (err) {
      setError('Failed to delete user');
      console.error('Delete user error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Bulk update users
  const bulkUpdateUsers = useCallback(async (
    userIds: string[], 
    updates: Partial<UpdateUserData>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const updatePromises = userIds.map(userId => 
        updateUser({ _id: userId, ...updates })
      );

      const results = await Promise.all(updatePromises);
      const allSuccessful = results.every(result => result);

      if (allSuccessful) {
        return true;
      } else {
        setError('Some users failed to update');
        return false;
      }
    } catch (err) {
      setError('Failed to bulk update users');
      console.error('Bulk update error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  // Calculate user statistics
  const calculateStats = useCallback(() => {
    if (users.length === 0) return null;

    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;
    
    // Calculate new users this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const newUsersThisMonth = users.filter(user => {
      const createdDate = new Date(user.createdAt);
      return createdDate >= thisMonth;
    }).length;

    // Calculate users by role
    const usersByRole = {
      user: users.filter(user => user.role === 'user').length,
      admin: users.filter(user => user.role === 'admin').length,
      attendant: users.filter(user => user.role === 'attendant').length,
    };

    // Get recently active users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentlyActive = users
      .filter(user => user.lastLogin && new Date(user.lastLogin) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.lastLogin!).getTime() - new Date(a.lastLogin!).getTime())
      .slice(0, 10);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersThisMonth,
      usersByRole,
      recentlyActive,
    };
  }, [users]);

  // Update stats when users change
  useEffect(() => {
    const newStats = calculateStats();
    setStats(newStats);
  }, [users, calculateStats]);

  // Export users data as CSV
  const exportUsers = useCallback((filteredUsers?: UserData[]) => {
    const usersToExport = filteredUsers || users;
    
    const headers = [
      'ID',
      'Name',
      'Email',
      'Role',
      'Status',
      'Phone',
      'Vehicle Number',
      'Vehicle Type',
      'Admin Level',
      'Verified',
      'Last Login',
      'Created At',
      'Updated At'
    ];

    const csvData = usersToExport.map(user => [
      user._id,
      user.name,
      user.email,
      user.role,
      user.status,
      user.phone || '',
      user.vehicleNumber || '',
      user.vehicleType || '',
      user.adminLevel || '',
      user.isVerified ? 'Yes' : 'No',
      user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '',
      new Date(user.createdAt).toLocaleString(),
      new Date(user.updatedAt).toLocaleString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [users]);

  // Search users
  const searchUsers = useCallback(async (searchTerm: string, filters: Omit<UserFilters, 'search'> = {}) => {
    await fetchUsers({ ...filters, search: searchTerm });
  }, [fetchUsers]);

  // Filter users
  const filterUsers = useCallback(async (filters: UserFilters) => {
    await fetchUsers(filters);
  }, [fetchUsers]);

  // Reset filters
  const resetFilters = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  return {
    // Data
    users,
    stats,
    pagination,
    loading,
    error,

    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkUpdateUsers,
    exportUsers,
    searchUsers,
    filterUsers,
    resetFilters,

    // Utilities
    calculateStats,
  };
}