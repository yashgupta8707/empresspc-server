// controllers/aboutController.js
import { 
  GalleryItem, 
  TeamMember, 
  AboutStats, 
  CoreValue, 
  Testimonial, 
  CompanyInfo 
} from '../models/About.js';

// ========== PUBLIC ROUTES ==========

// Get all about page data
export const getAboutPageData = async (req, res) => {
  try {
    const [galleryItems, teamMembers, stats, coreValues, testimonials, companyInfo] = await Promise.all([
      GalleryItem.find({ isActive: true }).sort({ createdAt: -1 }),
      TeamMember.find({ isActive: true }).sort({ order: 1, createdAt: 1 }),
      AboutStats.find({ isActive: true }).sort({ order: 1 }),
      CoreValue.find({ isActive: true }).sort({ order: 1 }),
      Testimonial.find({ isActive: true }).sort({ createdAt: -1 }),
      CompanyInfo.findOne()
    ]);

    res.status(200).json({
      success: true,
      data: {
        galleryItems,
        teamMembers,
        stats,
        coreValues,
        testimonials,
        companyInfo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== GALLERY ITEMS ==========

export const getAllGalleryItems = async (req, res) => {
  try {
    const items = await GalleryItem.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, galleryItems: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGalleryItem = async (req, res) => {
  try {
    const { title, image, specs, price } = req.body;
    const item = new GalleryItem({ title, image, specs, price });
    const savedItem = await item.save();
    res.status(201).json({ success: true, galleryItem: savedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedItem = await GalleryItem.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }
    res.status(200).json({ success: true, galleryItem: updatedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    await GalleryItem.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Gallery item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== TEAM MEMBERS ==========

export const getAllTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find().sort({ order: 1, createdAt: 1 });
    res.status(200).json({ success: true, teamMembers: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTeamMember = async (req, res) => {
  try {
    const member = new TeamMember(req.body);
    const savedMember = await member.save();
    res.status(201).json({ success: true, teamMember: savedMember });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMember = await TeamMember.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedMember) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    res.status(200).json({ success: true, teamMember: updatedMember });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    await TeamMember.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Team member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STATS ==========

export const getAllStats = async (req, res) => {
  try {
    const stats = await AboutStats.find().sort({ order: 1 });
    res.status(200).json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createStat = async (req, res) => {
  try {
    const stat = new AboutStats(req.body);
    const savedStat = await stat.save();
    res.status(201).json({ success: true, stat: savedStat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStat = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStat = await AboutStats.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedStat) {
      return res.status(404).json({ success: false, message: 'Stat not found' });
    }
    res.status(200).json({ success: true, stat: updatedStat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStat = async (req, res) => {
  try {
    const { id } = req.params;
    await AboutStats.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Stat deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== CORE VALUES ==========

export const getAllCoreValues = async (req, res) => {
  try {
    const values = await CoreValue.find().sort({ order: 1 });
    res.status(200).json({ success: true, coreValues: values });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCoreValue = async (req, res) => {
  try {
    const value = new CoreValue(req.body);
    const savedValue = await value.save();
    res.status(201).json({ success: true, coreValue: savedValue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCoreValue = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedValue = await CoreValue.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedValue) {
      return res.status(404).json({ success: false, message: 'Core value not found' });
    }
    res.status(200).json({ success: true, coreValue: updatedValue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCoreValue = async (req, res) => {
  try {
    const { id } = req.params;
    await CoreValue.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Core value deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== TESTIMONIALS ==========

export const getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTestimonial = async (req, res) => {
  try {
    const testimonial = new Testimonial(req.body);
    const savedTestimonial = await testimonial.save();
    res.status(201).json({ success: true, testimonial: savedTestimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedTestimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }
    res.status(200).json({ success: true, testimonial: updatedTestimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    await Testimonial.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== COMPANY INFO ==========

export const getCompanyInfo = async (req, res) => {
  try {
    let companyInfo = await CompanyInfo.findOne();
    if (!companyInfo) {
      // Create default company info if none exists
      companyInfo = new CompanyInfo({
        heroTitle: 'Empress',
        heroSubtitle: 'Quality Custom PCs',
        heroKeywords: ['Gaming', 'Engineering', 'Liquid', 'Server', 'Research', 'Content-Creation']
      });
      await companyInfo.save();
    }
    res.status(200).json({ success: true, companyInfo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCompanyInfo = async (req, res) => {
  try {
    let companyInfo = await CompanyInfo.findOne();
    if (!companyInfo) {
      companyInfo = new CompanyInfo(req.body);
    } else {
      Object.assign(companyInfo, req.body);
    }
    const savedInfo = await companyInfo.save();
    res.status(200).json({ success: true, companyInfo: savedInfo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};