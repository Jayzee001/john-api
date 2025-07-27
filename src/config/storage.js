import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

// Azure Storage Configuration
const storageConfig = {
  connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
  containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'product-images'
};

// Validate required environment variables
if (!storageConfig.connectionString) {
  throw new Error('Missing required Azure Storage environment variable: AZURE_STORAGE_CONNECTION_STRING');
}

// Initialize Blob Service Client
const blobServiceClient = BlobServiceClient.fromConnectionString(storageConfig.connectionString);

// Get container client
const containerClient = blobServiceClient.getContainerClient(storageConfig.containerName);

// Initialize storage container if it doesn't exist
export async function initializeStorage() {
  try {
    console.log('🔗 Connecting to Azure Storage Blob...');
    
    // Create container if it doesn't exist
    await containerClient.createIfNotExists();
    
    console.log(`✅ Storage container '${storageConfig.containerName}' ready`);
    console.log('🎉 Azure Storage initialization complete!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Azure Storage:', error);
    throw error;
  }
}

// Upload file to blob storage
export async function uploadFile(fileName, fileBuffer, contentType) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    const uploadResult = await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType
      }
    });

    return {
      url: blockBlobClient.url,
      etag: uploadResult.etag,
      lastModified: uploadResult.lastModified
    };
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw new Error('Failed to upload file to Azure Storage');
  }
}

// Delete file from blob storage
export async function deleteFile(fileName) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.delete();
    return true;
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    throw new Error('Failed to delete file from Azure Storage');
  }
}

// Get file URL
export function getFileUrl(fileName) {
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  return blockBlobClient.url;
}

export { containerClient, blobServiceClient, storageConfig }; 