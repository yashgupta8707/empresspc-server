// models/About.js
import mongoose from 'mongoose';

// Gallery Item Schema
const galleryItemSchema = mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true },
  specs: [{ type: String, required: true }],
  price: { type: Number },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Team Member Schema
const teamMemberSchema = mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  image: { type: String, required: true },
  bio: { type: String },
  email: { type: String },
  linkedin: { type: String },
  category: { 
    type: String, 
    enum: ['leadership', 'operations', 'support', 'creative'],
    default: 'operations'
  },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Stats Schema
const statsSchema = mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
  icon: { type: String },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Core Values Schema
const coreValueSchema = mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Testimonials Schema
const testimonialSchema = mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  image: { type: String },
  location: { type: String },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

// Company Info Schema
const companyInfoSchema = mongoose.Schema({
  heroTitle: { type: String, default: 'Empress' },
  heroSubtitle: { type: String, default: 'Quality Custom PCs' },
  heroKeywords: [{ type: String }],
  heroBackgroundImage: { type: String },
  aboutDescription: { type: String },
  mission: { type: String },
  vision: { type: String },
  foundedYear: { type: Number },
  location: { type: String }
}, { timestamps: true });

// Create models
const GalleryItem = mongoose.model('GalleryItem', galleryItemSchema);
const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
const AboutStats = mongoose.model('AboutStats', statsSchema);
const CoreValue = mongoose.model('CoreValue', coreValueSchema);
const Testimonial = mongoose.model('Testimonial', testimonialSchema);
const CompanyInfo = mongoose.model('CompanyInfo', companyInfoSchema);

export { 
  GalleryItem, 
  TeamMember, 
  AboutStats, 
  CoreValue, 
  Testimonial, 
  CompanyInfo 
};