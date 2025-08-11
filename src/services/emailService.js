import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    // Create Gmail transporter for testing
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 15000,   // 15 seconds
      socketTimeout: 30000,     // 30 seconds
      debug: false, // Disable debug to reduce noise
      logger: false
    });
    
    this.senderEmail = process.env.GMAIL_SENDER_EMAIL || process.env.GMAIL_USER;
  }

  async sendOTPEmail(userEmail, otp, userName) {
    try {
      const mailOptions = {
        from: `"John Store" <${this.senderEmail}>`,
        to: userEmail,
        subject: 'Email Verification - John Store',
        html: this.generateOTPEmailHTML(otp, userName),
        text: this.generateOTPEmailText(otp, userName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw error;
    }
  }

  generateOTPEmailHTML(otp, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .otp-code { background: #007bff; color: white; font-size: 24px; font-weight: bold; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>John Store</h1>
            <p>Email Verification</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for registering with John Store. To complete your registration, please use the verification code below:</p>
            
            <div class="otp-code">${otp}</div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code will expire in 10 minutes</li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
            
            <p>Best regards,<br>The John Store Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateOTPEmailText(otp, userName) {
    return `
Email Verification - John Store

Hello ${userName}!

Thank you for registering with John Store. To complete your registration, please use the verification code below:

VERIFICATION CODE: ${otp}

Important:
- This code will expire in 10 minutes
- Do not share this code with anyone
- If you didn't request this code, please ignore this email

Best regards,
The John Store Team

This is an automated email. Please do not reply.
    `;
  }

  async sendWelcomeEmail(userEmail, userName) {
    try {
      const mailOptions = {
        from: `"John Store" <${this.senderEmail}>`,
        to: userEmail,
        subject: 'Welcome to John Store!',
        html: this.generateWelcomeEmailHTML(userName),
        text: this.generateWelcomeEmailText(userName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  generateWelcomeEmailHTML(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to John Store</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .cta-button { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>John Store</h1>
            <p>Welcome Aboard!</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Welcome to John Store! Your email has been successfully verified and your account is now active.</p>
            
            <p>You can now:</p>
            <ul>
              <li>Browse our products</li>
              <li>Make purchases</li>
              <li>Track your orders</li>
              <li>Access your account dashboard</li>
            </ul>
            
            <a href="https://zealous-pond-0258f0803.1.azurestaticapps.net/" class="cta-button">Start Shopping Now</a>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <p>Best regards,<br>The John Store Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateWelcomeEmailText(userName) {
    return `
Welcome to John Store!

Hello ${userName}!

Welcome to John Store! Your email has been successfully verified and your account is now active.

You can now:
- Browse our products
- Make purchases
- Track your orders
- Access your account dashboard

Start shopping now: https://zealous-pond-0258f0803.1.azurestaticapps.net/

If you have any questions, feel free to contact our support team.

Best regards,
The John Store Team

This is an automated email. Please do not reply.
    `;
  }
}

export default new EmailService();
