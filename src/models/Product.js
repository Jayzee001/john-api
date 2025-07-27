import { v4 as uuidv4 } from 'uuid';

export class Product {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.sku = data.sku || this.generateSKU();
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.quantity = data.quantity || 0;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.published = data.published !== undefined ? data.published : false;
    this.featured = data.featured !== undefined ? data.featured : false;
    this.category = data.category;
    this.images = data.images || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Generate a unique ID for Cosmos DB
  generateId() {
    return `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique SKU
  generateSKU() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `SKU-${timestamp}-${random}`;
  }

  // Validate product data
  validate() {
    const errors = [];

    if (!this.name) {
      errors.push('Product name is required');
    } else if (this.name.length < 2) {
      errors.push('Product name must be at least 2 characters long');
    }

    if (!this.description) {
      errors.push('Product description is required');
    } else if (this.description.length < 10) {
      errors.push('Product description must be at least 10 characters long');
    }

    if (!this.price) {
      errors.push('Product price is required');
    } else if (typeof this.price !== 'number' || this.price <= 0) {
      errors.push('Product price must be a positive number');
    }

    if (typeof this.quantity !== 'number' || this.quantity < 0) {
      errors.push('Product quantity must be a non-negative number');
    }

    if (!this.category) {
      errors.push('Product category is required');
    }

    if (typeof this.published !== 'boolean') {
      errors.push('Published must be a boolean value');
    }

    if (typeof this.featured !== 'boolean') {
      errors.push('Featured must be a boolean value');
    }

    return errors;
  }

  // Convert to Cosmos DB document
  toDocument() {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      price: this.price,
      quantity: this.quantity,
      isActive: this.isActive,
      published: this.published,
      featured: this.featured,
      category: this.category,
      images: this.images,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Cosmos DB document
  static fromDocument(doc) {
    return new Product({
      id: doc.id,
      sku: doc.sku,
      name: doc.name,
      description: doc.description,
      price: doc.price,
      quantity: doc.quantity,
      isActive: doc.isActive,
      published: doc.published,
      featured: doc.featured,
      category: doc.category,
      images: doc.images,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }

  // Get public product info (for customers)
  toPublicInfo() {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      price: this.price,
      quantity: this.quantity,
      isActive: this.isActive,
      published: this.published,
      featured: this.featured,
      category: this.category,
      images: this.images,
      createdAt: this.createdAt
    };
  }

  // Get admin product info (with all details)
  toAdminInfo() {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      price: this.price,
      quantity: this.quantity,
      isActive: this.isActive,
      published: this.published,
      featured: this.featured,
      category: this.category,
      images: this.images,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Check if product is in stock
  isInStock() {
    return this.quantity > 0;
  }

  // Check if product is published and available for customers
  isPublished() {
    return this.published && this.isActive;
  }

  // Check if product is featured
  isFeatured() {
    return this.featured && this.isPublished();
  }

  // Update stock quantity
  updateStock(newQuantity) {
    if (typeof newQuantity !== 'number' || newQuantity < 0) {
      throw new Error('Quantity must be a non-negative number');
    }
    this.quantity = newQuantity;
    this.updatedAt = new Date().toISOString();
  }

  // Add image to product
  addImage(imageUrl) {
    if (!this.images.includes(imageUrl)) {
      this.images.push(imageUrl);
      this.updatedAt = new Date().toISOString();
    }
  }

  // Remove image from product
  removeImage(imageUrl) {
    const index = this.images.indexOf(imageUrl);
    if (index > -1) {
      this.images.splice(index, 1);
      this.updatedAt = new Date().toISOString();
    }
  }
} 