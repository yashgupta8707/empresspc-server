// models/Winner.js
import mongoose from 'mongoose';

const winnerSchema = mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  name: {
    type: String,
    required: true
  },
  image: { 
    type: String, 
    required: true 
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  eventName: {
    type: String,
    required: true
  },
  position: {
    type: String,
    enum: ['1st', '2nd', '3rd', 'winner', 'runner-up'],
    default: 'winner'
  },
  prize: {
    type: String
  },
  winDate: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    enum: ['gaming', 'tournament', 'competition', 'contest'],
    default: 'gaming'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  description: {
    type: String
  }
}, { 
  timestamps: true 
});

// Add indexes
winnerSchema.index({ winDate: -1 });
winnerSchema.index({ category: 1, isActive: 1 });

const Winner = mongoose.model('Winner', winnerSchema);
export default Winner;