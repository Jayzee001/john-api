import dotenv from 'dotenv';
import { initializeCosmosDB } from './config/cosmos.js';
import { initializeStorage } from './config/storage.js';
import { AdminSeeder } from './seeders/adminSeeder.js';

// Load environment variables
dotenv.config();

async function initializeServices() {
  try {
    console.log('🚀 Initializing Azure Services...\n');

    // Initialize Cosmos DB
    await initializeCosmosDB();
    console.log('');

    // Initialize Azure Storage
    await initializeStorage();
    console.log('');

    // Seed admin users
    await AdminSeeder.seedAdmins();
    console.log('');

    console.log('✅ All Azure services initialized successfully!');
    console.log('🎉 Your ecommerce API is ready to use!');
    console.log('');
    console.log('🔑 Default Admin Credentials:');
    console.log('   Email: admin@ecommerce.com');
    console.log('   Password: admin123456');
    console.log('');
    console.log('   Email: manager@ecommerce.com');
    console.log('   Password: manager123456');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Run initialization
initializeServices(); 