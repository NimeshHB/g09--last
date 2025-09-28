const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Types } = require('mongoose');
const dbConnect = require('../../lib/dbConnect'); // Adjust path as needed
const User = require('../../models/User'); // Adjust path as needed

// Middleware to parse JSON bodies
router.use(express.json());

// Create user (POST)
router.post('/', async (req, res) => {
  try {
    await dbConnect();
    const data = req.body;

    // Validation
    if (!data.name || !data.email || !data.password) {
      return res.status(400).json({ 
        success: false, 
        error: "Name, email, and password are required" 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid email format" 
      });
    }

    // Password validation
    if (data.password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: "Password must be at least 6 characters long" 
      });
    }

    // Role validation
    const validRoles = ['user', 'admin', 'attendant'];
    if (!validRoles.includes(data.role)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid role specified" 
      });
    }

    // Vehicle validation for users
    if (data.role === 'user') {
      if (!data.vehicleNumber || !data.vehicleType) {
        return res.status(400).json({ 
          success: false, 
          error: "Vehicle number and type are required for users" 
        });
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: "Email already exists" 
      });
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

    if (data.role === 'admin') {
      userData.adminLevel = data.adminLevel || 'manager';
      userData.permissions = Array.isArray(data.permissions) ? data.permissions : [];
    }
    
    const user = new User(userData);
    await user.save();
    
    const { password, verificationToken, verificationTokenExpires, ...safeUser } = user.toObject();
    return res.status(201).json({ 
      success: true, 
      user: {
        ...safeUser,
        _id: safeUser._id.toString(),
        createdAt: safeUser.createdAt?.toISOString(),
        updatedAt: safeUser.updatedAt?.toISOString(),
        lastLogin: safeUser.lastLogin?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        error: "Email already exists" 
      });
    }
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get users (GET)
router.get('/', async (req, res) => {
  try {
    await dbConnect();
    const { includeStats, role, status, search, page = '1', limit = '50', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const users = await User.find(filter)
      .select('-password -verificationToken -verificationTokenExpires')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalCount = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    const safeUsers = users.map(user => ({
      ...user.toObject(),
      _id: user._id.toString(),
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
      lastLogin: user.lastLogin?.toISOString() || null
    }));
    
    let stats = null;
    if (includeStats === 'true') {
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
    
    return res.status(200).json({ 
      success: true, 
      users: safeUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      ...(stats && { stats })
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// Update user (PATCH)
router.patch('/:id', async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const { password, ...updateFields } = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid user ID format" 
      });
    }

    const currentUser = await User.findById(id);
    if (!currentUser) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    if (updateFields.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateFields.email)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid email format" 
        });
      }

      const existingUser = await User.findOne({ 
        email: updateFields.email, 
        _id: { $ne: new Types.ObjectId(id) } 
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: "Email already exists" 
        });
      }
    }

    if (updateFields.role) {
      const validRoles = ['user', 'admin', 'attendant'];
      if (!validRoles.includes(updateFields.role)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid role specified" 
        });
      }
    }

    if ((updateFields.role === 'user' || currentUser.role === 'user') && updateFields.role !== 'admin' && updateFields.role !== 'attendant') {
      if (updateFields.vehicleNumber === '' || updateFields.vehicleType === '') {
        return res.status(400).json({ 
          success: false, 
          error: "Vehicle number and type are required for users" 
        });
      }
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false, 
          error: "Password must be at least 6 characters long" 
        });
      }
      const saltRounds = 12;
      updateFields.password = await bcrypt.hash(password, saltRounds);
    }

    if (updateFields.permissions && !Array.isArray(updateFields.permissions)) {
      return res.status(400).json({ 
        success: false, 
        error: "Permissions must be an array" 
      });
    }

    if (currentUser.role === 'admin' && currentUser.adminLevel === 'super' && updateFields.status === 'inactive') {
      const superAdminCount = await User.countDocuments({ 
        role: 'admin', 
        adminLevel: 'super', 
        status: 'active',
        _id: { $ne: new Types.ObjectId(id) }
      });
      
      if (superAdminCount === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Cannot deactivate the last active super admin" 
        });
      }
    }

    updateFields.updatedAt = new Date();
    
    const result = await User.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    const updatedUser = await User.findById(id).select('-password -verificationToken -verificationTokenExpires');
    
    return res.status(200).json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      user: {
        ...updatedUser?.toObject(),
        _id: updatedUser?._id.toString(),
        createdAt: updatedUser?.createdAt?.toISOString(),
        updatedAt: updatedUser?.updatedAt?.toISOString(),
        lastLogin: updatedUser?.lastLogin?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        error: "Email already exists" 
      });
    }
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete user (DELETE)
router.delete('/', async (req, res) => {
  try {
    await dbConnect();
    const { userIds, _id } = req.body;
    
    if (_id) {
      if (!Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid user ID format" 
        });
      }

      const userToDelete = await User.findById(_id);
      if (!userToDelete) {
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }

      if (userToDelete.role === 'admin' && userToDelete.adminLevel === 'super') {
        const superAdminCount = await User.countDocuments({ 
          role: 'admin', 
          adminLevel: 'super', 
          status: 'active',
          _id: { $ne: new Types.ObjectId(_id) }
        });
        
        if (superAdminCount === 0) {
          return res.status(400).json({ 
            success: false, 
            error: "Cannot delete the last active super admin" 
          });
        }
      }

      const result = await User.deleteOne({ _id: new Types.ObjectId(_id) });
      
      return res.status(200).json({ 
        success: true, 
        deletedCount: result.deletedCount,
        message: "User deleted successfully"
      });
    }
    
    if (userIds && Array.isArray(userIds)) {
      const invalidIds = userIds.filter(id => !Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid user ID format in bulk delete" 
        });
      }

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
          return res.status(400).json({ 
            success: false, 
            error: "Cannot delete all super admins" 
          });
        }
      }

      const result = await User.deleteMany({ 
        _id: { $in: userIds.map(id => new Types.ObjectId(id)) }
      });
      
      return res.status(200).json({ 
        success: true, 
        deletedCount: result.deletedCount,
        message: `${result.deletedCount} users deleted successfully`
      });
    }
    
    return res.status(400).json({ 
      success: false, 
      error: "Missing user ID or user IDs" 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Bulk update users (PUT)
router.put('/', async (req, res) => {
  try {
    await dbConnect();
    const { userIds, updates } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing or invalid user IDs array" 
      });
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: "Missing or invalid updates object" 
      });
    }
    
    const invalidIds = userIds.filter(id => !Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid user ID format in bulk update" 
      });
    }
    
    if (updates.role) {
      const validRoles = ['user', 'admin', 'attendant'];
      if (!validRoles.includes(updates.role)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid role specified" 
        });
      }
    }
    
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
          return res.status(400).json({ 
            success: false, 
            error: "Cannot deactivate all super admins" 
          });
        }
      }
    }
    
    updates.updatedAt = new Date();
    
    const result = await User.updateMany(
      { _id: { $in: userIds.map(id => new Types.ObjectId(id)) } },
      { $set: updates }
    );
    
    return res.status(200).json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      message: `${result.modifiedCount} users updated successfully`
    });
  } catch (error) {
    console.error('Bulk update users error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
