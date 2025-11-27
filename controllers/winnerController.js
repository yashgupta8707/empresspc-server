// controllers/winnerController.js
import Winner from '../models/Winner.js';

// ========== PUBLIC ROUTES ==========

// Get all active winners
export const getAllWinners = async (req, res) => {
  try {
    const { 
      category, 
      featured,
      page = 1, 
      limit = 12,
      sort = '-winDate'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get winners with pagination
    const winners = await Winner.find(filter)
      .populate('event', 'title date')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Winner.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        winners,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get featured winners for carousel
export const getFeaturedWinners = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const winners = await Winner.find({ 
      isActive: true,
      isFeatured: true
    })
      .populate('event', 'title date')
      .sort('-winDate')
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: winners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get recent winners
export const getRecentWinners = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const winners = await Winner.find({ isActive: true })
      .populate('event', 'title date')
      .sort('-winDate')
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: winners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== ADMIN ROUTES ==========

// Get all winners (admin)
export const getAllWinnersAdmin = async (req, res) => {
  try {
    const { 
      category, 
      status, 
      search, 
      page = 1, 
      limit = 20,
      sort = '-winDate'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { eventName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get winners with pagination
    const winners = await Winner.find(filter)
      .populate('event', 'title date')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Winner.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        winners,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new winner (admin)
export const createWinner = async (req, res) => {
  try {
    const winner = new Winner(req.body);
    const savedWinner = await winner.save();
    
    res.status(201).json({
      success: true,
      message: 'Winner created successfully',
      data: savedWinner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update winner (admin)
export const updateWinner = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const winner = await Winner.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('event', 'title date');

    if (!winner) {
      return res.status(404).json({ success: false, message: 'Winner not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Winner updated successfully',
      data: winner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete winner (admin)
export const deleteWinner = async (req, res) => {
  try {
    const { id } = req.params;

    const winner = await Winner.findByIdAndDelete(id);

    if (!winner) {
      return res.status(404).json({ success: false, message: 'Winner not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Winner deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get winner statistics (admin)
export const getWinnerStats = async (req, res) => {
  try {
    const totalWinners = await Winner.countDocuments();
    const activeWinners = await Winner.countDocuments({ isActive: true });
    const featuredWinners = await Winner.countDocuments({ isFeatured: true });
    
    // Category breakdown
    const categoryStats = await Winner.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Position breakdown
    const positionStats = await Winner.aggregate([
      { $group: { _id: '$position', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalWinners,
        activeWinners,
        featuredWinners,
        categoryStats,
        positionStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};