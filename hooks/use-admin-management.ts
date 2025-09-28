import { useState, useEffect, useCallback } from 'react';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  adminLevel: 'manager' | 'super';
  permissions: string[];
  status: 'active' | 'inactive';
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminActivity {
  id: string;
  adminName: string;
  adminEmail: string;
  adminLevel: string;
  status: string;
  lastLogin: string | null;
  lastActivity: string | null;
  daysSinceLastLogin: number;
  createdAt: string;
  actions: {
    action: string;
    timestamp: string;
    status: string;
    details: string;
  }[];
}

export interface AdminStats {
  totalAdmins: number;
  activeAdmins: number;
  superAdmins: number;
  recentLogins: number;
}

export interface CreateAdminData {
  name: string;
  email: string;
  password: string;
  adminLevel: 'manager' | 'super';
  permissions: string[];
  status: 'active' | 'inactive';
}

export interface UpdateAdminData {
  _id: string;
  name?: string;
  email?: string;
  password?: string;
  adminLevel?: 'manager' | 'super';
  permissions?: string[];
  status?: 'active' | 'inactive';
}

export function useAdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalAdmins: 0,
    activeAdmins: 0,
    superAdmins: 0,
    recentLogins: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all admins
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching admins from /api/users?role=admin');
      const response = await fetch('/api/users?role=admin');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setAdmins(data.users || []);
        console.log('Admins loaded:', data.users?.length || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch admins');
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch admin activity
  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/activity');
      const data = await response.json();
      
      if (data.success) {
        setActivity(data.data.logs || []);
        setStats(data.data.stats || stats);
      } else {
        console.error('Failed to fetch activity:', data.error);
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  }, [stats]);

  // Create a new admin
  const createAdmin = useCallback(async (adminData: CreateAdminData): Promise<{ success: boolean; error?: string; admin?: AdminUser }> => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the admin list
        await fetchAdmins();
        await fetchActivity();
        return { success: true, admin: data.user };
      } else {
        return { success: false, error: data.error || 'Failed to create admin' };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create admin';
      console.error('Error creating admin:', err);
      return { success: false, error: errorMessage };
    }
  }, [fetchAdmins, fetchActivity]);

  // Update an admin
  const updateAdmin = useCallback(async (adminData: UpdateAdminData): Promise<{ success: boolean; error?: string; admin?: AdminUser }> => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the admin list
        await fetchAdmins();
        await fetchActivity();
        return { success: true, admin: data.user };
      } else {
        return { success: false, error: data.error || 'Failed to update admin' };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update admin';
      console.error('Error updating admin:', err);
      return { success: false, error: errorMessage };
    }
  }, [fetchAdmins, fetchActivity]);

  // Delete an admin
  const deleteAdmin = useCallback(async (adminId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/users?_id=${adminId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the admin list
        await fetchAdmins();
        await fetchActivity();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to delete admin' };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete admin';
      console.error('Error deleting admin:', err);
      return { success: false, error: errorMessage };
    }
  }, [fetchAdmins, fetchActivity]);

  // Toggle admin status (activate/deactivate)
  const toggleAdminStatus = useCallback(async (adminId: string, currentStatus: string): Promise<{ success: boolean; error?: string }> => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return updateAdmin({ _id: adminId, status: newStatus });
  }, [updateAdmin]);

  // Search and filter admins
  const searchAdmins = useCallback((searchTerm: string, statusFilter?: string, levelFilter?: string) => {
    return admins.filter(admin => {
      const matchesSearch = !searchTerm || 
        admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || statusFilter === 'all' || admin.status === statusFilter;
      const matchesLevel = !levelFilter || levelFilter === 'all' || admin.adminLevel === levelFilter;
      
      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [admins]);

  // Initialize data
  useEffect(() => {
    fetchAdmins();
    fetchActivity();
  }, []); // Remove dependencies to prevent infinite loop

  // Update stats when admins change
  useEffect(() => {
    if (admins.length >= 0) { // Allow stats for empty arrays too
      const activeAdmins = admins.filter(admin => admin.status === 'active').length;
      const superAdmins = admins.filter(admin => admin.adminLevel === 'super').length;
      const recentLogins = admins.filter(admin => {
        if (!admin.lastLogin) return false;
        const loginDate = new Date(admin.lastLogin);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return loginDate > weekAgo;
      }).length;

      setStats({
        totalAdmins: admins.length,
        activeAdmins,
        superAdmins,
        recentLogins
      });
    }
  }, [admins]); // Only depend on admins array

  return {
    admins,
    activity,
    stats,
    loading,
    error,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    toggleAdminStatus,
    searchAdmins,
    refreshAdmins: fetchAdmins,
    refreshActivity: fetchActivity
  };
}