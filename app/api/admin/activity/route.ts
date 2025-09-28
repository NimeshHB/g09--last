import { NextRequest, NextResponse } from "next/server";
import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
import { Types } from 'mongoose';

// Admin Activity Log API
// GET: Fetch admin activity logs
export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const adminId = searchParams.get("adminId");
    const action = searchParams.get("action");
    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: { role: "admin" } },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          adminLevel: 1,
          lastLogin: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          // Calculate activity indicators
          lastActivity: { $ifNull: ["$lastLogin", "$updatedAt"] },
          daysSinceLastLogin: {
            $divide: [
              { $subtract: [new Date(), { $ifNull: ["$lastLogin", "$createdAt"] }] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      { $sort: { lastActivity: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    // Add filters if provided
    if (adminId && Types.ObjectId.isValid(adminId)) {
      pipeline[0].$match._id = new Types.ObjectId(adminId);
    }

    const [admins, total] = await Promise.all([
      User.aggregate(pipeline),
      User.countDocuments({ role: "admin" })
    ]);

    // Format the data for activity logs
    const activityLogs = admins.map(admin => ({
      id: admin._id.toString(),
      adminName: admin.name,
      adminEmail: admin.email,
      adminLevel: admin.adminLevel,
      status: admin.status,
      lastLogin: admin.lastLogin?.toISOString() || null,
      lastActivity: admin.lastActivity?.toISOString() || null,
      daysSinceLastLogin: Math.floor(admin.daysSinceLastLogin || 0),
      createdAt: admin.createdAt?.toISOString(),
      actions: [
        {
          action: admin.lastLogin ? "Login" : "Account Created",
          timestamp: (admin.lastLogin || admin.createdAt)?.toISOString(),
          status: admin.status === "active" ? "success" : "inactive",
          details: admin.lastLogin 
            ? `Last login ${Math.floor(admin.daysSinceLastLogin || 0)} days ago`
            : "Account created"
        }
      ]
    }));

    // Get system-wide admin stats
    const stats = await User.aggregate([
      { $match: { role: "admin" } },
      {
        $group: {
          _id: null,
          totalAdmins: { $sum: 1 },
          activeAdmins: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          superAdmins: {
            $sum: { $cond: [{ $eq: ["$adminLevel", "super"] }, 1, 0] }
          },
          recentLogins: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$lastLogin",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs: activityLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: stats[0] || {
          totalAdmins: 0,
          activeAdmins: 0,
          superAdmins: 0,
          recentLogins: 0
        }
      }
    });
  } catch (error: any) {
    console.error('Get admin activity logs error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// POST: Log admin activity (for future use)
export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();
    const { adminId, action, details, ipAddress, userAgent } = data;

    if (!adminId || !action) {
      return NextResponse.json({
        success: false,
        error: "Admin ID and action are required"
      }, { status: 400 });
    }

    // For now, we'll update the admin's lastLogin if it's a login action
    if (action === "login") {
      await User.updateOne(
        { _id: new Types.ObjectId(adminId), role: "admin" },
        { 
          $set: { 
            lastLogin: new Date(),
            updatedAt: new Date()
          } 
        }
      );
    }

    // In a real application, you would store this in a separate ActivityLog collection
    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: "Activity logged successfully"
    });
  } catch (error: any) {
    console.error('Log admin activity error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}