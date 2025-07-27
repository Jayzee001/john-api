// User Profile Management Controller
// This controller will handle:
// - Advanced profile management
// - Profile picture upload
// - Address management
// - Preferences and settings

import userService from '../../services/userService.js';
import { body, validationResult } from 'express-validator';

export class ProfileController {
  // Validation rules for address operations
  static addressValidation = [
    body('street')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Street address is required and must be between 1 and 200 characters'),
    body('city')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('City is required and must be between 1 and 100 characters'),
    body('postCode')
      .optional()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Postal code must be between 1 and 20 characters'),
    body('country')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Country is required and must be between 1 and 100 characters')
  ];

  // Get user address
  static async getUserAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await userService.getUserAddress(userId);

      res.json({
        success: true,
        data: {
          address: result.address
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new address
  static async createAddress(req, res, next) {
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

      const userId = req.user.id;
      const addressData = {
        street: req.body.street,
        city: req.body.city,
        postCode: req.body.postCode,
        country: req.body.country
      };

      const result = await userService.createAddress(userId, addressData);

      res.status(201).json({
        success: true,
        message: 'Address created successfully',
        data: {
          address: result.address,
          user: result.user.toPublicProfile()
        }
      });
    } catch (error) {
      if (error.message === 'Address already exists') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Address already exists',
            details: 'User already has an address. Use PUT /api/users/address to update it.'
          }
        });
      }
      next(error);
    }
  }

  // Update user address
  static async updateAddress(req, res, next) {
    try {
      console.log('Update Address - Raw request body:', req.body); // Debug log
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

      const userId = req.user.id;
      const addressData = {};
      
      if (req.body.street !== undefined) addressData.street = req.body.street;
      if (req.body.city !== undefined) addressData.city = req.body.city;
      if (req.body.postCode !== undefined) addressData.postCode = req.body.postCode;
      if (req.body.country !== undefined) addressData.country = req.body.country;

      const result = await userService.updateAddress(userId, addressData);

      res.json({
        success: true,
        message: 'Address updated successfully',
        data: {
          address: result.address,
          user: result.user.toPublicProfile()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // TODO: Implement advanced profile management functionality
  static async uploadProfilePicture(req, res, next) {
    // TODO: Upload profile picture to Azure Blob Storage
    res.status(501).json({
      success: false,
      message: 'Profile picture upload not implemented yet'
    });
  }

  static async updatePreferences(req, res, next) {
    // TODO: Update user preferences and settings
    res.status(501).json({
      success: false,
      message: 'Preferences management not implemented yet'
    });
  }

  static async getProfileStats(req, res, next) {
    // TODO: Get user profile statistics
    res.status(501).json({
      success: false,
      message: 'Profile statistics not implemented yet'
    });
  }
} 