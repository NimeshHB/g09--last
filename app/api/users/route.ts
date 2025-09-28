import { NextRequest, NextResponse } from "next/server";
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Create user (POST)
export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();
    
    // Validation
    if (!data.name || !data.email || !data.password) {
      return NextResponse.json({ 
        success: false, 
        error: "Name, email, and password are required" 
      }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid email format" 
      }, { status: 400 });
    }

    // Password validation
    if (data.password.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: "Password must be at least 6 characters long" 
      }, { status: 400 });
    }

    // Role validation
    const validRoles = ['user', 'admin', 'attendant'];
    if (!validRoles.includes(data.role)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid role specified" 
      }, { status: 400 });
    }

    // Vehicle validation for users
    if (data.role === 'user') {
      if (!data.vehicleNumber || !data.vehicleType) {
        return NextResponse.json({ 
          success: false, 
          error: "Vehicle number and type are required for users" 
        }, { status: 400 });
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: "Email already exists" 
      }, { status: 400 });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // Prepare user data based on role
    const userData = { 
      ...data, 
      password: hashedPassword,
      role: data.role,
      status: data.status || 'active',
      isVerified: data.role === 'admin' ? true : (data.isVerified || false),
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add role-specific fields
    if (data.role === 'admin') {
      userData.adminLevel = data.adminLevel || 'manager';
      userData.permissions = Array.isArray(data.permissions) ? data.permissions : [];
    }
    
    const user = new User(userData);
    await user.save();
    
    // Return safe user data (without password)
    const { password, verificationToken, verificationTokenExpires, ...safeUser } = user.toObject();
    return NextResponse.json({ 
      success: true, 
      user: {
        ...safeUser,
        _id: safeUser._id.toString(),
        createdAt: safeUser.createdAt?.toISOString(),
        updatedAt: safeUser.updatedAt?.toISOString(),
        lastLogin: safeUser.lastLogin?.toISOString() || null
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        error: "Email already exists" 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

// Get users (GET)
export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    
    // Build filter
    const filter: any = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get users with pagination
    const users = await User.find(filter)
      .select('-password -verificationToken -verificationTokenExpires')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalCount = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Format response
    const safeUsers = users.map((user) => ({
      ...user.toObject(),
      _id: user._id.toString(),
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
      lastLogin: user.lastLogin?.toISOString() || null
    }));
    
    // Calculate stats if requested
    let stats = null;
    if (includeStats) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const [totalUsers, activeUsers, inactiveUsers, newUsersThisMonth, recentlyActive, usersByRole] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'inactive' }),
        User.countDocuments({ createdAt: { $gte: startOfMonth } }),
        User.find({ 
          lastLogin: { $gte: lastWeek },
          status: 'active'
        }).select('_id name email lastLogin').limit(10),
        Promise.all([
          User.countDocuments({ role: 'user' }),
          User.countDocuments({ role: 'admin' }),
          User.countDocuments({ role: 'attendant' })
        ])
      ]);
      
      stats = {
        totalUsers,
        activeUsers,
        inactiveUsers,
        newUsersThisMonth,
        usersByRole: {
          user: usersByRole[0],
          admin: usersByRole[1],
          attendant: usersByRole[2]
        },
        recentlyActive: recentlyActive.map(user => ({
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          lastLogin: user.lastLogin?.toISOString() || null
        }))
      };
    }
    
    return NextResponse.json({ 
      success: true, 
      users: safeUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      ...(stats && { stats })
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}

// Update user (PATCH)
export async function PATCH(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();
    const { _id, password, ...updateFields } = data;
    
    if (!_id) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing user _id" 
      }, { status: 400 });
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(_id)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid user ID format" 
      }, { status: 400 });
    }

    // Get current user to check role
    const currentUser = await User.findById(_id);
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found" 
      }, { status: 404 });
    }

    // Email validation if email is being updated
    if (updateFields.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateFields.email)) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid email format" 
        }, { status: 400 });
      }

      // Check if email already exists (excluding current user)
      const existingUser = await User.findOne({ 
        email: updateFields.email, 
        _id: { $ne: new Types.ObjectId(_id) } 
      });
      if (existingUser) {
        return NextResponse.json({ 
          success: false, 
          error: "Email already exists" 
        }, { status: 400 });
      }
    }

    // Role validation if role is being updated
    if (updateFields.role) {
      const validRoles = ['user', 'admin', 'attendant'];
      if (!validRoles.includes(updateFields.role)) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid role specified" 
        }, { status: 400 });
      }
    }

    // Vehicle validation for users
    if ((updateFields.role === 'user' || currentUser.role === 'user') && updateFields.role !== 'admin' && updateFields.role !== 'attendant') {
      if (updateFields.vehicleNumber === '' || updateFields.vehicleType === '') {
        return NextResponse.json({ 
          success: false, 
          error: "Vehicle number and type are required for users" 
        }, { status: 400 });
      }
    }

    // Handle password update if provided
    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json({ 
          success: false, 
          error: "Password must be at least 6 characters long" 
        }, { status: 400 });
      }
      const saltRounds = 12;
      updateFields.password = await bcrypt.hash(password, saltRounds);
    }

    // Validate permissions if provided (for admins)
    if (updateFields.permissions && !Array.isArray(updateFields.permissions)) {
      return NextResponse.json({ 
        success: false, 
        error: "Permissions must be an array" 
      }, { status: 400 });
    }

    // Prevent deletion of super admin if it's the last one and status is being changed to inactive
    if (currentUser.role === 'admin' && currentUser.adminLevel === 'super' && updateFields.status === 'inactive') {
      const superAdminCount = await User.countDocuments({ 
        role: 'admin', 
        adminLevel: 'super', 
        status: 'active',
        _id: { $ne: new Types.ObjectId(_id) }
      });
      
      if (superAdminCount === 0) {
        return NextResponse.json({ 
          success: false, 
          error: "Cannot deactivate the last active super admin" 
        }, { status: 400 });
      }
    }

    updateFields.updatedAt = new Date();
    
    const result = await User.updateOne(
      { _id: new Types.ObjectId(_id) },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found" 
      }, { status: 404 });
    }

    // Get updated user data (without password)
    const updatedUser = await User.findById(_id).select('-password -verificationToken -verificationTokenExpires');
    
    return NextResponse.json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      user: {
        ...updatedUser?.toObject(),
        _id: updatedUser?._id.toString(),
        createdAt: updatedUser?.createdAt?.toISOString(),
        updatedAt: updatedUser?.updatedAt?.toISOString(),
        lastLogin: updatedUser?.lastLogin?.toISOString() || null
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        error: "Email already exists" 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
// Delete user (DELETE)
export async function DELETE(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();
    const { userIds, _id } = data;
    
    // Handle single user deletion
    if (_id) {
      if (!Types.ObjectId.isValid(_id)) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid user ID format" 
        }, { status: 400 });
      }

      // Check if user exists
      const userToDelete = await User.findById(_id);
      if (!userToDelete) {
        return NextResponse.json({ 
          success: false, 
          error: "User not found" 
        }, { status: 404 });
      }

      // Prevent deletion of super admin if it's the last one
      if (userToDelete.role === 'admin' && userToDelete.adminLevel === 'super') {
        const superAdminCount = await User.countDocuments({ 
          role: 'admin', 
          adminLevel: 'super', 
          status: 'active',
          _id: { $ne: new Types.ObjectId(_id) }
        });
        
        if (superAdminCount === 0) {
          return NextResponse.json({ 
            success: false, 
            error: "Cannot delete the last active super admin" 
          }, { status: 400 });
        }
      }

      const result = await User.deleteOne({ _id: new Types.ObjectId(_id) });
      
      return NextResponse.json({ 
        success: true, 
        deletedCount: result.deletedCount,
        message: "User deleted successfully"
      }, { status: 200 });
    }
    
    // Handle bulk deletion
    if (userIds && Array.isArray(userIds)) {
      // Validate all IDs
      const invalidIds = userIds.filter(id => !Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid user ID format in bulk delete" 
        }, { status: 400 });
      }

      // Check for super admins that can't be deleted
      const superAdmins = await User.find({
        _id: { $in: userIds.map(id => new Types.ObjectId(id)) },
        role: 'admin',
        adminLevel: 'super'
      });
      
      if (superAdmins.length > 0) {
        const remainingSuperAdmins = await User.countDocuments({
          role: 'admin',
          adminLevel: 'super',
          status: 'active',
          _id: { $nin: userIds.map(id => new Types.ObjectId(id)) }
        });
        
        if (remainingSuperAdmins === 0) {
          return NextResponse.json({ 
            success: false, 
            error: "Cannot delete all super admins" 
          }, { status: 400 });
        }
      }

      const result = await User.deleteMany({ 
        _id: { $in: userIds.map(id => new Types.ObjectId(id)) }
      });
      
      return NextResponse.json({ 
        success: true, 
        deletedCount: result.deletedCount,
        message: `${result.deletedCount} users deleted successfully`
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "Missing user ID or user IDs" 
    }, { status: 400 });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

// Bulk update users (PUT)
export async function PUT(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();
    const { userIds, updates } = data;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing or invalid user IDs array" 
      }, { status: 400 });
    }
    
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ 
        success: false, 
        error: "Missing or invalid updates object" 
      }, { status: 400 });
    }
    
    // Validate all user IDs
    const invalidIds = userIds.filter(id => !Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid user ID format in bulk update" 
      }, { status: 400 });
    }
    
    // Validate role if being updated
    if (updates.role) {
      const validRoles = ['user', 'admin', 'attendant'];
      if (!validRoles.includes(updates.role)) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid role specified" 
        }, { status: 400 });
      }
    }
    
    // Prevent deactivating all super admins
    if (updates.status === 'inactive') {
      const affectedSuperAdmins = await User.find({
        _id: { $in: userIds.map(id => new Types.ObjectId(id)) },
        role: 'admin',
        adminLevel: 'super',
        status: 'active'
      });
      
      if (affectedSuperAdmins.length > 0) {
        const remainingActiveSuperAdmins = await User.countDocuments({
          role: 'admin',
          adminLevel: 'super',
          status: 'active',
          _id: { $nin: userIds.map(id => new Types.ObjectId(id)) }
        });
        
        if (remainingActiveSuperAdmins === 0) {
          return NextResponse.json({ 
            success: false, 
            error: "Cannot deactivate all super admins" 
          }, { status: 400 });
        }
      }
    }
    
    // Add updatedAt timestamp
    updates.updatedAt = new Date();
    
    const result = await User.updateMany(
      { _id: { $in: userIds.map(id => new Types.ObjectId(id)) } },
      { $set: updates }
    );
    
    return NextResponse.json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      message: `${result.modifiedCount} users updated successfully`
    }, { status: 200 });
  } catch (error: any) {
    console.error('Bulk update users error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
