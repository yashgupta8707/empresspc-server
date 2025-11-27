// routeCleaner.js - Clean up duplicate routes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.join(__dirname, 'routes');

// Routes that should be unique to specific files
const routeOwnership = {
  // Product routes
  'GET:/': 'productRoutes.js',
  'GET:/featured': 'productRoutes.js', 
  'GET:/categories': 'productRoutes.js',
  'GET:/category/:categoryId': 'productRoutes.js',
  'GET:/public/:id': 'productRoutes.js',
  'GET:/details/:id': 'productRoutes.js',
  'GET:/:id': 'productRoutes.js',
  'GET:/admin/all': 'productRoutes.js',
  'POST:/admin/create': 'productRoutes.js',
  'GET:/admin/stats': 'productRoutes.js',
  'GET:/admin/:id': 'productRoutes.js',
  'PUT:/admin/:id': 'productRoutes.js',
  'DELETE:/admin/:id': 'productRoutes.js',
  
  // Order routes
  'POST:/': 'orderRoutes.js',
  
  // Contact routes - keep the POST
  // We'll rename the order POST to be more specific
};

function cleanRouteFile(filePath, filename) {
  console.log(`🔧 Cleaning ${filename}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const cleanedLines = [];
    const seenRoutes = new Set();
    let removedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line contains a route definition
      const routeMatch = line.match(/router\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/);
      
      if (routeMatch) {
        const method = routeMatch[1].toUpperCase();
        const routePath = routeMatch[2];
        const routeKey = `${method}:${routePath}`;
        
        // Check if this route should belong to this file
        const owner = routeOwnership[routeKey];
        if (owner && owner !== filename) {
          console.log(`  ❌ Removing ${routeKey} (belongs to ${owner})`);
          removedCount++;
          continue; // Skip this line
        }
        
        // Check if we've already seen this route in this file
        if (seenRoutes.has(routeKey)) {
          console.log(`  ❌ Removing duplicate ${routeKey}`);
          removedCount++;
          continue; // Skip this line
        }
        
        seenRoutes.add(routeKey);
      }
      
      cleanedLines.push(line);
    }
    
    if (removedCount > 0) {
      // Write the cleaned content back to the file
      const backupPath = filePath + '.backup';
      fs.writeFileSync(backupPath, content); // Create backup
      fs.writeFileSync(filePath, cleanedLines.join('\n'));
      console.log(`  ✅ Removed ${removedCount} duplicate/misplaced routes`);
      console.log(`  💾 Backup saved as ${filename}.backup`);
    } else {
      console.log(`  ✅ No duplicates found`);
    }
    
  } catch (error) {
    console.error(`  ❌ Error cleaning ${filename}:`, error.message);
  }
}

function cleanAllRoutes() {
  console.log('🧹 Starting route cleanup...\n');
  
  try {
    const files = fs.readdirSync(routesDir);
    const routeFiles = files.filter(file => file.endsWith('.js') && !file.endsWith('.backup'));
    
    // Special handling for files with many duplicates
    const problemFiles = [
      'productRoutes.js',
      'blogRoutes.js', 
      'eventRoutes.js',
      'winnerRoutes.js',
      'aboutRoutes.js'
    ];
    
    problemFiles.forEach(filename => {
      if (routeFiles.includes(filename)) {
        const filePath = path.join(routesDir, filename);
        cleanRouteFile(filePath, filename);
        console.log('');
      }
    });
    
    console.log('✅ Route cleanup completed!');
    console.log('\n📋 Manual fixes needed:');
    console.log('1. Check orderRoutes.js - change POST:/ to POST:/create');
    console.log('2. Review each route file to ensure they only contain relevant routes');
    console.log('3. Remove any remaining generic routes from non-product files');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanAllRoutes();