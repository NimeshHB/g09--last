// Admin permission management utilities

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'management' | 'analytics' | 'system';
}

export const PERMISSIONS: Permission[] = [
  // Core Operations
  {
    id: 'slots',
    name: 'Parking Slots',
    description: 'Manage parking slots, add/edit/delete slots',
    category: 'core'
  },
  {
    id: 'bookings',
    name: 'Bookings',
    description: 'View and manage user bookings',
    category: 'core'
  },
  
  // User Management
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage regular users, view profiles, handle support',
    category: 'management'
  },
  {
    id: 'admins',
    name: 'Admin Management',
    description: 'Manage admin accounts, permissions, and roles',
    category: 'management'
  },
  
  // Analytics & Reports
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'View dashboard analytics and insights',
    category: 'analytics'
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Generate and export detailed reports',
    category: 'analytics'
  },
  
  // System Settings
  {
    id: 'settings',
    name: 'System Settings',
    description: 'Modify system configuration and preferences',
    category: 'system'
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Manage pricing, payments, and financial data',
    category: 'system'
  }
];

export const ADMIN_LEVELS = {
  manager: {
    name: 'Manager',
    description: 'Limited administrative access',
    maxPermissions: ['slots', 'bookings', 'users', 'analytics', 'reports']
  },
  super: {
    name: 'Super Admin',
    description: 'Full system access',
    maxPermissions: 'all' as const
  }
} as const;

export type AdminLevel = keyof typeof ADMIN_LEVELS;

export class PermissionManager {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('all');
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => 
      this.hasPermission(userPermissions, permission)
    );
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => 
      this.hasPermission(userPermissions, permission)
    );
  }

  /**
   * Get available permissions for an admin level
   */
  static getAvailablePermissions(adminLevel: AdminLevel): string[] {
    const level = ADMIN_LEVELS[adminLevel];
    if (level.maxPermissions === 'all') {
      return PERMISSIONS.map(p => p.id);
    }
    return [...level.maxPermissions];
  }

  /**
   * Validate permissions for an admin level
   */
  static validatePermissions(adminLevel: AdminLevel, permissions: string[]): {
    valid: boolean;
    invalidPermissions: string[];
  } {
    const availablePermissions = this.getAvailablePermissions(adminLevel);
    
    if (availablePermissions.includes('all')) {
      return { valid: true, invalidPermissions: [] };
    }
    
    const invalidPermissions = permissions.filter(
      permission => !availablePermissions.includes(permission)
    );
    
    return {
      valid: invalidPermissions.length === 0,
      invalidPermissions
    };
  }

  /**
   * Get permission display name and description
   */
  static getPermissionInfo(permissionId: string): Permission | null {
    return PERMISSIONS.find(p => p.id === permissionId) || null;
  }

  /**
   * Group permissions by category
   */
  static getPermissionsByCategory(): Record<string, Permission[]> {
    return PERMISSIONS.reduce((acc, permission) => {
      const category = permission.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }

  /**
   * Check if current user can manage another admin
   */
  static canManageAdmin(
    currentUserLevel: AdminLevel,
    currentUserPermissions: string[],
    targetUserLevel: AdminLevel
  ): boolean {
    // Super admins can manage anyone
    if (currentUserLevel === 'super' && this.hasPermission(currentUserPermissions, 'admins')) {
      return true;
    }
    
    // Managers can only manage other managers (not super admins)
    if (currentUserLevel === 'manager' && targetUserLevel === 'manager') {
      return this.hasPermission(currentUserPermissions, 'admins');
    }
    
    return false;
  }

  /**
   * Check if current user can assign specific permissions
   */
  static canAssignPermissions(
    currentUserLevel: AdminLevel,
    currentUserPermissions: string[],
    permissionsToAssign: string[]
  ): boolean {
    // Must have admin management permission
    if (!this.hasPermission(currentUserPermissions, 'admins')) {
      return false;
    }

    // Super admins can assign any permission
    if (currentUserLevel === 'super') {
      return true;
    }

    // Managers can only assign permissions they have and are allowed for their level
    const availablePermissions = this.getAvailablePermissions(currentUserLevel);
    return permissionsToAssign.every(permission => 
      availablePermissions.includes(permission) && 
      this.hasPermission(currentUserPermissions, permission)
    );
  }
}

/**
 * Hook for permission checking in React components
 */
export function usePermissions(userPermissions: string[]) {
  return {
    hasPermission: (permission: string) => 
      PermissionManager.hasPermission(userPermissions, permission),
    
    hasAnyPermission: (permissions: string[]) => 
      PermissionManager.hasAnyPermission(userPermissions, permissions),
    
    hasAllPermissions: (permissions: string[]) => 
      PermissionManager.hasAllPermissions(userPermissions, permissions),
    
    canAccess: (requiredPermissions: string | string[]) => {
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];
      return PermissionManager.hasAnyPermission(userPermissions, permissions);
    }
  };
}