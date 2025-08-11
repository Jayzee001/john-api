# Email Verification System with MailerSend

This document explains how to set up and use the email verification system in your e-commerce API.

## 🚀 Setup Instructions

### 1. Complete MailerSend Setup

Based on the MailerSend dashboard you shared, complete these steps:

1. **Verify your email address** ✅ (Already completed)
2. **Select sending method**: Choose **API** (recommended for your use case)
3. **Get your API key**: 
   - Go to Settings → API Keys
   - Click "Create new API key"
   - Give it a name (e.g., "E-commerce API")
   - Copy the generated API key
4. **Verify your domain**: 
   - Go to Settings → Domains
   - Add your domain (or use the test domain for now)

### 2. Environment Configuration

Add these variables to your `.env` file:

```env
# MailerSend Configuration
MAILERSEND_API_KEY=your_mailersend_api_key_here
MAILERSEND_SENDER_EMAIL=noreply@yourdomain.com
```

**Important Notes:**
- Replace `your_mailersend_api_key_here` with your actual API key
- For `MAILERSEND_SENDER_EMAIL`, use a verified domain email (e.g., `noreply@yourdomain.com`)
- If using test domain, you can use something like `noreply@test.mailersend.com`

### 3. Install Dependencies

Run this command to install the required packages:

```bash
npm install mailersend
```

## 📧 API Endpoints

### Email Verification Routes

All endpoints are prefixed with `/api/email-verification`

#### 1. Send OTP
**POST** `/send-otp`

Send a 6-digit OTP to the user's email address.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your email",
  "email": "user@example.com"
}
```

#### 2. Verify OTP
**POST** `/verify-otp`

Verify the OTP and mark the user's email as verified.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": true
  }
}
```

#### 3. Resend OTP
**POST** `/resend-otp`

Resend a new OTP if the previous one expired or was lost.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "New OTP sent successfully to your email",
  "email": "user@example.com"
}
```

#### 4. Check Verification Status
**GET** `/status/:email`

Check if a user's email is verified.

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "emailVerified": true,
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## 🔄 User Registration Flow

The system automatically sends an OTP when a user registers:

1. **User registers** → Account created with `emailVerified: false`
2. **OTP generated** → 6-digit code created and stored in database
3. **Email sent** → OTP sent to user's email via MailerSend
4. **User verifies** → Enters OTP to verify email
5. **Account activated** → `emailVerified` set to `true`
6. **Welcome email** → Confirmation email sent

## 🗄️ Database Schema

### OTP Codes Container

```json
{
  "id": "otp_1234567890_abc123",
  "email": "user@example.com",
  "otp": "123456",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "expiresAt": "2024-01-01T12:10:00.000Z",
  "isUsed": false,
  "usedAt": null
}
```

**Fields:**
- `id`: Unique identifier
- `email`: User's email address (partition key)
- `otp`: 6-digit verification code
- `createdAt`: When OTP was created
- `expiresAt`: When OTP expires (10 minutes from creation)
- `isUsed`: Whether OTP has been used
- `usedAt`: When OTP was used (if applicable)

## ⚙️ Configuration Options

### OTP Expiration
OTPs expire after 10 minutes by default. To change this, modify the `expiresAt` calculation in `src/services/otpService.js`:

```javascript
// Change from 10 minutes to 15 minutes
expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
```

### Email Templates
Customize email templates in `src/services/emailService.js`:
- HTML templates for rich email clients
- Plain text templates for simple email clients
- Styling and branding can be modified

## 🧪 Testing

### Test with MailerSend Test Domain

1. Use the test domain provided by MailerSend
2. Send test emails to your verified email address
3. Check MailerSend logs for delivery status

### Local Testing

1. Set up your `.env` file with MailerSend credentials
2. Run the API: `npm run dev`
3. Register a new user
4. Check your email for the OTP
5. Verify the OTP using the API

## 🚨 Error Handling

### Common Issues

1. **Invalid API Key**
   - Check your `MAILERSEND_API_KEY` in `.env`
   - Verify the key is active in MailerSend dashboard

2. **Domain Not Verified**
   - Ensure your sender email domain is verified
   - Use test domain for development

3. **Rate Limiting**
   - MailerSend has rate limits based on your plan
   - Check dashboard for current usage

4. **OTP Expired**
   - OTPs expire after 10 minutes
   - Use resend endpoint to get a new one

### Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

## 🔒 Security Features

- **OTP Expiration**: Codes expire after 10 minutes
- **Single Use**: Each OTP can only be used once
- **Rate Limiting**: Built-in rate limiting on all endpoints
- **Input Validation**: Comprehensive validation for all inputs
- **Secure Storage**: OTPs stored securely in Cosmos DB

## 📱 Frontend Integration

### Example React Component

```jsx
import React, { useState } from 'react';

const EmailVerification = ({ email }) => {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');

  const verifyOTP = async () => {
    try {
      const response = await fetch('/api/email-verification/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      setMessage(data.message);
      
      if (data.success) {
        // Redirect or update UI
        window.location.href = '/dashboard';
      }
    } catch (error) {
      setMessage('Verification failed. Please try again.');
    }
  };

  return (
    <div>
      <h2>Verify Your Email</h2>
      <p>Enter the 6-digit code sent to {email}</p>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        maxLength={6}
      />
      <button onClick={verifyOTP}>Verify</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default EmailVerification;
```

## 🚀 Production Deployment

### Environment Variables
Ensure these are set in production:
- `MAILERSEND_API_KEY`
- `MAILERSEND_SENDER_EMAIL`
- `COSMOS_ENDPOINT`
- `COSMOS_KEY`

### Monitoring
- Check MailerSend dashboard for email delivery rates
- Monitor OTP verification success rates
- Set up alerts for failed email deliveries

### Scaling
- The system automatically cleans up expired OTPs
- Consider implementing a cron job for additional cleanup
- Monitor Cosmos DB RU consumption

## 📞 Support

If you encounter issues:
1. Check MailerSend dashboard for API status
2. Verify your environment variables
3. Check server logs for detailed error messages
4. Ensure your domain is properly verified

---

**Happy coding! 🎉**
