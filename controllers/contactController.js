// controllers/contactController.js
import Contact from '../models/Contact.js';

// @desc Submit contact form
// @route POST /api/contact
// @access Public
const submitContactForm = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Please fill all required fields' 
      });
    }

    // Create new contact
    const contact = new Contact({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      message: message.trim()
    });

    const savedContact = await contact.save();

    res.status(201).json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
      contact: {
        id: savedContact._id,
        firstName: savedContact.firstName,
        lastName: savedContact.lastName,
        email: savedContact.email,
        createdAt: savedContact.createdAt
      }
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong. Please try again later.' 
    });
  }
};

// @desc Get all contact inquiries (Admin only)
// @route GET /api/admin/contacts
// @access Private/Admin
const getAllContacts = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Pagination
    const skip = (page - 1) * limit;

    const contacts = await Contact.find(filter)
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(filter);

    // Get status counts
    const statusCounts = await Contact.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      contacts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Unable to fetch contacts' 
    });
  }
};

// @desc Get single contact inquiry (Admin only)
// @route GET /api/admin/contacts/:id
// @access Private/Admin
const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('respondedBy', 'name email');

    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact inquiry not found' 
      });
    }

    res.status(200).json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Unable to fetch contact inquiry' 
    });
  }
};

// @desc Update contact status/priority (Admin only)
// @route PUT /api/admin/contacts/:id
// @access Private/Admin
const updateContact = async (req, res) => {
  try {
    const { status, priority, adminNotes } = req.body;
    const contactId = req.params.id;

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact inquiry not found' 
      });
    }

    // Update fields
    if (status) contact.status = status;
    if (priority) contact.priority = priority;
    if (adminNotes !== undefined) contact.adminNotes = adminNotes;

    // Mark as responded if status is replied
    if (status === 'replied') {
      contact.respondedAt = new Date();
      contact.respondedBy = req.user._id;
    }

    const updatedContact = await contact.save();

    res.status(200).json({
      success: true,
      message: 'Contact inquiry updated successfully',
      contact: updatedContact
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Unable to update contact inquiry' 
    });
  }
};

// @desc Delete contact inquiry (Admin only)
// @route DELETE /api/admin/contacts/:id
// @access Private/Admin
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact inquiry not found' 
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Contact inquiry deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Unable to delete contact inquiry' 
    });
  }
};

// @desc Get contact statistics (Admin only)
// @route GET /api/admin/contacts/stats
// @access Private/Admin
const getContactStats = async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
          },
          read: {
            $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
          },
          replied: {
            $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] }
          },
          urgent: {
            $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent contacts (last 7 days)
    const recentCount = await Contact.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const result = stats[0] || {
      total: 0,
      unread: 0,
      read: 0,
      replied: 0,
      urgent: 0
    };

    result.recent = recentCount;

    res.status(200).json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Unable to fetch contact statistics' 
    });
  }
};

export {
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
  getContactStats
};