// controllers/blogController.js - Complete controller with all functions
import Blog from '../models/Blog.js';

// Helper function to generate unique slug
const generateUniqueSlug = async (title, blogId = null) => {
  let baseSlug = title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingBlog = await Blog.findOne({ 
      slug, 
      ...(blogId && { _id: { $ne: blogId } })
    });
    
    if (!existingBlog) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// ========== PUBLIC ROUTES ==========

// Get all published blogs with filtering and pagination
export const getAllBlogs = async (req, res) => {
  try {
    const { 
      category, 
      type,
      tags, 
      search, 
      featured, 
      editorsChoice, 
      page = 1, 
      limit = 12,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = { isPublished: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (tags) {
      filter.tags = { $in: tags.split(',') };
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (featured === 'true') {
      filter.isFeatured = true;
    }
    
    if (editorsChoice === 'true') {
      filter.isEditorsChoice = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get blogs with pagination
    const blogs = await Blog.find(filter)
      .populate('author', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Blog.countDocuments(filter);
    
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        blogs,
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

// Get single blog by ID
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id).populate('author', 'name email');
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single blog by slug (MAIN FUNCTION FOR DETAIL PAGE)
export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const blog = await Blog.findOne({ slug, isPublished: true })
      .populate('author', 'name email');
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Increment view count
    blog.views += 1;
    await blog.save();

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get featured blogs
export const getFeaturedBlogs = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const blogs = await Blog.find({ isPublished: true, isFeatured: true })
      .populate('author', 'name email')
      .sort('-createdAt')
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get editors choice blogs
export const getEditorsChoiceBlogs = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    
    const blogs = await Blog.find({ isPublished: true, isEditorsChoice: true })
      .populate('author', 'name email')
      .sort('-createdAt')
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get recent blogs
export const getRecentBlogs = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const blogs = await Blog.find({ isPublished: true })
      .populate('author', 'name email')
      .sort('-createdAt')
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get popular blogs (by views)
export const getPopularBlogs = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const blogs = await Blog.find({ isPublished: true })
      .populate('author', 'name email')
      .sort('-views')
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get blogs by category
export const getBlogsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const blogs = await Blog.find({ category, isPublished: true })
      .populate('author', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments({ category, isPublished: true });
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        blogs,
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

// ========== ADMIN ROUTES ==========

// Get all blogs (admin)
export const getAllBlogsAdmin = async (req, res) => {
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
    
    if (status === 'published') {
      filter.isPublished = true;
    } else if (status === 'draft') {
      filter.isPublished = false;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get blogs with pagination
    const blogs = await Blog.find(filter)
      .populate('author', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Blog.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        blogs,
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

// Create new blog (admin)
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      image,
      category,
      type = 'blog',
      tags,
      readTime,
      isPublished,
      isFeatured,
      isEditorsChoice
    } = req.body;

    // Generate unique slug
    const slug = await generateUniqueSlug(title);

    const blog = new Blog({
      title,
      slug,
      summary,
      content,
      image,
      category,
      type,
      tags: tags || [],
      readTime: readTime || '5 mins',
      isPublished: isPublished !== undefined ? isPublished : true,
      isFeatured: isFeatured || false,
      isEditorsChoice: isEditorsChoice || false,
      author: req.user._id,
      authorName: req.user.name
    });

    const savedBlog = await blog.save();
    
    res.status(201).json({
      success: true,
      message: `${type === 'article' ? 'Article' : 'Blog'} created successfully`,
      data: savedBlog
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update blog (admin)
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If title is being updated, generate new slug
    if (updateData.title) {
      const existingBlog = await Blog.findById(id);
      if (!existingBlog) {
        return res.status(404).json({ success: false, message: 'Blog not found' });
      }
      
      // Only update slug if title actually changed
      if (updateData.title !== existingBlog.title) {
        updateData.slug = await generateUniqueSlug(updateData.title, id);
      }
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete blog (admin)
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle blog status (admin)
export const toggleBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    blog.isPublished = !blog.isPublished;
    await blog.save();

    res.status(200).json({
      success: true,
      message: `Blog ${blog.isPublished ? 'published' : 'unpublished'} successfully`,
      data: blog
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get blog statistics (admin)
export const getBlogStats = async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ isPublished: true });
    const draftBlogs = await Blog.countDocuments({ isPublished: false });
    const featuredBlogs = await Blog.countDocuments({ isFeatured: true });
    const totalViews = await Blog.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);

    // Type breakdown
    const typeStats = await Blog.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Category breakdown
    const categoryStats = await Blog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        featuredBlogs,
        totalViews: totalViews[0]?.totalViews || 0,
        typeStats,
        categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};