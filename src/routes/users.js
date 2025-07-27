import express from 'express';
import { UserController } from '../controllers/users/userController.js';
import { ProfileController } from '../controllers/users/profileController.js';
import { ShoppingController } from '../controllers/users/shoppingController.js';
import { authenticateToken } from '../middleware/auth.js';
import bodyParser from 'body-parser';

const router = express.Router();

// Stripe Webhook (must use raw body parser for Stripe signature verification)
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), ShoppingController.handleStripeWebhook);

// Apply authentication to all routes except webhook
router.use(authenticateToken);

// Add JSON parsing for routes that need it
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Customer profile routes
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfileValidation, UserController.updateProfile);
router.delete('/profile', UserController.deleteProfile);

// Address management routes (single address)
router.get('/address', ProfileController.getUserAddress);
router.post('/address', ProfileController.addressValidation, ProfileController.createAddress);
router.put('/address', ProfileController.addressValidation, ProfileController.updateAddress);

// Stripe Checkout Session (user payment)
router.post('/checkout', ShoppingController.createCheckoutSession);

// Get all orders for the authenticated user
router.get('/orders', ShoppingController.getOrders);
// Get a single order for the authenticated user
router.get('/orders/:id', ShoppingController.getOrderById);

export default router; 