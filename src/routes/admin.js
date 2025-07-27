import express from 'express';
import { AdminController } from '../controllers/admin/adminController.js';
import { AdminUserController } from '../controllers/admin/userController.js';
import { ProductController } from '../controllers/admin/productController.js';
import { OrderController } from '../controllers/admin/orderController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticateToken);
router.use(authorizeRole('admin'));

// Add JSON parsing for routes that need it
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Admin dashboard
router.get('/dashboard', AdminController.getDashboardStats);

// User management routes with enhanced functionality
router.get('/users/analytics', AdminUserController.getUserAnalytics);
router.get('/users/search', AdminUserController.searchUsersValidation, AdminUserController.searchUsers);
router.get('/users/ids', AdminUserController.getAllUserIds); // Get all user IDs for testing
router.get('/users', AdminController.listUsersValidation, AdminController.listUsers);
router.get('/users/:id', AdminUserController.getUserById);
router.put('/users/:id', upload.none(), AdminUserController.updateUserValidation, AdminUserController.updateUser);
router.delete('/users/:id', AdminUserController.deleteUser);

// Product management routes
router.get('/products/analytics', ProductController.getProductAnalytics);
router.get('/products/ids', ProductController.getAllProductIds);
router.get('/products', ProductController.searchProductsValidation, ProductController.getAllProducts);
router.post('/products', upload.array('files', 5), ProductController.createProductValidation, ProductController.createProduct);
router.get('/products/:id', ProductController.getProductById);
router.put('/products/:id', upload.array('files', 5), ProductController.updateProductValidation, ProductController.updateProduct);
router.delete('/products/:id', ProductController.deleteProduct);
router.patch('/products/:id/stock', upload.none(), ProductController.updateProductStock);
router.post('/products/:id/images', upload.none(), ProductController.addProductImage);
router.delete('/products/:id/images', upload.none(), ProductController.removeProductImage);
router.get('/products/published', ProductController.getPublishedProducts);
router.get('/products/featured', ProductController.getFeaturedProducts);

// Admin management routes
router.get('/admins', AdminController.listAdmins);
router.post('/admins', AdminController.createAdminValidation, AdminController.createAdmin);
router.delete('/admins/:id', AdminController.deleteAdmin);

// Admin order management routes
router.get('/orders', OrderController.getAllOrders);
router.get('/orders/:id', OrderController.getOrderById);
router.patch('/orders/:id/status', OrderController.updateOrderStatus);

export default router; 