import { body, validationResult } from 'express-validator';
import userService from '../../services/userService.js';

export class UserController {
  // Validation rules
  static registerValidation = [
    body('firstName')
      .notEmpty()
      .trim()
      .isLength({ min: 2 })
      .withMessage('First name must be at least 2 characters long'),
    body('lastName')
      .notEmpty()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Last name must be at least 2 characters long'),
    body('email')
      .notEmpty()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ];

  static updateProfileValidation = [
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
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ];

  // Get current user profile
  static async getProfile(req, res, next) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user.toPublicProfile()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update current user profile
  static async updateProfile(req, res, next) {
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

      const { firstName, lastName, phone, address, password } = req.body;
      const updateData = {};

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;
      if (password) updateData.password = password;

      // Update user
      const updatedUser = await userService.updateUser(req.user.id, updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser.toPublicProfile()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete current user account
  static async deleteProfile(req, res, next) {
    try {
      await userService.deleteUser(req.user.id);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
} 