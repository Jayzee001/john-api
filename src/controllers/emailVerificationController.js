import { body, validationResult } from 'express-validator';
import emailService from '../services/emailService.js';
import otpService from '../services/otpService.js';
import { CosmosClient } from '@azure/cosmos';

export class EmailVerificationController {
  constructor() {
    this.cosmosClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
    });
    
    this.database = this.cosmosClient.database(process.env.COSMOS_DATABASE_NAME);
    this.usersContainer = this.database.container('users');
    this.otpContainer = this.database.container('otp_codes');
  }

  // Validation middleware for sending OTP
  static sendOTPValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ];

  // Validation middleware for verifying OTP
  static verifyOTPValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit number'),
  ];

  // Send OTP to user's email
  async sendOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email } = req.body;

      // Check if user exists
      const query = 'SELECT * FROM c WHERE c.email = @email';
      const parameters = [{ name: '@email', value: email.toLowerCase() }];
      
      const { resources: users } = await this.usersContainer.items
        .query({ query, parameters })
        .fetchAll();

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email address'
        });
      }

      const user = users[0];

      // Check if email is already verified
      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      // Generate and store OTP
      const otp = otpService.generateOTP();
      await otpService.storeOTP(email, otp);

      // Send OTP email
      await emailService.sendOTPEmail(email, otp, user.firstName);

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email',
        email: email
      });

    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.'
      });
    }
  }

  // Verify OTP and mark email as verified
  async verifyOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email, otp } = req.body;

      // Verify OTP
      const verificationResult = await otpService.verifyOTP(email, otp);
      
      if (!verificationResult.valid) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message
        });
      }

      // Update user's emailVerified status
      const query = 'SELECT * FROM c WHERE c.email = @email';
      const parameters = [{ name: '@email', value: email.toLowerCase() }];
      
      const { resources: users } = await this.usersContainer.items
        .query({ query, parameters })
        .fetchAll();

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = users[0];
      user.emailVerified = true;
      user.updatedAt = new Date().toISOString();

      await this.usersContainer.item(user.id, user.email).replace(user);

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(email, user.firstName);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the verification if welcome email fails
      }

      res.status(200).json({
        success: true,
        message: 'Email verified successfully!',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified
        }
      });

    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP. Please try again later.'
      });
    }
  }

  // Resend OTP
  async resendOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email } = req.body;

      // Check if user exists
      const query = 'SELECT * FROM c WHERE c.email = @email';
      const parameters = [{ name: '@email', value: email.toLowerCase() }];
      
      const { resources: users } = await this.usersContainer.items
        .query({ query, parameters })
        .fetchAll();

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email address'
        });
      }

      const user = users[0];

      // Check if email is already verified
      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      // Resend OTP
      const result = await otpService.resendOTP(email);
      
      // Send new OTP email
      await emailService.sendOTPEmail(email, result.otp, user.firstName);

      res.status(200).json({
        success: true,
        message: 'New OTP sent successfully to your email',
        email: email
      });

    } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again later.'
      });
    }
  }

  // Check email verification status
  async checkVerificationStatus(req, res) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email parameter is required'
        });
      }

      const query = 'SELECT c.id, c.email, c.emailVerified, c.firstName, c.lastName FROM c WHERE c.email = @email';
      const parameters = [{ name: '@email', value: email.toLowerCase() }];
      
      const { resources: users } = await this.usersContainer.items
        .query({ query, parameters })
        .fetchAll();

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = users[0];

      res.status(200).json({
        success: true,
        data: {
          email: user.email,
          emailVerified: user.emailVerified,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });

    } catch (error) {
      console.error('Error checking verification status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check verification status'
      });
    }
  }
}
