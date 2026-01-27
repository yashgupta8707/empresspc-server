// models/Quotation.js
import mongoose from 'mongoose';

const quotationSchema = mongoose.Schema({
  type: {
    type: String,
    default: 'quotation',
    enum: ['quotation', 'pc_build_query'],
    required: true
  },
  pcName: {
    type: String,
    required: true,
    trim: true
  },
  pcId: {
    type: String,
    trim: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[\d\s\+\-()]+$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  note: {
    type: String,
    trim: true,
    maxlength: [1000, 'Note cannot exceed 1000 characters']
  },
  summary: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'quoted', 'converted', 'closed'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  quotedPrice: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  quotedAt: {
    type: Date
  },
  convertedToOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  followUpDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ email: 1 });
quotationSchema.index({ phone: 1 });
quotationSchema.index({ priority: 1, status: 1 });

// Virtual for display ID
quotationSchema.virtual('displayId').get(function() {
  return `QT-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Pre-save middleware to generate summary
quotationSchema.pre('save', function(next) {
  if (this.isNew) {
    const date = new Date().toISOString().split('T')[0];
    this.summary = `Query for ${this.pcName} from ${this.customerName}, ${this.phone}, ${this.email} on ${date}`;
  }
  next();
});

// Static method to get quotations with filters
quotationSchema.statics.findWithFilters = function(filters = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.dateFrom) {
    query.createdAt = { ...query.createdAt, $gte: new Date(filters.dateFrom) };
  }

  if (filters.dateTo) {
    query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
  }

  if (filters.search) {
    query.$or = [
      { customerName: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } },
      { pcName: { $regex: filters.search, $options: 'i' } }
    ];
  }

  return this.find(query);
};

// Ensure virtuals are included in JSON
quotationSchema.set('toJSON', { virtuals: true });
quotationSchema.set('toObject', { virtuals: true });

const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;
