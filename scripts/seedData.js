// scripts/seedData.js - Sample Data Seeder
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const sampleProducts = [
  // Processors
  {
    name: "AMD Ryzen 7 7700X",
    brand: "AMD",
    category: "processors",
    price: 399.99,
    originalPrice: 449.99,
    description1: "High-performance 8-core processor for gaming and content creation",
    description2: "Featuring AMD's Zen 4 architecture with exceptional single-threaded performance",
    images: [
      "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500",
      "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500"
    ],
    specs: new Map([
      ["Cores", "8"],
      ["Threads", "16"],
      ["Base Clock", "4.5 GHz"],
      ["Boost Clock", "5.4 GHz"],
      ["Socket", "AM5"],
      ["TDP", "105W"]
    ]),
    badge: {
      text: "Best Seller",
      color: "bg-green-500"
    },
    inStock: true
  },
  {
    name: "Intel Core i7-13700K",
    brand: "Intel",
    category: "processors",
    price: 419.99,
    originalPrice: 459.99,
    description1: "13th Gen Intel Core processor with hybrid architecture",
    description2: "Combines Performance-cores and Efficient-cores for ultimate multitasking",
    images: [
      "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500"
    ],
    specs: new Map([
      ["Cores", "16 (8P+8E)"],
      ["Threads", "24"],
      ["Base Clock", "3.4 GHz"],
      ["Boost Clock", "5.4 GHz"],
      ["Socket", "LGA1700"],
      ["TDP", "125W"]
    ]),
    badge: {
      text: "New",
      color: "bg-blue-500"
    },
    inStock: true
  },
  
  // Graphics Cards
  {
    name: "NVIDIA GeForce RTX 4070 Ti",
    brand: "NVIDIA",
    category: "graphics-cards",
    price: 799.99,
    originalPrice: 899.99,
    description1: "Next-gen graphics card with DLSS 3 and ray tracing",
    description2: "Perfect for 1440p gaming and content creation workflows",
    images: [
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500"
    ],
    specs: new Map([
      ["CUDA Cores", "7680"],
      ["Memory", "12GB GDDR6X"],
      ["Memory Interface", "192-bit"],
      ["Boost Clock", "2610 MHz"],
      ["TDP", "285W"]
    ]),
    badge: {
      text: "RTX",
      color: "bg-green-600"
    },
    inStock: true
  },
  {
    name: "AMD Radeon RX 7800 XT",
    brand: "AMD",
    category: "graphics-cards",
    price: 649.99,
    description1: "High-performance GPU for 1440p gaming excellence",
    description2: "Features RDNA 3 architecture with enhanced ray tracing",
    images: [
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500"
    ],
    specs: new Map([
      ["Stream Processors", "3840"],
      ["Memory", "16GB GDDR6"],
      ["Memory Interface", "256-bit"],
      ["Game Clock", "2124 MHz"],
      ["TDP", "263W"]
    ]),
    badge: {
      text: "RDNA 3",
      color: "bg-red-500"
    },
    inStock: true
  },

  // Motherboards
  {
    name: "ASUS ROG Strix X670E-E Gaming",
    brand: "ASUS",
    category: "motherboards",
    price: 449.99,
    description1: "Premium X670E motherboard for AMD Ryzen 7000 series",
    description2: "Features DDR5, PCIe 5.0, and comprehensive connectivity",
    images: [
      "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=500"
    ],
    specs: new Map([
      ["Socket", "AM5"],
      ["Chipset", "AMD X670E"],
      ["Memory", "DDR5-6000+ (OC)"],
      ["PCIe Slots", "PCIe 5.0 x16"],
      ["Form Factor", "ATX"]
    ]),
    badge: {
      text: "ROG",
      color: "bg-purple-500"
    },
    inStock: true
  },

  // Memory (RAM)
  {
    name: "Corsair Vengeance DDR5-5600 32GB",
    brand: "Corsair",
    category: "memory",
    price: 189.99,
    originalPrice: 219.99,
    description1: "High-speed DDR5 memory kit for extreme performance",
    description2: "Optimized for Intel and AMD platforms with enhanced latencies",
    images: [
      "https://images.unsplash.com/photo-1562408590-e32931084e23?w=500"
    ],
    specs: new Map([
      ["Capacity", "32GB (2x16GB)"],
      ["Speed", "DDR5-5600"],
      ["Timings", "CL36-36-36-76"],
      ["Voltage", "1.25V"],
      ["Profile", "Intel XMP 3.0"]
    ]),
    badge: {
      text: "High Speed",
      color: "bg-yellow-500"
    },
    inStock: true
  },

  // Storage
  {
    name: "Samsung 980 PRO 2TB NVMe SSD",
    brand: "Samsung",
    category: "storage",
    price: 159.99,
    originalPrice: 199.99,
    description1: "Ultra-fast PCIe 4.0 NVMe SSD for demanding applications",
    description2: "Delivers exceptional performance for gaming and professional workloads",
    images: [
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500"
    ],
    specs: new Map([
      ["Capacity", "2TB"],
      ["Interface", "PCIe 4.0 x4"],
      ["Sequential Read", "7,000 MB/s"],
      ["Sequential Write", "6,900 MB/s"],
      ["Form Factor", "M.2 2280"]
    ]),
    badge: {
      text: "PCIe 4.0",
      color: "bg-indigo-500"
    },
    inStock: true
  },

  // Cooling
  {
    name: "Noctua NH-D15 CPU Cooler",
    brand: "Noctua",
    category: "cooling",
    price: 109.99,
    description1: "Premium dual-tower CPU cooler with exceptional cooling performance",
    description2: "Renowned for its quiet operation and superior build quality",
    images: [
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500"
    ],
    specs: new Map([
      ["Type", "Air Cooler"],
      ["Height", "165mm"],
      ["Fans", "2x NF-A15 PWM"],
      ["TDP", "250W+"],
      ["Socket Support", "Intel & AMD"]
    ]),
    badge: {
      text: "Premium",
      color: "bg-amber-600"
    },
    inStock: true
  },

  // Power Supplies
  {
    name: "Seasonic Focus GX-850 80+ Gold",
    brand: "Seasonic",
    category: "power-supplies",
    price: 149.99,
    description1: "Fully modular 850W power supply with 80 PLUS Gold efficiency",
    description2: "Reliable power delivery with premium Japanese capacitors",
    images: [
      "https://images.unsplash.com/photo-1562408590-e32931084e23?w=500"
    ],
    specs: new Map([
      ["Wattage", "850W"],
      ["Efficiency", "80 PLUS Gold"],
      ["Modular", "Fully Modular"],
      ["Warranty", "10 Years"],
      ["Fan", "120mm FDB Fan"]
    ]),
    badge: {
      text: "Gold",
      color: "bg-yellow-600"
    },
    inStock: true
  },

  // Cases
  {
    name: "Fractal Design Define 7 Compact",
    brand: "Fractal Design",
    category: "cases",
    price: 129.99,
    description1: "Compact mid-tower case with excellent build quality",
    description2: "Features sound dampening and excellent airflow design",
    images: [
      "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=500"
    ],
    specs: new Map([
      ["Form Factor", "Mid Tower"],
      ["Motherboard", "ATX, mATX, ITX"],
      ["GPU Length", "315mm"],
      ["CPU Height", "169mm"],
      ["Drive Bays", "2x 3.5\", 3x 2.5\""]
    ]),
    badge: {
      text: "Compact",
      color: "bg-gray-600"
    },
    inStock: true
  }
];

const sampleUsers = [
  {
    name: "Admin User",
    email: "admin@empress.com",
    password: "admin123",
    isAdmin: true
  },
  {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    address: "123 Main St, City, State",
    phone: "+1234567890",
    isAdmin: false
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "password123",
    address: "456 Oak Ave, City, State",
    phone: "+1234567891",
    isAdmin: false
  }
];

const importData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Product.deleteMany();
    await User.deleteMany();

    console.log('Data cleared successfully');

    // Insert sample data
    await User.insertMany(sampleUsers);
    await Product.insertMany(sampleProducts);

    console.log('Sample data imported successfully');
    process.exit();
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();

    await Product.deleteMany();
    await User.deleteMany();

    console.log('Data destroyed successfully');
    process.exit();
  } catch (error) {
    console.error('Error destroying data:', error);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}