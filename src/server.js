import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import multer from 'multer';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import productRoutes from './routes/products.js';
import emailVerificationRoutes from './routes/emailVerification.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

// Import Azure services
import { initializeCosmosDB } from './config/cosmos.js';
import { initializeStorage } from './config/storage.js';
import { AdminSeeder } from './seeders/adminSeeder.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware (before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  }
});

// Make multer available to routes
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/email-verification', emailVerificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Ecommerce API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize Azure services and start server
async function startServer() {
  try {
    console.log('🚀 Initializing Azure Services...\n');

    // Initialize Cosmos DB
    try {
      await initializeCosmosDB();
      console.log('');
    } catch (error) {
      console.log('⚠️  Cosmos DB connection failed, continuing without database...');
      console.log('   You can still test email functionality');
      console.log('');
    }

    // Initialize Azure Storage
    try {
      await initializeStorage();
      console.log('');
    } catch (error) {
      console.log('⚠️  Azure Storage connection failed, continuing without storage...');
      console.log('   You can still test email functionality');
      console.log('');
    }

    // Seed admin users (only in development)
    if (process.env.NODE_ENV === 'development') {
      try {
        await AdminSeeder.seedAdmins();
        console.log('');
      } catch (error) {
        console.log('⚠️  Admin seeding failed, continuing without admin users...');
        console.log('');
      }
    }

    // Start server
    app.listen(PORT, () => {
      console.log('🎉 Ecommerce API Server Started!');
      console.log('='.repeat(50));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log('='.repeat(50));
      console.log('📋 Available Endpoints:');
      console.log('   POST /api/auth/register - User registration');
      console.log('   POST /api/auth/login - User login');
      console.log('   GET  /api/users/profile - Get user profile');
      console.log('   GET  /api/users/address - Get user address');
      console.log('   POST /api/users/address - Create user address');
      console.log('   PUT  /api/users/address - Update user address');
      console.log('   GET  /api/products - Public: List products');
      console.log('   GET  /api/products/:id - Public: Get product details');
      console.log('   GET  /api/admin/products - Admin: List products');
      console.log('   POST /api/admin/products - Admin: Create product');
      console.log('='.repeat(50));
      console.log('🔑 Default Admin Credentials:');
      console.log('   Email: admin@ecommerce.com');
      console.log('   Password: admin123456');
      console.log('   Email: manager@ecommerce.com');
      console.log('   Password: manager123456');
      console.log('='.repeat(50));
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app; 