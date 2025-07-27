// General Product Controller for Users
// This controller handles public product viewing without authentication

import productService from '../services/productService.js';
import { query, validationResult } from 'express-validator';

export class ProductsController {
  // Validation rules for product search and filtering
  static searchProductsValidation = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search term must be at least 2 characters long'),
    query('category')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Category filter must be at least 2 characters long'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be a positive number'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be a positive number'),
    query('sort')
      .optional()
      .isIn(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'oldest'])
      .withMessage('Sort must be one of: price_asc, price_desc, name_asc, name_desc, newest, oldest')
  ];

  // Get all published products (for customers)
  static async getAllProducts(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation Error',
            details: errors.array().map(err => err.msg)
          }
        });
      }

      const { 
        page = 1, 
        limit = 12, 
        search, 
        category, 
        minPrice, 
        maxPrice, 
        sort = 'newest' 
      } = req.query;

      let result;
      
      // Handle search
      if (search) {
        result = await productService.searchProducts(search, parseInt(page), parseInt(limit));
      } 
      // Handle category filter
      else if (category) {
        result = await productService.getProductsByCategory(category, parseInt(page), parseInt(limit));
      } 
      // Get all published products
      else {
        result = await productService.getPublishedProducts(parseInt(page), parseInt(limit));
      }

      // Apply price filters
      if (minPrice || maxPrice) {
        const min = minPrice ? parseFloat(minPrice) : 0;
        const max = maxPrice ? parseFloat(maxPrice) : Infinity;
        
        result.products = result.products.filter(product => 
          product.price >= min && product.price <= max
        );
      }

      // Apply sorting
      if (sort) {
        result.products.sort((a, b) => {
          switch (sort) {
            case 'price_asc':
              return a.price - b.price;
            case 'price_desc':
              return b.price - a.price;
            case 'name_asc':
              return a.name.localeCompare(b.name);
            case 'name_desc':
              return b.name.localeCompare(a.name);
            case 'newest':
              return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
              return new Date(a.createdAt) - new Date(b.createdAt);
            default:
              return 0;
          }
        });
      }

      res.json({
        success: true,
        data: {
          products: result.products.map(product => product.toPublicInfo()),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(result.total / parseInt(limit)),
            totalProducts: result.total,
            productsPerPage: parseInt(limit)
          },
          filters: {
            search: search || null,
            category: category || null,
            minPrice: minPrice || null,
            maxPrice: maxPrice || null,
            sort: sort
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get product by ID (public view)
  static async getProductById(req, res, next) {
    try {
      const product = await productService.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Product not found',
            details: 'The requested product does not exist'
          }
        });
      }

      // Check if product is published and active
      if (!product.isPublished()) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Product not available',
            details: 'This product is not currently available for viewing'
          }
        });
      }

      res.json({
        success: true,
        data: {
          product: product.toPublicInfo()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get featured products
  static async getFeaturedProducts(req, res, next) {
    try {
      const { limit = 8 } = req.query;
      
      const result = await productService.getFeaturedProducts(1, parseInt(limit));

      res.json({
        success: true,
        data: {
          products: result.products.map(product => product.toPublicInfo()),
          total: result.products.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get products by category
  static async getProductsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 12, sort = 'newest' } = req.query;

      const result = await productService.getProductsByCategory(category, parseInt(page), parseInt(limit));

      // Filter only published products
      const publishedProducts = result.products.filter(product => product.isPublished());

      // Apply sorting
      if (sort) {
        publishedProducts.sort((a, b) => {
          switch (sort) {
            case 'price_asc':
              return a.price - b.price;
            case 'price_desc':
              return b.price - a.price;
            case 'name_asc':
              return a.name.localeCompare(b.name);
            case 'name_desc':
              return b.name.localeCompare(a.name);
            case 'newest':
              return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
              return new Date(a.createdAt) - new Date(b.createdAt);
            default:
              return 0;
          }
        });
      }

      res.json({
        success: true,
        data: {
          products: publishedProducts.map(product => product.toPublicInfo()),
          category,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(publishedProducts.length / parseInt(limit)),
            totalProducts: publishedProducts.length,
            productsPerPage: parseInt(limit)
          },
          filters: {
            sort: sort
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Search products
  static async searchProducts(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation Error',
            details: errors.array().map(err => err.msg)
          }
        });
      }

      const { q: searchTerm, page = 1, limit = 12, sort = 'newest' } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Search term required',
            details: 'Please provide a search term'
          }
        });
      }

      const result = await productService.searchProducts(searchTerm, parseInt(page), parseInt(limit));

      // Filter only published products
      const publishedProducts = result.products.filter(product => product.isPublished());

      // Apply sorting
      if (sort) {
        publishedProducts.sort((a, b) => {
          switch (sort) {
            case 'price_asc':
              return a.price - b.price;
            case 'price_desc':
              return b.price - a.price;
            case 'name_asc':
              return a.name.localeCompare(b.name);
            case 'name_desc':
              return b.name.localeCompare(a.name);
            case 'newest':
              return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
              return new Date(a.createdAt) - new Date(b.createdAt);
            default:
              return 0;
          }
        });
      }

      res.json({
        success: true,
        data: {
          products: publishedProducts.map(product => product.toPublicInfo()),
          searchTerm,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(publishedProducts.length / parseInt(limit)),
            totalProducts: publishedProducts.length,
            productsPerPage: parseInt(limit)
          },
          filters: {
            sort: sort
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get product categories
  static async getCategories(req, res, next) {
    try {
      const allProducts = await productService.getPublishedProducts(1, 1000);
      const categories = [...new Set(allProducts.products.map(product => product.category))];
      
      res.json({
        success: true,
        data: {
          categories: categories.sort()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get product recommendations (based on category)
  static async getProductRecommendations(req, res, next) {
    try {
      const { productId } = req.params;
      const { limit = 4 } = req.query;

      const product = await productService.findById(productId);
      if (!product || !product.isPublished()) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Product not found',
            details: 'The requested product does not exist'
          }
        });
      }

      // Get products from the same category
      const result = await productService.getProductsByCategory(product.category, 1, parseInt(limit) * 2);
      
      // Filter out the current product and only published products
      const recommendations = result.products
        .filter(p => p.id !== productId && p.isPublished())
        .slice(0, parseInt(limit));

      res.json({
        success: true,
        data: {
          recommendations: recommendations.map(product => product.toPublicInfo()),
          total: recommendations.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ProductsController; 