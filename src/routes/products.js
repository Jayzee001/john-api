import express from 'express';
import ProductsController from '../controllers/productsController.js';

const router = express.Router();

// Public product routes (no authentication required)

// Get all published products with filtering and pagination
router.get('/', ProductsController.searchProductsValidation, ProductsController.getAllProducts);

// Search products
router.get('/search', ProductsController.searchProductsValidation, ProductsController.searchProducts);

// Get featured products
router.get('/featured', ProductsController.getFeaturedProducts);

// Get product categories
router.get('/categories', ProductsController.getCategories);

// Get product by ID (public view)
router.get('/:id', ProductsController.getProductById);

// Get products by category
router.get('/category/:category', ProductsController.getProductsByCategory);

// Get product recommendations
router.get('/:productId/recommendations', ProductsController.getProductRecommendations);

export default router; 