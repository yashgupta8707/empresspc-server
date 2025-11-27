// controllers/enhancedAuthController.js
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc Update user profile with enhanced fields
// @route PUT /api/auth/profile
// @access Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields that are provided
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) {
      // Check if email is already taken by another user
      const emailExists = await User.findOne({ 
        email: req.body.email, 
        _id: { $ne: req.user._id } 
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered to another account'
        });
      }
      user.email = req.body.email;
    }
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.address) user.address = req.body.address;
    if (req.body.dateOfBirth) user.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender) user.gender = req.body.gender;

    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password; // Pre-save middleware will hash it
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        dateOfBirth: updatedUser.dateOfBirth,
        gender: updatedUser.gender,
        isAdmin: updatedUser.isAdmin
      },
      token: generateToken(updatedUser._id)
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile'
    });
  }
};

// @desc Change user password
// @route PUT /api/auth/change-password
// @access Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword; // Pre-save middleware will hash it
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

// @desc Get user addresses
// @route GET /api/users/addresses
// @access Private
export const getUserAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('addresses');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      addresses: user.addresses || []
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching addresses'
    });
  }
};

// @desc Add new address
// @route POST /api/users/addresses
// @access Private
export const addUserAddress = async (req, res) => {
  try {
    const {
      type,
      firstName,
      lastName,
      address,
      apartment,
      city,
      state,
      pincode,
      phone,
      isDefault
    } = req.body;

    // Validation
    if (!firstName || !lastName || !address || !city || !state || !pincode || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate pincode and phone
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'PIN code must be 6 digits'
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If this is set as default, unset other default addresses
    if (isDefault && user.addresses) {
      user.addresses.forEach(addr => {
        if (addr.isDefault) addr.isDefault = false;
      });
    }

    const newAddress = {
      type: type || 'home',
      firstName,
      lastName,
      address,
      apartment,
      city,
      state,
      pincode,
      phone,
      isDefault: isDefault || false
    };

    if (!user.addresses) {
      user.addresses = [];
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      address: newAddress
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding address'
    });
  }
};

// @desc Update address
// @route PUT /api/users/addresses/:addressId
// @access Private
export const updateUserAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      user.addresses.forEach((addr, index) => {
        if (index !== addressIndex) addr.isDefault = false;
      });
    }

    // Update the address
    Object.assign(user.addresses[addressIndex], req.body);
    await user.save();

    res.json({
      success: true,
      message: 'Address updated successfully',
      address: user.addresses[addressIndex]
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating address'
    });
  }
};

// @desc Delete address
// @route DELETE /api/users/addresses/:addressId
// @access Private
export const deleteUserAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting address'
    });
  }
};

// @desc Get user wishlist
// @route GET /api/users/wishlist
// @access Private
export const getUserWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: {
        path: 'product',
        select: 'name brand price originalPrice images quantity'
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      wishlist: user.wishlist || []
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist'
    });
  }
};

// @desc Add to wishlist
// @route POST /api/users/wishlist
// @access Private
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if product is already in wishlist
    if (!user.wishlist) {
      user.wishlist = [];
    }

    const existingItem = user.wishlist.find(item => 
      item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    user.wishlist.push({
      product: productId,
      addedAt: new Date()
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist'
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding to wishlist'
    });
  }
};

// @desc Remove from wishlist
// @route DELETE /api/users/wishlist/:productId
// @access Private
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Product not in wishlist'
      });
    }

    const itemIndex = user.wishlist.findIndex(item => 
      item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not in wishlist'
      });
    }

    user.wishlist.splice(itemIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from wishlist'
    });
  }
};

// @desc Verify current password
// @route POST /api/auth/verify-password
// @access Private
export const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValid = await user.matchPassword(password);

    res.json({
      success: true,
      isValid
    });
  } catch (error) {
    console.error('Verify password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying password'
    });
  }
};

// @desc Get user account activity
// @route GET /api/users/activity
// @access Private
export const getUserActivity = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // This would typically come from a separate UserActivity model
    // For now, we'll return mock data
    const activities = [
      {
        type: 'login',
        description: 'Logged in from Chrome on Windows',
        timestamp: new Date(),
        ip: req.ip,
        device: 'Desktop'
      }
    ];

    res.json({
      success: true,
      activities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: 1,
        total: activities.length
      }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity'
    });
  }
};

// @desc Delete user account
// @route DELETE /api/users/account
// @access Private
export const deleteUserAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await user.matchPassword(password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Instead of deleting, mark as inactive
    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
};