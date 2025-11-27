// config/cloudinary.js - Enhanced version with better error handling
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Validate configuration
const validateCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  
  if (!cloud_name || !api_key || !api_secret) {
    console.warn('⚠️ Cloudinary configuration incomplete. Image uploads will use local storage.');
    return false;
  }
  
  console.log('✅ Cloudinary configuration validated');
  return true;
};

// Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection test successful:', result);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection test failed:', error.message);
    return false;
  }
};

// Initialize Cloudinary on startup
const initializeCloudinary = async () => {
  const isConfigValid = validateCloudinaryConfig();
  
  if (isConfigValid) {
    const isConnected = await testCloudinaryConnection();
    
    if (!isConnected) {
      console.warn('⚠️ Cloudinary connection failed. Falling back to local storage.');
    }
    
    return isConnected;
  }
  
  return false;
};

// Enhanced upload options with better transformations
export const uploadOptions = {
  testimonials: {
    folder: 'empress-tech/testimonials',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    resource_type: 'image'
  },
  products: {
    folder: 'empress-tech/products',
    transformation: [
      { width: 800, height: 600, crop: 'fit', quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image'
  },
  blogs: {
    folder: 'empress-tech/blogs',
    transformation: [
      { width: 1200, height: 630, crop: 'fit', quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image'
  },
  gallery: {
    folder: 'empress-tech/gallery',
    transformation: [
      { width: 1000, height: 750, crop: 'fit', quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image'
  },
  team: {
    folder: 'empress-tech/team',
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image'
  },
  general: {
    folder: 'empress-tech/general',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    resource_type: 'image'
  }
};

// Enhanced upload function with better error handling
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    // Validate file exists
    if (!filePath) {
      throw new Error('File path is required');
    }

    const defaultOptions = {
      folder: 'empress-tech/general',
      resource_type: 'image',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    console.log(`🔄 Uploading to Cloudinary: ${filePath}`);
    const result = await cloudinary.uploader.upload(filePath, defaultOptions);
    
    console.log(`✅ Cloudinary upload successful: ${result.public_id}`);
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      createdAt: result.created_at,
      resourceType: result.resource_type
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    
    // Enhanced error handling
    let errorMessage = 'Image upload failed';
    
    if (error.http_code === 400) {
      errorMessage = 'Invalid image file or parameters';
    } else if (error.http_code === 401) {
      errorMessage = 'Cloudinary authentication failed';
    } else if (error.http_code === 413) {
      errorMessage = 'Image file too large';
    } else if (error.http_code === 420) {
      errorMessage = 'Upload rate limit exceeded';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(`${errorMessage}: ${error.message || 'Unknown error'}`);
  }
};

// Enhanced delete function with better error handling
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    if (!publicId) {
      throw new Error('Public ID is required for deletion');
    }

    console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType 
    });
    
    if (result.result === 'ok') {
      console.log(`✅ Cloudinary deletion successful: ${publicId}`);
      return { 
        success: true, 
        message: 'Image deleted successfully',
        publicId,
        result: result.result
      };
    } else if (result.result === 'not found') {
      console.log(`⚠️ Image not found in Cloudinary: ${publicId}`);
      return { 
        success: true, 
        message: 'Image not found (may have been already deleted)',
        publicId,
        result: result.result
      };
    } else {
      throw new Error(`Deletion failed: ${result.result}`);
    }
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw new Error(`Image deletion failed: ${error.message}`);
  }
};

// Get Cloudinary URL with transformations
export const getTransformedUrl = (publicId, transformations = []) => {
  try {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    return cloudinary.url(publicId, {
      transformation: transformations,
      secure: true,
      quality: 'auto',
      fetch_format: 'auto'
    });
  } catch (error) {
    console.error('❌ Error generating transformed URL:', error);
    return null;
  }
};

// Bulk delete images with progress tracking
export const bulkDeleteFromCloudinary = async (publicIds, resourceType = 'image') => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new Error('Public IDs array is required');
    }

    console.log(`🗑️ Bulk deleting ${publicIds.length} images from Cloudinary`);
    
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });
    
    console.log(`✅ Bulk deletion completed. Deleted: ${Object.keys(result.deleted).length}`);
    
    return {
      success: true,
      deleted: result.deleted,
      partial: result.partial,
      notFound: result.not_found,
      summary: {
        total: publicIds.length,
        deleted: Object.keys(result.deleted).length,
        failed: Object.keys(result.partial || {}).length,
        notFound: Object.keys(result.not_found || {}).length
      }
    };
  } catch (error) {
    console.error('❌ Cloudinary bulk delete error:', error);
    throw new Error(`Bulk deletion failed: ${error.message}`);
  }
};

// Get upload signature for client-side uploads
export const getUploadSignature = (folder = 'empress-tech/general') => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp,
      folder,
      quality: 'auto',
      fetch_format: 'auto'
    };

    // Add upload preset if available
    if (process.env.CLOUDINARY_UPLOAD_PRESET) {
      params.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET;
    }

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    );

    return {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
      params
    };
  } catch (error) {
    console.error('❌ Error generating upload signature:', error);
    throw new Error('Failed to generate upload signature');
  }
};

// Get image info from Cloudinary
export const getImageInfo = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    const result = await cloudinary.api.resource(publicId);
    
    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      createdAt: result.created_at,
      folder: result.folder,
      resourceType: result.resource_type,
      tags: result.tags
    };
  } catch (error) {
    console.error('❌ Error getting image info:', error);
    throw new Error(`Failed to get image info: ${error.message}`);
  }
};

// Search images in Cloudinary
export const searchImages = async (expression, options = {}) => {
  try {
    const searchOptions = {
      expression,
      sort_by: [['created_at', 'desc']],
      max_results: 50,
      ...options
    };

    const result = await cloudinary.search
      .expression(expression)
      .sort_by('created_at', 'desc')
      .max_results(searchOptions.max_results)
      .execute();

    return {
      success: true,
      resources: result.resources,
      totalCount: result.total_count,
      nextCursor: result.next_cursor
    };
  } catch (error) {
    console.error('❌ Error searching images:', error);
    throw new Error(`Image search failed: ${error.message}`);
  }
};

// Get folder contents
export const getFolderContents = async (folder, options = {}) => {
  try {
    if (!folder) {
      throw new Error('Folder path is required');
    }

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: options.max_results || 100,
      next_cursor: options.next_cursor,
      ...options
    });

    return {
      success: true,
      resources: result.resources,
      nextCursor: result.next_cursor,
      totalCount: result.total_count
    };
  } catch (error) {
    console.error('❌ Error getting folder contents:', error);
    throw new Error(`Failed to get folder contents: ${error.message}`);
  }
};

// Create upload preset programmatically
export const createUploadPreset = async (name, settings = {}) => {
  try {
    const presetSettings = {
      name,
      unsigned: false,
      folder: 'empress-tech/general',
      format: 'auto',
      quality: 'auto',
      ...settings
    };

    const result = await cloudinary.api.create_upload_preset(presetSettings);
    
    return {
      success: true,
      name: result.name,
      settings: result.settings
    };
  } catch (error) {
    console.error('❌ Error creating upload preset:', error);
    throw new Error(`Failed to create upload preset: ${error.message}`);
  }
};

// Validate image before upload
export const validateImage = (file, maxSizeInMB = 5) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, WebP and GIF images are allowed');
  }
  
  // Check file size
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    errors.push(`File size must be less than ${maxSizeInMB}MB`);
  }
  
  // Check dimensions if possible
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 100 || img.height < 100) {
          errors.push('Image must be at least 100x100 pixels');
        }
        if (img.width > 5000 || img.height > 5000) {
          errors.push('Image dimensions cannot exceed 5000x5000 pixels');
        }
        
        resolve({
          isValid: errors.length === 0,
          errors,
          dimensions: { width: img.width, height: img.height }
        });
      };
      img.onerror = () => {
        errors.push('Invalid image file');
        resolve({ isValid: false, errors });
      };
      img.src = URL.createObjectURL(file);
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Initialize Cloudinary and export
export const isCloudinaryConfigured = await initializeCloudinary();

export default cloudinary;