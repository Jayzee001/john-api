import { CosmosClient } from '@azure/cosmos';

class OTPService {
  constructor() {
    this.cosmosClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
    });
    
    this.database = this.cosmosClient.database(process.env.COSMOS_DATABASE_NAME);
    this.container = this.database.container('otp_codes');
  }

  // Generate a 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database with expiration
  async storeOTP(email, otp) {
    try {
      const otpData = {
        id: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: email.toLowerCase(),
        otp: otp,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      };

      await this.container.items.create(otpData);
      return otpData;
    } catch (error) {
      console.error('Error storing OTP:', error);
      throw new Error('Failed to store OTP');
    }
  }

  // Verify OTP
  async verifyOTP(email, otp) {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.email = @email 
        AND c.otp = @otp 
        AND c.expiresAt > @now
        ORDER BY c.createdAt DESC
      `;

      const parameters = [
        { name: '@email', value: email.toLowerCase() },
        { name: '@otp', value: otp },
        { name: '@now', value: new Date().toISOString() }
      ];

      const { resources } = await this.container.items
        .query({ query, parameters })
        .fetchAll();

      if (resources.length === 0) {
        return { valid: false, message: 'Invalid or expired OTP' };
      }

      const otpRecord = resources[0];
      
      // Delete OTP after successful verification
      try {
        await this.container.item(otpRecord.id, otpRecord.id).delete();
      } catch (error) {
        console.error('Error deleting OTP after verification:', error);
        // Don't fail verification if cleanup fails
      }
      
      return { valid: true, message: 'OTP verified successfully' };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Failed to verify OTP');
    }
  }



  // Clean up expired OTPs
  async cleanupExpiredOTPs() {
    try {
      const query = `
        SELECT c.id FROM c 
        WHERE c.expiresAt < @now
      `;

      const parameters = [
        { name: '@now', value: new Date().toISOString() }
      ];

      const { resources } = await this.container.items
        .query({ query, parameters })
        .fetchAll();

      let deletedCount = 0;
      for (const record of resources) {
        try {
          await this.container.item(record.id, record.id).delete();
          deletedCount++;
        } catch (error) {
          // Ignore "not found" errors - item was already deleted
          if (error.code !== 404) {
            console.error(`Error deleting expired OTP ${record.id}:`, error.message);
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired OTPs`);
      }
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  // Resend OTP (invalidate old ones and create new)
  async resendOTP(email) {
    try {
      // Invalidate all existing OTPs for this email
      const query = `
        SELECT c.id FROM c 
        WHERE c.email = @email
      `;

      const parameters = [
        { name: '@email', value: email.toLowerCase() }
      ];

      const { resources } = await this.container.items
        .query({ query, parameters })
        .fetchAll();

      for (const record of resources) {
        try {
          await this.container.item(record.id, record.id).delete();
        } catch (error) {
          // Ignore "not found" errors - item was already deleted
          if (error.code !== 404) {
            console.error(`Error deleting old OTP ${record.id}:`, error.message);
          }
        }
      }

      // Generate and store new OTP
      const newOTP = this.generateOTP();
      const otpData = await this.storeOTP(email, newOTP);
      
      return { success: true, otp: newOTP, otpData };
    } catch (error) {
      console.error('Error resending OTP:', error);
      throw new Error('Failed to resend OTP');
    }
  }
}

export default new OTPService();
