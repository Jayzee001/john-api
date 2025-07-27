import { uploadFile, deleteFile, getFileUrl } from '../config/storage.js';
import multer from 'multer';
import path from 'path';

export class ImageService {
  constructor() {
    this.allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
  }

  // Configure multer for file uploads
  static getMulterConfig() {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 5 // Max 5 files
      },
      fileFilter: (req, file, cb) => {
        // Check file type
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          return cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
        }
        cb(null, true);
      }
    });
  }

  // Generate unique filename
  generateFileName(originalName, productId) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(originalName);
    return `products/${productId}/${timestamp}_${randomString}${extension}`;
  }

  // Upload single image
  async uploadProductImage(file, productId) {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      if (!this.allowedImageTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
      }

      if (file.size > this.maxFileSize) {
        throw new Error('File size too large. Maximum size is 5MB');
      }

      // Generate unique filename
      const fileName = this.generateFileName(file.originalname, productId);

      // Upload to Azure Blob Storage
      const uploadResult = await uploadFile(fileName, file.buffer, file.mimetype);

      return {
        url: uploadResult.url,
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        contentType: file.mimetype
      };
    } catch (error) {
      console.error('Error uploading product image:', error);
      throw error;
    }
  }

  // Upload multiple images
  async uploadProductImages(files, productId) {
    try {
      if (!Array.isArray(files) || files.length === 0) {
        throw new Error('No files provided');
      }

      if (files.length > 5) {
        throw new Error('Maximum 5 images allowed per product');
      }

      const uploadPromises = files.map(file => this.uploadProductImage(file, productId));
      const uploadResults = await Promise.all(uploadPromises);

      return uploadResults;
    } catch (error) {
      console.error('Error uploading product images:', error);
      throw error;
    }
  }

  // Delete image from blob storage
  async deleteProductImage(fileName) {
    try {
      await deleteFile(fileName);
      return true;
    } catch (error) {
      console.error('Error deleting product image:', error);
      throw error;
    }
  }

  // Extract filename from URL
  extractFileNameFromUrl(url) {
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const productId = urlParts[urlParts.length - 2];
      return `products/${productId}/${fileName}`;
    } catch (error) {
      console.error('Error extracting filename from URL:', error);
      throw new Error('Invalid image URL format');
    }
  }

  // Validate image URL
  validateImageUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && urlObj.hostname.includes('blob.core.windows.net');
    } catch (error) {
      return false;
    }
  }

  // Get image info from URL
  getImageInfo(url) {
    try {
      if (!this.validateImageUrl(url)) {
        throw new Error('Invalid image URL');
      }

      const fileName = this.extractFileNameFromUrl(url);
      return {
        url: url,
        fileName: fileName
      };
    } catch (error) {
      console.error('Error getting image info:', error);
      throw error;
    }
  }
}

export default new ImageService(); 