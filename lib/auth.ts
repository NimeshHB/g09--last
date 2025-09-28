import bcrypt from "bcryptjs"
import dbConnect from "./dbConnect"
import User from "../models/User"

export interface AuthUser {
  id: string
  name: string
  email: string
  role: "user" | "admin" | "attendant"
  phone?: string
  vehicleNumber?: string
  vehicleType?: string
  adminLevel?: "manager" | "super"
  permissions?: string[]
  status: "active" | "inactive"
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    await dbConnect()
    const user = await User.findOne({ email, status: "active" })

    if (!user) {
      return null
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return null
    }

    // Convert MongoDB user to AuthUser
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      vehicleNumber: user.vehicleNumber,
      vehicleType: user.vehicleType,
      adminLevel: user.adminLevel,
      permissions: user.permissions,
      status: user.status,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

export async function registerUser(userData: {
  name: string
  email: string
  password: string
  role: "user" | "admin" | "attendant"
  phone?: string
  vehicleNumber?: string
  vehicleType?: string
  adminLevel?: "manager" | "super"
  permissions?: string[]
}): Promise<AuthUser | null> {
  try {
    await dbConnect()
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email })
    if (existingUser) {
      throw new Error("User with this email already exists")
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    const user = await User.create({
      ...userData,
      password: hashedPassword,
      status: "active",
      isVerified: false,
    })

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      vehicleNumber: user.vehicleNumber,
      vehicleType: user.vehicleType,
      adminLevel: user.adminLevel,
      permissions: user.permissions,
      status: user.status,
    }
  } catch (error) {
    console.error("Registration error:", error)
    return null
  }
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  try {
    await dbConnect()
    const user = await User.findById(id)

    if (!user) {
      return null
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      vehicleNumber: user.vehicleNumber,
      vehicleType: user.vehicleType,
      adminLevel: user.adminLevel,
      permissions: user.permissions,
      status: user.status,
    }
  } catch (error) {
    console.error("Get user error:", error)
    return null
  }
}

export async function checkAuth(request: Request): Promise<{ user: AuthUser | null }> {
  try {
    // For now, return a simple mock auth
    // In a real app, you'd check JWT tokens, sessions, etc.
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return { user: null }
    }
    
    // Mock user for testing - in real app, decode JWT and get user
    const mockUser: AuthUser = {
      id: "mock-user-id",
      name: "Mock User",
      email: "user@example.com",
      role: "admin",
      status: "active"
    }
    
    return { user: mockUser }
  } catch (error) {
    console.error("Auth check error:", error)
    return { user: null }
  }
}
