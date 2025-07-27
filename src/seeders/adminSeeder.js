import userService from '../services/userService.js';
import { User } from '../models/User.js';

export class AdminSeeder {
  // Default admin users to create
  static defaultAdmins = [
    {
      email: 'admin@ecommerce.com',
      password: 'admin123456',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+1234567890',
      role: 'admin',
      isActive: true,
      emailVerified: true
    },
    {
      email: 'manager@ecommerce.com',
      password: 'manager123456',
      firstName: 'Store',
      lastName: 'Manager',
      phone: '+1234567891',
      role: 'admin',
      isActive: true,
      emailVerified: true
    }
  ];

  // Seed admin users
  static async seedAdmins() {
    try {
      console.log('🌱 Seeding admin users...');

      for (const adminData of this.defaultAdmins) {
        try {
          // Check if admin already exists
          const existingAdmin = await userService.findByEmail(adminData.email);
          
          if (existingAdmin) {
            console.log(`✅ Admin ${adminData.email} already exists`);
            continue;
          }

          // Create admin user
          const admin = await userService.createUser(adminData);
          console.log(`✅ Created admin: ${admin.email} (${admin.role})`);

        } catch (error) {
          console.error(`❌ Failed to create admin ${adminData.email}:`, error.message);
        }
      }

      console.log('🎉 Admin seeding completed!');
      return true;
    } catch (error) {
      console.error('❌ Error seeding admins:', error);
      throw error;
    }
  }

  // Create a custom admin user
  static async createCustomAdmin(adminData) {
    try {
      // Validate admin data
      const admin = new User({
        ...adminData,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      const validationErrors = admin.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if admin already exists
      const existingAdmin = await userService.findByEmail(adminData.email);
      if (existingAdmin) {
        throw new Error('Admin with this email already exists');
      }

      // Create admin user
      const createdAdmin = await userService.createUser(adminData);
      console.log(`✅ Created custom admin: ${createdAdmin.email}`);

      return createdAdmin;
    } catch (error) {
      console.error('❌ Error creating custom admin:', error);
      throw error;
    }
  }

  // List all admin users
  static async listAdmins() {
    try {
      const allUsers = await userService.getAllUsers(1, 1000);
      const admins = allUsers.users.filter(user => user.role === 'admin');
      
      return admins.map(admin => admin.toPublicProfile());
    } catch (error) {
      console.error('❌ Error listing admins:', error);
      throw error;
    }
  }

  // Delete admin user
  static async deleteAdmin(adminId) {
    try {
      const admin = await userService.findById(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      if (admin.role !== 'admin') {
        throw new Error('User is not an admin');
      }

      await userService.deleteUser(adminId);
      console.log(`✅ Deleted admin: ${admin.email}`);

      return true;
    } catch (error) {
      console.error('❌ Error deleting admin:', error);
      throw error;
    }
  }
} 