// Product Management Controller for Admin
// This controller will handle:
// - Create, Read, Update, Delete products
// - Product image upload to Azure Blob Storage
// - Product categories and inventory management
// - Product pricing and discounts

import productService from '../../services/productService.js';
import imageService from '../../services/imageService.js';
import { body, validationResult, query } from 'express-validator';

export class ProductController {
  // Validation rules for product operations
  static createProductValidation = [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Product name must be between 2 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Product description must be between 10 and 1000 characters'),
    body('price')
      .isFloat({ min: 0.01 })
      .withMessage('Product price must be a positive number'),
    body('quantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Product quantity must be a non-negative integer'),
    body('category')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Product category must be between 2 and 50 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean value'),
    body('published')
      .optional()
      .isBoolean()
      .withMessage('Published must be a boolean value'),
    body('featured')
      .optional()
      .isBoolean()
      .withMessage('Featured must be a boolean value'),
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array')
      
  ];

  static updateProductValidation = [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Product name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Product description must be between 10 and 1000 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Product price must be a positive number'),
    body('quantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Product quantity must be a non-negative integer'),
    body('category')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Product category must be between 2 and 50 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean value'),
    body('published')
      .optional()
      .isBoolean()
      .withMessage('Published must be a boolean value'),
    body('featured')
      .optional()
      .isBoolean()
      .withMessage('Featured must be a boolean value'),
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array')
  ];

  static searchProductsValidation = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
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
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'all'])
      .withMessage('Status filter must be active, inactive, or all'),
    query('stock')
      .optional()
      .isIn(['in_stock', 'out_of_stock', 'all'])
      .withMessage('Stock filter must be in_stock, out_of_stock, or all')
  ];

  // Create new product
  static async createProduct(req, res, next) {
    try {
      // Convert form-data fields to correct types
      if (req.body.price) req.body.price = parseFloat(req.body.price);
      if (req.body.quantity) req.body.quantity = parseInt(req.body.quantity, 10);
      ['isActive', 'published', 'featured'].forEach(field => {
        if (req.body[field] !== undefined) {
          req.body[field] = req.body[field] === 'true' || req.body[field] === true;
        }
      });

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

      // Handle file uploads
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        const uploadResults = await imageService.uploadProductImages(req.files, req.body.name || 'new');
        imageUrls = uploadResults.map(result => result.url);
      }

      const productData = {
        ...req.body,
        images: imageUrls,
        published: req.body.published !== undefined ? req.body.published : false,
        featured: req.body.featured !== undefined ? req.body.featured : false
      };

      const product = await productService.createProduct(productData);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: {
          product: product.toAdminInfo()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all products with pagination and filters
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

      const { page = 1, limit = 10, search, category, status, stock } = req.query;

      let result;
      if (search) {
        result = await productService.searchProducts(search, parseInt(page), parseInt(limit));
      } else if (category) {
        result = await productService.getProductsByCategory(category, parseInt(page), parseInt(limit));
      } else if (status === 'active') {
        result = await productService.getActiveProducts(parseInt(page), parseInt(limit));
      } else {
        result = await productService.getAllProducts(parseInt(page), parseInt(limit));
      }

      // Apply stock filter if specified
      if (stock && stock !== 'all') {
        const isInStock = stock === 'in_stock';
        result.products = result.products.filter(product => 
          isInStock ? product.isInStock() : !product.isInStock()
        );
      }

      res.json({
        success: true,
        data: {
          products: result.products.map(product => product.toAdminInfo()),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(result.total / parseInt(limit)),
            totalProducts: result.total,
            productsPerPage: parseInt(limit)
          },
          filters: {
            search: search || null,
            category: category || null,
            status: status || 'all',
            stock: stock || 'all'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get product by ID
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

      res.json({
        success: true,
        data: {
          product: product.toAdminInfo()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update product
  static async updateProduct(req, res, next) {
    try {
      // Convert form-data fields to correct types
      if (req.body.price) req.body.price = parseFloat(req.body.price);
      if (req.body.quantity) req.body.quantity = parseInt(req.body.quantity, 10);
      ['isActive', 'published', 'featured'].forEach(field => {
        if (req.body[field] !== undefined) {
          req.body[field] = req.body[field] === 'true' || req.body[field] === true;
        }
      });
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

      // First check if product exists
      const existingProduct = await productService.findById(req.params.id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Product not found',
            details: 'The product you are trying to update does not exist'
          }
        });
      }

      // Handle new file uploads (append to images array)
      let newImageUrls = [];
      if (req.files && req.files.length > 0) {
        const uploadResults = await imageService.uploadProductImages(req.files, existingProduct.id);
        newImageUrls = uploadResults.map(result => result.url);
      }

      const { name, description, price, quantity, category, isActive, published, featured, images } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price;
      if (quantity !== undefined) updateData.quantity = quantity;
      if (category !== undefined) updateData.category = category;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (published !== undefined) updateData.published = published;
      if (featured !== undefined) updateData.featured = featured;
      // Merge existing images, new uploads, and any provided images
      let mergedImages = Array.isArray(images) ? images : existingProduct.images;
      if (newImageUrls.length > 0) {
        mergedImages = [...mergedImages, ...newImageUrls];
      }
      updateData.images = mergedImages;

      // Update product
      const updatedProduct = await productService.updateProduct(req.params.id, updateData);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: {
          product: updatedProduct.toAdminInfo()
        }
      });
    } catch (error) {
      // Handle specific Cosmos DB errors
      if (error.message && error.message.includes('Entity with the specified id does not exist')) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Product not found',
            details: 'The product you are trying to update does not exist in the database'
          }
        });
      }
      next(error);
    }
  }

  // Delete product
  static async deleteProduct(req, res, next) {
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

      await productService.deleteProduct(req.params.id);

      res.json({
        success: true,
        message: 'Product deleted successfully',
        data: {
          deletedProduct: {
            id: product.id,
            sku: product.sku,
            name: product.name
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update product stock
  static async updateProductStock(req, res, next) {
    try {
      const { quantity } = req.body;

      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid quantity',
            details: 'Quantity must be a non-negative number'
          }
        });
      }

      const updatedProduct = await productService.updateProductStock(req.params.id, quantity);

      res.json({
        success: true,
        message: 'Product stock updated successfully',
        data: {
          product: updatedProduct.toAdminInfo()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Add image to product
  static async addProductImage(req, res, next) {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Image URL required',
            details: 'Please provide a valid image URL'
          }
        });
      }

      const updatedProduct = await productService.addProductImage(req.params.id, imageUrl);

      res.json({
        success: true,
        message: 'Image added to product successfully',
        data: {
          product: updatedProduct.toAdminInfo()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove image from product
  static async removeProductImage(req, res, next) {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Image URL required',
            details: 'Please provide a valid image URL to remove'
          }
        });
      }

      const updatedProduct = await productService.removeProductImage(req.params.id, imageUrl);

      res.json({
        success: true,
        message: 'Image removed from product successfully',
        data: {
          product: updatedProduct.toAdminInfo()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get product analytics
  static async getProductAnalytics(req, res, next) {
    try {
      const analytics = await productService.getProductAnalytics();

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all product IDs for testing/debugging
  static async getAllProductIds(req, res, next) {
    try {
      const allProducts = await productService.getAllProducts(1, 10000);
      const productIds = allProducts.products.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        isActive: product.isActive,
        quantity: product.quantity
      }));

      res.json({
        success: true,
        data: {
          totalProducts: productIds.length,
          products: productIds
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload images to product
  static async uploadProductImages(req, res, next) {
    try {
      const productId = req.params.id;
      
      // Check if product exists
      const product = await productService.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Product not found',
            details: 'The product you are trying to upload images to does not exist'
          }
        });
      }

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No files uploaded',
            details: 'Please select at least one image to upload'
          }
        });
      }

      // Upload images to Azure Blob Storage
      const uploadResults = await imageService.uploadProductImages(req.files, productId);
      
      // Get image URLs
      const imageUrls = uploadResults.map(result => result.url);

      // Add images to product
      const updatedProduct = await productService.addProductImages(productId, imageUrls);

      res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
          product: updatedProduct.toAdminInfo(),
          uploadedImages: uploadResults.map(result => ({
            url: result.url,
            fileName: result.fileName,
            originalName: result.originalName,
            size: result.size
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete image from product
  static async deleteProductImage(req, res, next) {
    try {
      const productId = req.params.id;
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Image URL required',
            details: 'Please provide the image URL to delete'
          }
        });
      }

      // Check if product exists
      const product = await productService.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Product not found',
            details: 'The product does not exist'
          }
        });
      }

      // Check if image exists in product
      if (!product.images.includes(imageUrl)) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image not found',
            details: 'The image does not exist in this product'
          }
        });
      }

      // Extract filename from URL and delete from blob storage
      const imageInfo = imageService.getImageInfo(imageUrl);
      await imageService.deleteProductImage(imageInfo.fileName);

      // Remove image from product
      const updatedProduct = await productService.removeProductImage(productId, imageUrl);

      res.json({
        success: true,
        message: 'Image deleted successfully',
        data: {
          product: updatedProduct.toAdminInfo(),
          deletedImage: {
            url: imageUrl,
            fileName: imageInfo.fileName
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get published products
  static async getPublishedProducts(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await productService.getPublishedProducts(parseInt(page), parseInt(limit));
      res.json({
        success: true,
        data: {
          products: result.products.map(product => product.toAdminInfo()),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(result.total / parseInt(limit)),
            totalProducts: result.total,
            productsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get featured products
  static async getFeaturedProducts(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await productService.getFeaturedProducts(parseInt(page), parseInt(limit));
      res.json({
        success: true,
        data: {
          products: result.products.map(product => product.toAdminInfo()),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(result.total / parseInt(limit)),
            totalProducts: result.total,
            productsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 