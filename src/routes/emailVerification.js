import express from 'express';
import { EmailVerificationController } from '../controllers/emailVerificationController.js';

const router = express.Router();
const emailVerificationController = new EmailVerificationController();

// Send OTP to user's email
router.post('/send-otp', 
  EmailVerificationController.sendOTPValidation,
  emailVerificationController.sendOTP.bind(emailVerificationController)
);

// Verify OTP and mark email as verified
router.post('/verify-otp',
  EmailVerificationController.verifyOTPValidation,
  emailVerificationController.verifyOTP.bind(emailVerificationController)
);

// Resend OTP
router.post('/resend-otp',
  EmailVerificationController.sendOTPValidation,
  emailVerificationController.resendOTP.bind(emailVerificationController)
);

// Check email verification status
router.get('/status/:email',
  emailVerificationController.checkVerificationStatus.bind(emailVerificationController)
);

export default router;
