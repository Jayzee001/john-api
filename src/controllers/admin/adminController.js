import { body, validationResult, query } from 'express-validator';
import userService from '../../services/userService.js';
import { AdminSeeder } from '../../seeders/adminSeeder.js';

export class AdminController {
  // Validation rules
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
      .withMessage('isActive must be a boolean value')
  ];

  static listUsersValidation = [
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
      .withMessage('Search term must be at least 2 characters long')
  ];

  // Get all users (admin only)
  static async listUsers(req, res, next) {
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

      const { page = 1, limit = 10, search } = req.query;

      let result;
      if (search) {
        result = await userService.searchUsers(search, parseInt(page), parseInt(limit));
      } else {
        result = await userService.getAllUsers(parseInt(page), parseInt(limit));
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user by ID (admin only)
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

      res.json({
        success: true,
        data: {
          user: user.toPublicProfile()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user by ID (admin only)
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
      next(error);
    }
  }

  // Delete user by ID (admin only)
  static async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(req.params.id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get comprehensive dashboard stats
  static async getDashboardStats(req, res, next) {
    try {
      const { containers } = await import('../../config/cosmos.js');
      
      // Get total revenue from confirmed orders
      const revenueQuery = {
        query: 'SELECT VALUE SUM(c.total) FROM c WHERE c.status = "confirmed" OR c.status = "processing" OR c.status = "out_for_delivery" OR c.status = "delivered"'
      };
      const { resources: revenueResult } = await containers.orders.items.query(revenueQuery).fetchAll();
      const totalRevenue = revenueResult[0] || 0;
      
      // Get total orders count
      const ordersQuery = {
        query: 'SELECT VALUE COUNT(1) FROM c'
      };
      const { resources: ordersResult } = await containers.orders.items.query(ordersQuery).fetchAll();
      const totalOrders = ordersResult[0] || 0;
      
      // Get products count
      const productsQuery = {
        query: 'SELECT VALUE COUNT(1) FROM c'
      };
      const { resources: productsResult } = await containers.products.items.query(productsQuery).fetchAll();
      const totalProducts = productsResult[0] || 0;
      
      // Get published products count
      const publishedProductsQuery = {
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.published = true'
      };
      const { resources: publishedResult } = await containers.products.items.query(publishedProductsQuery).fetchAll();
      const publishedProducts = publishedResult[0] || 0;
      
      // Get pending orders count
      const pendingOrdersQuery = {
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = "pending"'
      };
      const { resources: pendingResult } = await containers.orders.items.query(pendingOrdersQuery).fetchAll();
      const pendingOrders = pendingResult[0] || 0;
      
      // Get order status breakdown
      const orderStatusQuery = {
        query: 'SELECT c.status, COUNT(1) as count FROM c GROUP BY c.status'
      };
      const { resources: orderStatusResult } = await containers.orders.items.query(orderStatusQuery).fetchAll();
      
      // Get product status breakdown
      const productStatusQuery = {
        query: 'SELECT c.published, COUNT(1) as count FROM c GROUP BY c.published'
      };
      const { resources: productStatusResult } = await containers.products.items.query(productStatusQuery).fetchAll();
      
      // Format order status breakdown
      const orderStatus = {
        completed: orderStatusResult.find(item => item.status === 'delivered')?.count || 0,
        pending: orderStatusResult.find(item => item.status === 'pending')?.count || 0,
        processing: orderStatusResult.find(item => item.status === 'processing')?.count || 0,
        confirmed: orderStatusResult.find(item => item.status === 'confirmed')?.count || 0,
        out_for_delivery: orderStatusResult.find(item => item.status === 'out_for_delivery')?.count || 0,
        cancelled: orderStatusResult.find(item => item.status === 'cancelled')?.count || 0
      };
      
      // Format product status breakdown
      const productStatus = {
        published: publishedProducts,
        draft: totalProducts - publishedProducts
      };
      
      res.json({
        success: true,
        data: {
          totalRevenue: totalRevenue,
          totalOrders: totalOrders,
          totalProducts: totalProducts,
          publishedProducts: publishedProducts,
          pendingOrders: pendingOrders,
          orderStatus: orderStatus,
          productStatus: productStatus
        }
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      next(error);
    }
  }

  // Admin management routes
  static createAdminValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('firstName')
      .trim()
      .isLength({ min: 2 })
      .withMessage('First name must be at least 2 characters long'),
    body('lastName')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Last name must be at least 2 characters long'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number')
  ];

  // Create new admin
  static async createAdmin(req, res, next) {
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

      const adminData = {
        ...req.body,
        role: 'admin',
        isActive: true,
        emailVerified: true
      };

      const admin = await AdminSeeder.createCustomAdmin(adminData);

      res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        data: {
          admin: admin.toPublicProfile()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // List all admins
  static async listAdmins(req, res, next) {
    try {
      const admins = await AdminSeeder.listAdmins();

      res.json({
        success: true,
        data: {
          admins,
          total: admins.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete admin
  static async deleteAdmin(req, res, next) {
    try {
      await AdminSeeder.deleteAdmin(req.params.id);

      res.json({
        success: true,
        message: 'Admin deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
} 