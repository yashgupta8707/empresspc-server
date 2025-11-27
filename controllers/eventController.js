// controllers/eventController.js
import Event from '../models/Event.js';

// ========== PUBLIC ROUTES ==========

// Get all active events with filtering
export const getAllEvents = async (req, res) => {
  try {
    const { 
      category, 
      type, 
      date,
      featured,
      page = 1, 
      limit = 12,
      sort = 'date'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: targetDate, $lt: nextDay };
    }
    
    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get events with pagination
    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Event.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get upcoming events
// export const getUpcomingEvents = async (req, res) => {
//   try {
//     const { limit = 10 } = req.query;
//     const now = new Date();
    
//     const events = await Event.find({ 
//       date: { $gte: now },
//       isActive: true,
//       type: { $in: ['upcoming', 'schedule'] }
//     })
//       .populate('createdBy', 'name')
//       .sort('date')
//       .limit(parseInt(limit));

//     res.status(200).json({ success: true, data: events });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
// Get upcoming events - FIXED VERSION
export const getUpcomingEvents = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const now = new Date();
    
    const events = await Event.find({ 
      date: { $gte: now },
      isActive: true,
      type: { $in: ['upcoming', 'schedule'] }
    })
      .populate('createdBy', 'name')
      .sort('date startTime')
      .limit(parseInt(limit));

    // Transform the data to match frontend expectations
    const transformedEvents = events.map(event => ({
      _id: event._id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      date: event.date,
      location: event.location,
      category: event.category,
      type: event.type,
      speaker: event.speaker ? {
        name: event.speaker.name,
        image: event.speaker.image,
        bio: event.speaker.bio
      } : null,
      isFeatured: event.isFeatured,
      isActive: event.isActive,
      maxParticipants: event.maxParticipants,
      registeredCount: event.registeredCount || 0,
      price: event.price
    }));

    res.status(200).json({ success: true, data: transformedEvents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get event schedule
export const getEventSchedule = async (req, res) => {
  try {
    const { date, limit = 20 } = req.query;
    
    let filter = { 
      isActive: true,
      type: { $in: ['schedule', 'upcoming'] }
    };
    
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: targetDate, $lt: nextDay };
    }
    
    const events = await Event.find(filter)
      .populate('createdBy', 'name')
      .sort('date startTime')
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get featured events
export const getFeaturedEvents = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const events = await Event.find({ 
      isFeatured: true,
      isActive: true
    })
      .populate('createdBy', 'name')
      .sort('-date')
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single event by ID
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findOne({ _id: id, isActive: true })
      .populate('createdBy', 'name email');
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== ADMIN ROUTES ==========

// Get all events (admin)
export const getAllEventsAdmin = async (req, res) => {
  try {
    const { 
      category, 
      type,
      status, 
      search, 
      page = 1, 
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get events with pagination
    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Event.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        events,
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

// Create new event (admin)
export const createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id
    };

    const event = new Event(eventData);
    const savedEvent = await event.save();
    
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: savedEvent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update event (admin)
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await Event.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete event (admin)
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get event statistics (admin)
export const getEventStats = async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ isActive: true });
    const upcomingEvents = await Event.countDocuments({ 
      date: { $gte: new Date() },
      isActive: true 
    });
    const featuredEvents = await Event.countDocuments({ isFeatured: true });
    
    // Category breakdown
    const categoryStats = await Event.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Type breakdown
    const typeStats = await Event.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        activeEvents,
        upcomingEvents,
        featuredEvents,
        categoryStats,
        typeStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};