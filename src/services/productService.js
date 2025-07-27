import { containers } from '../config/cosmos.js';
import { Product } from '../models/Product.js';

export class ProductService {
  constructor() {
    this.container = containers.products;
  }

  // Find product by name
  async findByName(name) {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.name = @name',
        parameters: [{ name: '@name', value: name }]
      };
      const { resources } = await this.container.items.query(querySpec).fetchAll();
      return resources.length > 0 ? Product.fromDocument(resources[0]) : null;
    } catch (error) {
      console.error('Error finding product by name:', error);
      throw error;
    }
  }

  // Create a new product
  async createProduct(productData) {
    try {
      const product = new Product(productData);
      
      // Validate product data
      const validationErrors = product.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if product with same name already exists
      const existingByName = await this.findByName(product.name);
      if (existingByName) {
        throw new Error('Product with this name already exists');
      }

      // Check if product with same SKU already exists
      const existingProduct = await this.findBySKU(product.sku);
      if (existingProduct) {
        throw new Error('Product with this SKU already exists');
      }

      // Create document in Cosmos DB
      const document = product.toDocument();
      const { resource } = await this.container.items.create(document);

      return Product.fromDocument(resource);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  // Find product by SKU
  async findBySKU(sku) {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.sku = @sku',
        parameters: [{ name: '@sku', value: sku }]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      return resources.length > 0 ? Product.fromDocument(resources[0]) : null;
    } catch (error) {
      console.error('Error finding product by SKU:', error);
      throw error;
    }
  }

  // Find product by ID
  async findById(id) {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      };
      const { resources } = await this.container.items.query(querySpec).fetchAll();
      if (resources.length > 0) {
        const rawDoc = resources[0];
        const product = Product.fromDocument(rawDoc);
        return product;
      }
      return null;
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      console.error('Error finding product by ID:', error);
      throw error;
    }
  }

  // Update product
  async updateProduct(id, updateData) {
    try {
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      // Update product properties
      Object.assign(product, updateData);
      product.updatedAt = new Date().toISOString();

      // Try different partition key strategies
      const document = product.toDocument();
      
            // Strategy 1: Try with product ID as partition key
      try {
        const { resource } = await this.container.item(id, id).replace(document);
        return Product.fromDocument(resource);
      } catch (error1) {
        // Strategy 2: Try with category as partition key
        try {
          const { resource } = await this.container.item(id, product.category).replace(document);
          return Product.fromDocument(resource);
        } catch (error2) {
          // Strategy 3: Try with categoryId (if it exists)
          if (product.categoryId) {
            try {
              const { resource } = await this.container.item(id, product.categoryId).replace(document);
              return Product.fromDocument(resource);
            } catch (error3) {
              // Continue to next strategy
            }
          }
          
          // Strategy 4: Try without partition key (for single partition containers)
          try {
            const { resource } = await this.container.item(id).replace(document);
            return Product.fromDocument(resource);
          } catch (error4) {
            // If all strategies fail, throw the original error
            throw new Error(`Product update failed. Tried multiple partition keys but none worked. Product ID: ${id}, Category: ${product.category}`);
          }
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Delete product
  async deleteProduct(id) {
    try {
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      try {
        await this.container.item(id, id).delete();
      } catch (deleteError) {
        // If that fails, try using category as partition key (for existing products)
        if (deleteError.code === 404 || deleteError.message.includes('Entity with the specified id does not exist')) {
          try {
            await this.container.item(id, product.category).delete();
          } catch (categoryError) {
            // If that also fails, try without partition key (single partition)
            await this.container.item(id).delete();
          }
        } else {
          throw deleteError;
        }
      }
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Get all products (with pagination)
  async getAllProducts(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      
      return {
        products: resources.map(doc => Product.fromDocument(doc)),
        page,
        limit,
        total: resources.length
      };
    } catch (error) {
      console.error('Error getting all products:', error);
      throw error;
    }
  }

  // Search products
  async searchProducts(searchTerm, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE CONTAINS(c.name, @searchTerm, true) 
             OR CONTAINS(c.description, @searchTerm, true)
             OR CONTAINS(c.sku, @searchTerm, true)
          ORDER BY c.createdAt DESC 
          OFFSET @offset LIMIT @limit
        `,
        parameters: [
          { name: '@searchTerm', value: searchTerm },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      
      return {
        products: resources.map(doc => Product.fromDocument(doc)),
        page,
        limit,
        total: resources.length,
        searchTerm
      };
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Get products by category
  async getProductsByCategory(category, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.category = @category ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@category', value: category },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      
      return {
        products: resources.map(doc => Product.fromDocument(doc)),
        page,
        limit,
        total: resources.length,
        category
      };
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw error;
    }
  }

  // Get active products only
  async getActiveProducts(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.isActive = true ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      
      return {
        products: resources.map(doc => Product.fromDocument(doc)),
        page,
        limit,
        total: resources.length
      };
    } catch (error) {
      console.error('Error getting active products:', error);
      throw error;
    }
  }

  // Get published products (for customers)
  async getPublishedProducts(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.isActive = true AND c.published = true ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      
      return {
        products: resources.map(doc => Product.fromDocument(doc)),
        page,
        limit,
        total: resources.length
      };
    } catch (error) {
      console.error('Error getting published products:', error);
      throw error;
    }
  }

  // Get featured products
  async getFeaturedProducts(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.isActive = true AND c.published = true AND c.featured = true ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      
      return {
        products: resources.map(doc => Product.fromDocument(doc)),
        page,
        limit,
        total: resources.length
      };
    } catch (error) {
      console.error('Error getting featured products:', error);
      throw error;
    }
  }

  // Update product stock
  async updateProductStock(id, newQuantity) {
    try {
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      product.updateStock(newQuantity);
      
      // Update document in Cosmos DB
      const document = product.toDocument();
      try {
        const { resource } = await this.container.item(id, id).replace(document);
        return Product.fromDocument(resource);
      } catch (updateError) {
        // If that fails, try using category as partition key (for existing products)
        if (updateError.code === 404 || updateError.message.includes('Entity with the specified id does not exist')) {
          try {
            const { resource } = await this.container.item(id, product.category).replace(document);
            return Product.fromDocument(resource);
          } catch (categoryError) {
            // If that also fails, try without partition key (single partition)
            const { resource } = await this.container.item(id).replace(document);
            return Product.fromDocument(resource);
          }
        }
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating product stock:', error);
      throw error;
    }
  }

  // Add image to product
  async addProductImage(id, imageUrl) {
    try {
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      product.addImage(imageUrl);
      
      // Update document in Cosmos DB
      const document = product.toDocument();
      try {
        const { resource } = await this.container.item(id, id).replace(document);
        return Product.fromDocument(resource);
      } catch (updateError) {
        // If that fails, try using category as partition key (for existing products)
        if (updateError.code === 404 || updateError.message.includes('Entity with the specified id does not exist')) {
          try {
            const { resource } = await this.container.item(id, product.category).replace(document);
            return Product.fromDocument(resource);
          } catch (categoryError) {
            // If that also fails, try without partition key (single partition)
            const { resource } = await this.container.item(id).replace(document);
            return Product.fromDocument(resource);
          }
        }
        throw updateError;
      }
    } catch (error) {
      console.error('Error adding product image:', error);
      throw error;
    }
  }

  // Remove image from product
  async removeProductImage(id, imageUrl) {
    try {
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      product.removeImage(imageUrl);
      
      // Update document in Cosmos DB
      const document = product.toDocument();
      try {
        const { resource } = await this.container.item(id, id).replace(document);
        return Product.fromDocument(resource);
      } catch (updateError) {
        // If that fails, try using category as partition key (for existing products)
        if (updateError.code === 404 || updateError.message.includes('Entity with the specified id does not exist')) {
          try {
            const { resource } = await this.container.item(id, product.category).replace(document);
            return Product.fromDocument(resource);
          } catch (categoryError) {
            // If that also fails, try without partition key (single partition)
            const { resource } = await this.container.item(id).replace(document);
            return Product.fromDocument(resource);
          }
        }
        throw updateError;
      }
    } catch (error) {
      console.error('Error removing product image:', error);
      throw error;
    }
  }

  // Get product analytics
  async getProductAnalytics() {
    try {
      const allProducts = await this.getAllProducts(1, 10000);
      const products = allProducts.products;

      const totalProducts = products.length;
      const activeProducts = products.filter(product => product.isActive).length;
      const inactiveProducts = totalProducts - activeProducts;
      const inStockProducts = products.filter(product => product.isInStock()).length;
      const outOfStockProducts = totalProducts - inStockProducts;

      // Category breakdown
      const categoryStats = {};
      products.forEach(product => {
        if (!categoryStats[product.category]) {
          categoryStats[product.category] = 0;
        }
        categoryStats[product.category]++;
      });

      // Price range analysis
      const prices = products.map(p => p.price).filter(p => p > 0);
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        totalProducts,
        activeProducts,
        inactiveProducts,
        inStockProducts,
        outOfStockProducts,
        categoryStats,
        priceAnalysis: {
          averagePrice: avgPrice,
          minPrice,
          maxPrice
        }
      };
    } catch (error) {
      console.error('Error getting product analytics:', error);
      throw error;
    }
  }
}

export default new ProductService(); 