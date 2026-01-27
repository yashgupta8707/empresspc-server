// routes/quotationRoutes.js
import express from 'express';
import Quotation from '../models/Quotation.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create quotation request (public - no auth required)
router.post('/create', async (req, res) => {
  try {
    console.log('📝 Creating quotation request:', req.body);

    const { pcName, pcId, customerName, phone, email, note } = req.body;

    // Validate input
    if (!pcName || !customerName || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'PC name, customer name, phone, and email are required'
      });
    }

    // Create quotation
    const quotationData = {
      type: 'quotation',
      pcName,
      pcId,
      customerName,
      phone,
      email,
      note: note || '',
      status: 'pending',
      priority: 'medium'
    };

    const quotation = new Quotation(quotationData);
    const savedQuotation = await quotation.save();

    console.log('✅ Quotation created successfully:', savedQuotation._id);

    res.status(201).json({
      success: true,
      message: 'Quotation request submitted successfully',
      quotation: {
        id: savedQuotation._id,
        displayId: savedQuotation.displayId,
        summary: savedQuotation.summary,
        createdAt: savedQuotation.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Quotation creation error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit quotation request'
    });
  }
});

// Get quotation statistics (admin only) - MUST be before /:id route
router.get('/admin/stats', protect, admin, async (req, res) => {
  try {
    const totalQuotations = await Quotation.countDocuments();
    const pendingQuotations = await Quotation.countDocuments({ status: 'pending' });
    const contactedQuotations = await Quotation.countDocuments({ status: 'contacted' });
    const quotedQuotations = await Quotation.countDocuments({ status: 'quoted' });
    const convertedQuotations = await Quotation.countDocuments({ status: 'converted' });

    const byStatus = {
      pending: pendingQuotations,
      contacted: contactedQuotations,
      quoted: quotedQuotations,
      converted: convertedQuotations
    };

    const stats = {
      total: totalQuotations,
      byStatus,
      conversionRate: totalQuotations > 0 ? ((convertedQuotations / totalQuotations) * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error fetching quotation stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all quotations (admin only)
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const { status, priority, search, dateFrom, dateTo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (search) filters.search = search;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const quotations = await Quotation.findWithFilters(filters)
      .populate('assignedTo', 'name email')
      .populate('convertedToOrder')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      quotations,
      count: quotations.length
    });
  } catch (error) {
    console.error('❌ Error fetching quotations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get quotation by ID (admin only)
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('convertedToOrder');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.json({
      success: true,
      quotation
    });
  } catch (error) {
    console.error('❌ Error fetching quotation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update quotation (admin only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { status, priority, quotedPrice, adminNotes, followUpDate, assignedTo } = req.body;

    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Update fields
    if (status) quotation.status = status;
    if (priority) quotation.priority = priority;
    if (quotedPrice !== undefined) {
      quotation.quotedPrice = quotedPrice;
      if (status === 'quoted' && !quotation.quotedAt) {
        quotation.quotedAt = new Date();
      }
    }
    if (adminNotes !== undefined) quotation.adminNotes = adminNotes;
    if (followUpDate) quotation.followUpDate = followUpDate;
    if (assignedTo) quotation.assignedTo = assignedTo;

    const updatedQuotation = await quotation.save();

    res.json({
      success: true,
      message: 'Quotation updated successfully',
      quotation: updatedQuotation
    });
  } catch (error) {
    console.error('❌ Error updating quotation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete quotation (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    await quotation.deleteOne();

    res.json({
      success: true,
      message: 'Quotation deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting quotation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
