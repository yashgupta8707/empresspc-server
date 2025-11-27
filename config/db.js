// config/db.js - Fixed MongoDB connection
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Set mongoose options to avoid warnings
    mongoose.set('strictQuery', false);

    // Simplified connection options - removed deprecated parameters
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    // Use MONGO_URI instead of MONGODB_URI to match your .env file
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB connection string not found. Please set MONGO_URI or MONGODB_URI in your .env file');
    }

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoUri, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`📌 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    // Enhanced error handling
    if (error.name === 'MongoServerError') {
      console.error('Server Error Details:', {
        code: error.code,
        codeName: error.codeName || 'Unknown'
      });
    } else if (error.name === 'MongoNetworkError') {
      console.error('Network Error - Check your internet connection and MongoDB URI');
    } else if (error.name === 'MongoParseError') {
      console.error('Parse Error - Check your MongoDB URI format');
    }
    
    // Don't exit in development to allow for retry
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('🔄 Retrying connection in 5 seconds...');
      setTimeout(() => connectDB(), 5000);
    }
  }
};

export default connectDB;