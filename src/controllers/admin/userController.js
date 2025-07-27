// User Management Controller for Admin
// This controller will handle:
// - Advanced user management operations
// - User analytics and reporting
// - Bulk user operations
// - User activity tracking

import userService from '../../services/userService.js';
import { body, validationResult, query } from 'express-validator';

export class AdminUserController {
  // Validation rules for user operations
  static updateUserValidation = [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('First name must be at least 2 characters long'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Last name must be at least 2 characters long'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('role')
      .optional()
      .isIn(['admin', 'customer'])
      .withMessage('Role must be either admin or customer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean value'),
    body('address.street')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Street address is required if address is provided'),
    body('address.city')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('City is required if address is provided'),
    body('address.postCode')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Post code is required if address is provided'),
    body('address.country')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Country is required if address is provided')
  ];

  static searchUsersValidation = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search term must be at least 2 characters long'),
    query('role')
      .optional()
      .isIn(['admin', 'customer', 'all'])
      .withMessage('Role filter must be admin, customer, or all'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'all'])
      .withMessage('Status filter must be active, inactive, or all'),
    query('hasAddress')
      .optional()
      .isBoolean()
      .withMessage('hasAddress must be a boolean value')
  ];

  // Get comprehensive user analytics and stats
  static async getUserAnalytics(req, res, next) {
    try {
      // Get all users for analytics
      const allUsers = await userService.getAllUsers(1, 10000); // Get all users
      const users = allUsers.users;

      // Calculate current date and first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate stats
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.isActive).length;
      const inactiveUsers = totalUsers - activeUsers;
      const adminUsers = users.filter(user => user.role === 'admin').length;
      const customerUsers = users.filter(user => user.role === 'customer').length;
      
      // New users this month
      const newUsersThisMonth = users.filter(user => {
        const userCreatedAt = new Date(user.createdAt);
        return userCreatedAt >= firstDayOfMonth;
      }).length;

      // Users with complete address
      const usersWithAddress = users.filter(user => {
        const address = user.address;
        return address && 
               address.street && 
               address.city && 
               address.postCode && 
               address.country;
      }).length;

      // Users with partial address
      const usersWithPartialAddress = users.filter(user => {
        const address = user.address;
        return address && (
          address.street || 
          address.city || 
          address.postCode || 
          address.country
        );
      }).length;

      // Users with no address
      const usersWithNoAddress = totalUsers - usersWithPartialAddress;

      // Email verification stats
      const verifiedUsers = users.filter(user => user.emailVerified).length;
      const unverifiedUsers = totalUsers - verifiedUsers;

      // Monthly growth (last 6 months)
      const monthlyGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const usersInMonth = users.filter(user => {
          const userCreatedAt = new Date(user.createdAt);
          return userCreatedAt >= monthStart && userCreatedAt <= monthEnd;
        }).length;

        monthlyGrowth.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          newUsers: usersInMonth
        });
      }

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            activeUsers,
            inactiveUsers,
            adminUsers,
            customerUsers
          },
          monthly: {
            newUsersThisMonth,
            monthlyGrowth
          },
          address: {
            usersWithCompleteAddress: usersWithAddress,
            usersWithPartialAddress: usersWithPartialAddress - usersWithAddress,
            usersWithNoAddress,
            totalWithAnyAddress: usersWithPartialAddress
          },
          verification: {
            verifiedUsers,
            unverifiedUsers,
            verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Advanced search users with multiple filters
  static async searchUsers(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation Error',
            details: errors.array().map(err => err.msg)
          }
        });
      }

      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        role = 'all', 
        status = 'all',
        hasAddress = null 
      } = req.query;

      // Get all users for filtering
      const allUsers = await userService.getAllUsers(1, 10000);
      let filteredUsers = allUsers.users;

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.phone?.includes(search)
        );
      }

      // Apply role filter
      if (role !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === role);
      }

      // Apply status filter
      if (status !== 'all') {
        const isActive = status === 'active';
        filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
      }

      // Apply address filter
      if (hasAddress !== null) {
        const hasAddressBool = hasAddress === 'true';
        filteredUsers = filteredUsers.filter(user => {
          const address = user.address;
          const hasCompleteAddress = address && 
                                   address.street && 
                                   address.city && 
                                   address.postCode && 
                                   address.country;
          return hasAddressBool ? hasCompleteAddress : !hasCompleteAddress;
        });
      }

      // Sort by creation date (newest first)
      filteredUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      // Calculate pagination info
      const totalPages = Math.ceil(filteredUsers.length / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        success: true,
        data: {
          users: paginatedUsers.map(user => user.toPublicProfile()),
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalUsers: filteredUsers.length,
            usersPerPage: parseInt(limit),
            hasNextPage,
            hasPrevPage
          },
          filters: {
            search,
            role,
            status,
            hasAddress: hasAddress !== null ? hasAddress : null
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user by ID with detailed information
  static async getUserById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            details: 'The requested user does not exist'
          }
        });
      }

      // Check if user has complete address
      const address = user.address;
      const hasCompleteAddress = address && 
                               address.street && 
                               address.city && 
                               address.postCode && 
                               address.country;

      res.json({
        success: true,
        data: {
          user: user.toPublicProfile(),
          analytics: {
            hasCompleteAddress,
            accountAge: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)), // days
            lastUpdated: user.updatedAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user with enhanced validation
  static async updateUser(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation Error',
            details: errors.array().map(err => err.msg)
          }
        });
      }

      // First check if user exists
      const existingUser = await userService.findById(req.params.id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            details: 'The user you are trying to update does not exist'
          }
        });
      }

      const { firstName, lastName, phone, address, password, role, isActive } = req.body;
      const updateData = {};

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;
      if (password) updateData.password = password;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update user
      const updatedUser = await userService.updateUser(req.params.id, updateData);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          user: updatedUser.toPublicProfile()
        }
      });
    } catch (error) {
      // Handle specific Cosmos DB errors
      if (error.message && error.message.includes('Entity with the specified id does not exist')) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            details: 'The user you are trying to update does not exist in the database'
          }
        });
      }
      
      next(error);
    }
  }

  // Delete user with confirmation
  static async deleteUser(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            details: 'The requested user does not exist'
          }
        });
      }

      await userService.deleteUser(req.params.id);

      res.json({
        success: true,
        message: 'User deleted successfully',
        data: {
          deletedUser: {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk operations (placeholder for future implementation)
  static async bulkUpdateUsers(req, res, next) {
    // TODO: Implement bulk update functionality
    res.status(501).json({
      success: false,
      message: 'Bulk update functionality not implemented yet'
    });
  }

  // Export users functionality (placeholder for future implementation)
  static async exportUsers(req, res, next) {
    // TODO: Implement export to CSV/Excel functionality
    res.status(501).json({
      success: false,
      message: 'Export functionality not implemented yet'
    });
  }

  // Get all user IDs for testing/debugging
  static async getAllUserIds(req, res, next) {
    try {
      const allUsers = await userService.getAllUsers(1, 10000);
      const userIds = allUsers.users.map(user => ({
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        isActive: user.isActive
      }));

      res.json({
        success: true,
        data: {
          totalUsers: userIds.length,
          users: userIds
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 