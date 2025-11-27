import fetch from "node-fetch";
import mongoose from "mongoose";

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  MONGO_URI: 'mongodb+srv://yashgupta:R6pYIL0W1kUjzdrZ@empress19june.5ddonlm.mongodb.net/',
  API_BASE_URL: 'http://localhost:5000/api',
  ADMIN_EMAIL: 'admin@example.com', // CHANGE THIS TO YOUR ADMIN EMAIL
  ADMIN_PASSWORD: 'your-admin-password', // CHANGE THIS TO YOUR ADMIN PASSWORD
  DELAY_BETWEEN_UPLOADS: 1000
};

// Complete blog data with valid categories (nvidia, tech, computing, mobile, gadget, technology, news, design, ai, article)
const COMPLETE_BLOG_DATA = [
  // ARTICLES (8)
  {
    title: "PC vs. Console: Which Is the Best Choice for Gamers in 2025?",
    summary: "The gaming world has always been divided between two major platforms: PC and consoles. Both platforms offer unique advantages, but which one suits your gaming style?",
    content: `The gaming world has always been divided between two major platforms: PC and consoles. In 2025, the debate over which is the best choice for gamers remains as heated as ever.

# Performance: Raw Power and Customization

When it comes to raw performance, the PC has a clear advantage. PCs offer far more powerful hardware options, including high-end processors, graphics cards, and additional RAM, which can be upgraded as new technology becomes available.

# Cost Considerations

While consoles offer a more affordable entry point, PC gaming can be more cost-effective in the long run due to cheaper games and free online multiplayer.

# Game Library and Exclusives

Both platforms have their exclusive titles, but PC has access to the largest game library including indie games, mods, and backward compatibility.

# Online Services and Communities

PC offers free online multiplayer and vibrant modding communities, while consoles provide polished online services and exclusive social features.

# Final Verdict

Choose PC if you prioritize maximum performance, customization, and the largest game library. Choose console if you prefer plug-and-play simplicity and exclusive titles.`,
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
    category: "tech",
    type: "article",
    tags: ["pc", "console", "comparison", "performance"],
    readTime: "8 mins",
    isPublished: true,
    isFeatured: true
  },
  {
    title: "How to Choose the Perfect Gaming PC: Complete 2025 Buyer's Guide",
    summary: "Building or buying a gaming PC can be overwhelming with so many options available. This comprehensive guide will help you make the right choice for your needs and budget.",
    content: `Building or buying a gaming PC can be overwhelming with so many options available. This comprehensive guide will help you make the right choice for your needs and budget.

# Define Your Gaming Needs

Before diving into specifications, consider what type of games you play and at what resolution and frame rate you want to play them.

# Essential Components Guide

## Graphics Card (GPU)
The most important component for gaming performance. Choose based on your target resolution and frame rate.

## Processor (CPU)
While the GPU handles graphics, the CPU manages game logic and system operations.

## Memory (RAM)
16GB is the sweet spot for modern gaming, with 32GB becoming more common for enthusiasts.

## Storage Solutions
SSDs are essential for fast load times and smooth gameplay. Consider NVMe drives for maximum speed.

# Budget Planning

Set a realistic budget and prioritize components that matter most for your gaming preferences and future upgrade path.`,
    image: "https://images.unsplash.com/photo-1591238372338-2c9e8eac3de6?w=800",
    category: "computing",
    type: "article",
    tags: ["pc", "hardware", "guide", "components"],
    readTime: "12 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "NVIDIA RTX 50 Series: Complete Price Analysis and Performance Review",
    summary: "The NVIDIA RTX 50 series has arrived with impressive performance gains. Let's analyze the pricing strategy and what it means for gamers and content creators.",
    content: `The NVIDIA RTX 50 series has arrived with impressive performance gains. Let's analyze the pricing strategy and what it means for gamers and content creators.

# RTX 50 Series Lineup Overview

The new generation brings significant improvements in ray tracing performance and AI-accelerated features across all price points.

# Price vs Performance Analysis

While prices have increased compared to previous generations, the performance per dollar remains competitive when considering the new features and capabilities.

# Target Market Segments

Different SKUs target different market segments, from budget-conscious gamers to professional content creators and AI researchers.

# Competitive Landscape

How the RTX 50 series stacks up against AMD's latest offerings and what this means for the GPU market competition.

# Purchase Recommendations

Our detailed recommendations for which RTX 50 series card to buy based on your specific needs, budget, and use cases.`,
    image: "https://images.unsplash.com/photo-1591405351990-4726e331f141?w=800",
    category: "nvidia",
    type: "article",
    tags: ["nvidia", "rtx", "gpu", "pricing"],
    readTime: "10 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Mastering PC Overclocking: Boost Your Gaming Performance Safely",
    summary: "Overclocking can unlock hidden performance in your gaming PC. Learn the safe and effective methods to overclock your CPU and GPU for maximum gaming performance.",
    content: `Overclocking can unlock hidden performance in your gaming PC. Learn the safe and effective methods to overclock your CPU and GPU for maximum gaming performance.

# Understanding Overclocking Basics

Overclocking involves running your hardware at higher speeds than factory specifications to gain extra performance without buying new components.

# CPU Overclocking Guide

Start with small increments and stress test thoroughly to ensure stability. Monitor temperatures and voltages carefully throughout the process.

# GPU Overclocking Methods

Modern graphics cards have excellent overclocking headroom with proper cooling. Use tools like MSI Afterburner for best results.

# Memory Overclocking

RAM overclocking can provide significant performance gains, especially for AMD Ryzen systems and memory-intensive applications.

# Safety Precautions and Best Practices

Temperature monitoring, gradual increases, and comprehensive stability testing are key to safe overclocking that won't damage your components.`,
    image: "https://images.unsplash.com/photo-1518646260708-c6b0c50bb816?w=800",
    category: "technology",
    type: "article",
    tags: ["overclocking", "performance", "cpu", "gpu"],
    readTime: "15 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Zotac RTX 50 Series Bundle: Get DOOM The Dark Ages Premium Edition FREE",
    summary: "Incredible bundle alert! Purchase any Zotac RTX 50 series GPU and receive DOOM: The Dark Ages Premium Edition at no extra cost. Limited time offer for serious gamers.",
    content: `Incredible bundle alert! Purchase any Zotac RTX 50 series GPU and receive DOOM: The Dark Ages Premium Edition at no extra cost.

# The Perfect Hardware-Software Combo

This bundle combines cutting-edge RTX 50 series hardware with one of the most anticipated FPS games of the year.

# What's Included in Premium Edition

The Premium Edition includes exclusive content, season pass, early access, digital soundtrack, and special in-game items worth $120.

# Zotac RTX 50 Series Features

Enhanced cooling solutions, factory overclocks, and RGB lighting make Zotac cards stand out from the competition.

# Limited Time Promotion Details

This promotion won't last long, so gamers should act fast to secure this incredible value proposition while supplies last.

# How to Claim Your Free Game

Step-by-step instructions for redeeming your free copy of DOOM: The Dark Ages Premium Edition through Zotac's portal.`,
    image: "https://images.unsplash.com/photo-1556438064-2d7646166914?w=800",
    category: "gadget",
    type: "article",
    tags: ["zotac", "rtx", "bundle", "offer"],
    readTime: "6 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "GTA 6 Release Update: Everything We Know About the Most Anticipated Game",
    summary: "The most anticipated game of the decade is finally approaching. Here's everything we know about GTA 6's release date, features, and what to expect from Rockstar's masterpiece.",
    content: `The most anticipated game of the decade is finally approaching. Here's everything we know about GTA 6's release date, features, and what to expect from Rockstar's masterpiece.

# Current Release Timeline

Based on official announcements and industry insider information, here's the most up-to-date information about the release window.

# Revolutionary New Features

Enhanced graphics engine, improved physics simulation, and revolutionary gameplay mechanics that will redefine open-world gaming forever.

# Platform Availability and System Requirements

Initially targeting next-gen consoles and PC, with specific system requirements and recommended hardware configurations for optimal performance.

# Story and Setting Details

What we know about the game's narrative, characters, and the highly anticipated return to Vice City with modern enhancements.

# Pre-order Information and Editions

Complete details about different game editions, pre-order bonuses, and what's included in each package tier.`,
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800",
    category: "news",
    type: "article",
    tags: ["gta6", "rockstar", "release", "preview"],
    readTime: "8 mins",
    isPublished: true,
    isFeatured: true
  },
  {
    title: "AI-Powered Gaming: How Machine Learning is Revolutionizing Game Development",
    summary: "Artificial Intelligence is transforming every aspect of game development, from procedural content generation to intelligent NPCs. Discover how AI is shaping the future of gaming.",
    content: `Artificial Intelligence is transforming every aspect of game development, from procedural content generation to intelligent NPCs. Discover how AI is shaping the future of gaming.

# Procedural Content Generation

AI algorithms can now create vast, detailed game worlds automatically, reducing development time while increasing variety and replayability.

# Intelligent Non-Player Characters

Modern AI creates NPCs that can learn, adapt, and respond to player behavior in realistic and unpredictable ways.

# Dynamic Difficulty Adjustment

Machine learning algorithms analyze player performance in real-time and adjust game difficulty to maintain optimal challenge levels.

# AI-Assisted Development Tools

Developers now use AI tools for animation, texturing, and even code generation, dramatically speeding up the development process.

# The Future of AI Gaming

What we can expect from AI in gaming over the next decade, including fully procedural games and AI-driven storytelling.`,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    category: "ai",
    type: "article",
    tags: ["ai", "machine learning", "game development", "future"],
    readTime: "11 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Mobile Gaming Revolution: Flagship Smartphones vs Gaming Phones",
    summary: "Mobile gaming has evolved dramatically. Should you choose a flagship smartphone or a dedicated gaming phone? We compare performance, features, and value.",
    content: `Mobile gaming has evolved dramatically, with both flagship smartphones and dedicated gaming phones offering impressive performance. Let's compare your options.

# Flagship Smartphones for Gaming

Premium phones like iPhone 15 Pro and Samsung Galaxy S24 Ultra offer excellent gaming performance with balanced features for daily use.

# Dedicated Gaming Phones

Specialized devices like ASUS ROG Phone and RedMagic series prioritize gaming performance above all else.

# Performance Comparison

Benchmarks, real-world gaming tests, and thermal management comparison between different device categories.

# Unique Gaming Features

Gaming phones offer features like shoulder buttons, advanced cooling, and gaming-specific software optimizations.

# Value Proposition Analysis

Which type of device offers better value depends on your specific needs and usage patterns beyond gaming.`,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
    category: "mobile",
    type: "article",
    tags: ["mobile gaming", "smartphones", "performance", "comparison"],
    readTime: "9 mins",
    isPublished: true,
    isFeatured: false
  },

  // BLOGS (10)
  {
    title: "Mortal Kombat Championship: Epic Tournament Highlights and Results",
    summary: "The latest Mortal Kombat tournament delivered incredible matches and surprising upsets. Catch up on all the action, results, and standout moments from this epic fighting game event.",
    content: `The latest Mortal Kombat tournament delivered incredible matches and surprising upsets. Catch up on all the action, results, and standout moments from this epic fighting game event.

# Tournament Format and Participants

The competition featured 64 of the world's best Mortal Kombat players battling through multiple elimination rounds over three intense days.

# Biggest Surprises and Upsets

Several veteran champions were eliminated early, while newcomers made impressive deep runs that surprised everyone in the community.

# Most Memorable Matches

Incredible comebacks, perfect rounds, and clutch victories had the crowd on their feet throughout the weekend tournament.

# Prize Pool and Recognition

Details about the substantial prize distribution and special recognition for top performers across all competitive categories.`,
    image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800",
    category: "tech",
    type: "blog",
    tags: ["tournament", "esports", "fighting", "competition"],
    readTime: "5 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "NVIDIA Developer Conference 2025: AI and Next-Gen Graphics Unveiled",
    summary: "NVIDIA's latest developer conference showcased groundbreaking AI technologies and next-generation graphics features. Discover the innovations shaping the future of computing.",
    content: `NVIDIA's latest developer conference showcased groundbreaking AI technologies and next-generation graphics features. Discover the innovations shaping the future of computing.

# Revolutionary AI Breakthroughs

New AI accelerators and frameworks promise to revolutionize machine learning workflows and creative applications across industries.

# Next-Generation Graphics Technology

Advanced ray tracing improvements, DLSS enhancements, and new rendering techniques deliver unprecedented visual quality and performance.

# Developer Tools and Platforms

Enhanced development environments make it easier than ever to create cutting-edge applications and immersive experiences.

# Industry Partnerships and Collaborations

Major announcements about strategic partnerships with leading technology companies, game studios, and research institutions.`,
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800",
    category: "nvidia",
    type: "blog",
    tags: ["nvidia", "ai", "conference", "technology"],
    readTime: "7 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Colorful Tech Showcase: Latest GPU Innovations and Design Excellence",
    summary: "Colorful Technology presented their newest lineup of graphics cards and tech accessories. Explore the innovative designs and performance features of their latest products.",
    content: `Colorful Technology presented their newest lineup of graphics cards and tech accessories. Explore the innovative designs and performance features of their latest products.

# New Graphics Card Lineup

The latest GPU offerings feature impressive cooling solutions, factory overclocks, and unique aesthetic designs that stand out in the market.

# Gaming Accessories Expansion

Colorful's venture into peripherals brings their signature design philosophy to keyboards, mice, headsets, and other gaming equipment.

# Innovation in Cooling Technology

Advanced thermal solutions that keep high-performance components running cool and quiet under heavy gaming and workstation loads.

# Market Positioning and Global Availability

How Colorful is positioning these products in the competitive market and information about regional availability and pricing.`,
    image: "https://images.unsplash.com/photo-1541746972996-4e0b0f93e586?w=800",
    category: "gadget",
    type: "blog",
    tags: ["colorful", "gpu", "design", "accessories"],
    readTime: "6 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Build Your Power-Packed Gaming PC: Ultimate 2025 Component Guide",
    summary: "Ready to build the ultimate gaming machine? This guide covers everything you need to create a power-packed PC that can handle any game at maximum settings.",
    content: `Ready to build the ultimate gaming machine? This guide covers everything you need to create a power-packed PC that can handle any game at maximum settings.

# High-Performance Component Selection

Choosing the right combination of CPU, GPU, RAM, and storage for maximum gaming performance and future-proofing your investment.

# Advanced Cooling Solutions

Proper thermal management ensures your high-end components perform at their peak potential while maintaining longevity.

# Cable Management and Aesthetics

Building a PC that not only performs excellently but also looks professional with proper cable routing and lighting.

# Future-Proofing Strategies

Building with upgradeability in mind helps extend your PC's lifespan and maintains top-tier performance for years to come.`,
    image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800",
    category: "computing",
    type: "blog",
    tags: ["pc building", "components", "performance", "guide"],
    readTime: "9 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Dream PC Build: Creating the Ultimate Gaming and Creative Workstation",
    summary: "Imagine a PC with unlimited budget - what would it look like? We explore the ultimate dream PC build that combines the best gaming performance with professional creative capabilities.",
    content: `Imagine a PC with unlimited budget - what would it look like? We explore the ultimate dream PC build that combines the best gaming performance with professional creative capabilities.

# No-Compromise Component Selection

The finest processors, graphics cards, memory, and storage money can buy, carefully selected for maximum performance synergy.

# Premium Aesthetics and Craftsmanship

Custom cooling loops, premium RGB lighting, and the finest materials create a stunning visual masterpiece worthy of any setup.

# Dual-Purpose Design Philosophy

Optimized for both gaming excellence and professional content creation workflows, handling any task you throw at it.

# Investment Analysis

While expensive, this dream build represents the pinnacle of current technology and future-proof performance capabilities.`,
    image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800",
    category: "design",
    type: "blog",
    tags: ["dream pc", "high-end", "workstation", "premium"],
    readTime: "7 mins",
    isPublished: true,
    isFeatured: true
  },
  {
    title: "Latest Technology Trends: What's Shaping the Tech Industry in 2025",
    summary: "From AI breakthroughs to quantum computing advances, 2025 is proving to be a transformative year for technology. Here are the trends defining our digital future.",
    content: `From AI breakthroughs to quantum computing advances, 2025 is proving to be a transformative year for technology. Here are the trends defining our digital future.

# Artificial Intelligence Revolution

AI continues to advance rapidly, with new applications in healthcare, education, creative industries, and everyday consumer products.

# Quantum Computing Progress

Major breakthroughs in quantum computing are bringing us closer to practical applications that could revolutionize various industries.

# Sustainable Technology Focus

Green technology and sustainable computing solutions are becoming priority focus areas for major tech companies worldwide.

# Extended Reality (XR) Adoption

Virtual and augmented reality technologies are finally reaching mainstream adoption in both consumer and enterprise markets.`,
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800",
    category: "technology",
    type: "blog",
    tags: ["technology", "trends", "innovation", "future"],
    readTime: "8 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Breaking Tech News: Major Industry Announcements and Updates",
    summary: "Stay updated with the latest happenings in the tech world. From major product launches to industry acquisitions, here's what's making headlines this week.",
    content: `Stay updated with the latest happenings in the tech world. From major product launches to industry acquisitions, here's what's making headlines this week.

# Major Product Launches

Several tech giants have announced significant product updates and launches that could reshape their respective market segments.

# Industry Acquisitions and Mergers

Strategic business moves in the tech industry that could have long-term implications for consumers and competitors.

# Regulatory and Policy Updates

Important regulatory changes and policy decisions affecting the technology sector and digital privacy landscape.

# Market Analysis and Implications

What these developments mean for investors, consumers, and the broader technology ecosystem moving forward.`,
    image: "https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=800",
    category: "news",
    type: "blog",
    tags: ["tech news", "industry", "updates", "analysis"],
    readTime: "6 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "AI Innovation Spotlight: Machine Learning Applications Changing Industries",
    summary: "Artificial Intelligence is transforming industries at an unprecedented pace. Explore the most impactful AI applications and innovations making real-world differences today.",
    content: `Artificial Intelligence is transforming industries at an unprecedented pace. Explore the most impactful AI applications and innovations making real-world differences today.

# Healthcare AI Breakthroughs

Machine learning is revolutionizing medical diagnosis, drug discovery, and personalized treatment plans with remarkable accuracy improvements.

# AI in Creative Industries

From music composition to digital art generation, AI tools are becoming powerful creative partners for artists and content creators.

# Autonomous Systems Development

Self-driving vehicles, autonomous drones, and robotic systems are reaching new levels of sophistication and real-world deployment.

# AI Ethics and Responsible Development

The importance of developing AI systems with built-in ethical considerations and transparency for sustainable progress.`,
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800",
    category: "ai",
    type: "blog",
    tags: ["ai innovation", "machine learning", "applications", "industry"],
    readTime: "10 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Mobile Technology Evolution: Smartphones and Beyond in 2025",
    summary: "Mobile technology continues to evolve rapidly. From foldable displays to 5G capabilities, discover how smartphones and mobile devices are advancing in 2025.",
    content: `Mobile technology continues to evolve rapidly. From foldable displays to advanced AI capabilities, discover how smartphones and mobile devices are advancing in 2025.

# Next-Generation Display Technology

Foldable screens, higher refresh rates, and improved outdoor visibility are setting new standards for mobile displays.

# 5G and Connectivity Advances

Enhanced 5G networks and new connectivity standards are enabling new mobile experiences and applications.

# Mobile AI and Computational Photography

On-device AI processing is revolutionizing photography, video recording, and real-time image enhancement capabilities.

# Battery and Charging Innovations

New battery technologies and ultra-fast charging solutions are addressing the biggest pain points of mobile device usage.`,
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800",
    category: "mobile",
    type: "blog",
    tags: ["mobile technology", "smartphones", "innovation", "evolution"],
    readTime: "8 mins",
    isPublished: true,
    isFeatured: false
  },
  {
    title: "Design Trends 2025: UI/UX Innovations Shaping Digital Experiences",
    summary: "User interface and experience design continues to evolve. Explore the latest design trends and innovations that are shaping how we interact with digital products.",
    content: `User interface and experience design continues to evolve. Explore the latest design trends and innovations that are shaping how we interact with digital products.

# Minimalist and Clean Interfaces

The trend toward simplified, clean designs that prioritize functionality and user focus over decorative elements.

# Dark Mode and Accessibility

Enhanced dark mode implementations and improved accessibility features are becoming standard rather than optional.

# Micro-Interactions and Animation

Subtle animations and micro-interactions that enhance user experience without being distracting or overwhelming.

# Voice and Gesture Interfaces

Alternative input methods are becoming more sophisticated and integrated into mainstream digital experiences.`,
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    category: "design",
    type: "blog",
    tags: ["design trends", "ui ux", "digital experience", "innovation"],
    readTime: "7 mins",
    isPublished: true,
    isFeatured: false
  }
];

// Helper functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectToMongoDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(CONFIG.MONGO_URI);
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

async function deleteAllBlogs() {
  try {
    console.log('🗑️  Deleting ALL existing blogs and articles...');
    const db = mongoose.connection.db;
    const result = await db.collection('blogs').deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} existing blogs/articles`);
  } catch (error) {
    console.error('❌ Failed to delete existing blogs:', error.message);
    throw error;
  }
}

async function authenticate() {
  try {
    console.log('🔐 Authenticating admin user...');
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: CONFIG.ADMIN_EMAIL,
        password: CONFIG.ADMIN_PASSWORD
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed');
    }

    console.log('✅ Authentication successful');
    return data.token;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

async function uploadBlog(blogData, token, index) {
  try {
    console.log(`📝 Uploading ${index + 1}/${COMPLETE_BLOG_DATA.length}: "${blogData.title}"`);
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/admin/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(blogData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    console.log(`✅ Success: "${blogData.title}" (${blogData.type}) - Category: ${blogData.category}`);
    return { success: true, blog: data.data };
  } catch (error) {
    console.error(`❌ Failed: "${blogData.title}": ${error.message}`);
    return { success: false, error: error.message, title: blogData.title };
  }
}

async function main() {
  console.log('🚀 Starting COMPLETE FRESH blog upload process...');
  console.log(`📊 Total blogs to upload: ${COMPLETE_BLOG_DATA.length}`);
  console.log(`📄 Articles: ${COMPLETE_BLOG_DATA.filter(b => b.type === 'article').length}`);
  console.log(`📝 Blogs: ${COMPLETE_BLOG_DATA.filter(b => b.type === 'blog').length}`);
  
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Delete ALL existing blogs
    await deleteAllBlogs();
    
    // Authenticate
    const token = await authenticate();
    
    // Upload all fresh blogs
    console.log('\n📤 Starting fresh uploads...');
    const results = {
      successful: [],
      failed: []
    };
    
    for (let i = 0; i < COMPLETE_BLOG_DATA.length; i++) {
      const result = await uploadBlog(COMPLETE_BLOG_DATA[i], token, i);
      
      if (result.success) {
        results.successful.push(result.blog);
      } else {
        results.failed.push(result);
      }
      
      // Add delay between uploads
      if (i < COMPLETE_BLOG_DATA.length - 1) {
        await delay(CONFIG.DELAY_BETWEEN_UPLOADS);
      }
    }
    
    // Final Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 FINAL UPLOAD SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful uploads: ${results.successful.length}`);
    console.log(`❌ Failed uploads: ${results.failed.length}`);
    
    if (results.successful.length > 0) {
      console.log('\n✅ Successfully uploaded:');
      const articles = results.successful.filter(b => b.type === 'article');
      const blogs = results.successful.filter(b => b.type === 'blog');
      
      console.log(`\n📄 ARTICLES (${articles.length}):`);
      articles.forEach(blog => {
        console.log(`   • "${blog.title}" [${blog.category}]`);
      });
      
      console.log(`\n📝 BLOGS (${blogs.length}):`);
      blogs.forEach(blog => {
        console.log(`   • "${blog.title}" [${blog.category}]`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed uploads:');
      results.failed.forEach(failure => {
        console.log(`   • "${failure.title}": ${failure.error}`);
      });
    }
    
    console.log('\n🎉 Fresh blog upload process completed successfully!');
    console.log('🌐 Your website now has completely fresh content!');
    
  } catch (error) {
    console.error('\n💥 Upload process failed:', error.message);
    console.error('\n🔧 Troubleshooting checklist:');
    console.error('   1. ✓ MongoDB connection working');
    console.error('   2. ✓ Admin credentials correct');
    console.error('   3. ✓ API server running on correct port');
    console.error('   4. ✓ Categories match database schema');
    console.error('   5. ✓ Network connectivity stable');
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Execute the script
main().catch(error => {
  console.error('💥 Script execution failed:', error);
  process.exit(1);
});