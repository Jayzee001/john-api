import { body, validationResult } from 'express-validator';
import userService from '../services/userService.js';
import { generateToken } from '../middleware/auth.js';
import tokenService from '../services/tokenService.js';

export class AuthController {
  // Validation rules
  static registerValidation = [
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
      .withMessage('Last name must be at least 2 characters long')
  ];

  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ];

  // Register new user
  static async register(req, res, next) {
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

      const { email, password, firstName, lastName, address } = req.body;

      // Create user (default role is 'customer')
      const user = await userService.createUser({
        email,
        password,
        firstName,
        lastName,
        address,
        role: 'customer' // Explicitly set customer role
      });

      // Generate JWT token
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toPublicProfile(),
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  static async login(req, res, next) {
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

      const { email, password } = req.body;

      // Verify credentials
      const user = await userService.verifyCredentials(email, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication failed',
            details: 'Invalid email or password'
          }
        });
      }

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toPublicProfile(),
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

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

  // Logout (server-side token blacklisting)
  static async logout(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        // Add token to blacklist
        tokenService.blacklistToken(token);
      }

      res.json({
        success: true,
        message: 'Logout successful',
        data: {
          message: 'Token has been invalidated. Please remove it from your client.'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Logout failed',
          details: 'An error occurred during logout'
        }
      });
    }
  }
} 