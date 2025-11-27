// models/Event.js
import mongoose from 'mongoose';

const eventSchema = mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  image: { 
    type: String, 
    required: true 
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['gaming', 'workshop', 'tournament', 'expo', 'summit', 'conference'],
    default: 'gaming'
  },
  type: {
    type: String,
    enum: ['upcoming', 'schedule', 'past'],
    default: 'upcoming'
  },
  speaker: {
    name: String,
    image: String,
    bio: String
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxParticipants: {
    type: Number,
    default: 100
  },
  registeredCount: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true 
});

// Add indexes for better performance
eventSchema.index({ date: 1, type: 1 });
eventSchema.index({ category: 1, isActive: 1 });

const Event = mongoose.model('Event', eventSchema);
export default Event;