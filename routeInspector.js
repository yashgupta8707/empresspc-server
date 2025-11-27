// routeInspector.js - Find the problematic route
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read all route files and extract route definitions
const routesDir = path.join(__dirname, 'routes');

function extractRoutes(content, filename) {
  const routes = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Match route definitions
    const routeMatch = line.match(/router\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (routeMatch) {
      const method = routeMatch[1];
      const path = routeMatch[2];
      routes.push({
        file: filename,
        line: index + 1,
        method: method.toUpperCase(),
        path: path,
        fullLine: line.trim()
      });
    }
  });
  
  return routes;
}

function checkRoutePattern(route) {
  const issues = [];
  const path = route.path;
  
  // Check for common problematic patterns
  if (path.includes('$')) {
    issues.push('Contains $ character');
  }
  
  if (path.includes('{') || path.includes('}')) {
    issues.push('Contains curly braces (use :param instead)');
  }
  
  if (path.includes('[') || path.includes(']')) {
    issues.push('Contains square brackets');
  }
  
  if (path.match(/:\s*[^a-zA-Z]/)) {
    issues.push('Malformed parameter (: followed by non-letter)');
  }
  
  if (path.match(/:\w*:/)) {
    issues.push('Multiple consecutive colons');
  }
  
  if (path.includes('//')) {
    issues.push('Double slashes in path');
  }
  
  // Check for missing parameter names
  if (path.includes(':') && path.match(/:[^a-zA-Z0-9_]/)) {
    issues.push('Invalid parameter name');
  }
  
  // Check for ending with special characters
  if (path.match(/[^a-zA-Z0-9_\-\/\*]$/)) {
    issues.push('Ends with special character');
  }
  
  return issues;
}

async function inspectAllRoutes() {
  console.log('🔍 Inspecting all route files for problematic patterns...\n');
  
  try {
    const files = fs.readdirSync(routesDir);
    const routeFiles = files.filter(file => file.endsWith('.js'));
    
    let allRoutes = [];
    let hasIssues = false;
    
    for (const file of routeFiles) {
      console.log(`📁 Analyzing ${file}...`);
      
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const routes = extractRoutes(content, file);
      
      allRoutes = allRoutes.concat(routes);
      
      routes.forEach(route => {
        const issues = checkRoutePattern(route);
        if (issues.length > 0) {
          hasIssues = true;
          console.log(`  ❌ ${route.method} ${route.path} (Line ${route.line})`);
          issues.forEach(issue => {
            console.log(`     ⚠️  ${issue}`);
          });
          console.log(`     Code: ${route.fullLine}`);
        }
      });
      
      if (routes.filter(r => checkRoutePattern(r).length > 0).length === 0) {
        console.log(`  ✅ No issues found (${routes.length} routes checked)`);
      }
      
      console.log('');
    }
    
    // Check for route conflicts
    console.log('🔄 Checking for route conflicts...\n');
    
    const routeGroups = {};
    allRoutes.forEach(route => {
      const key = `${route.method}:${route.path}`;
      if (!routeGroups[key]) {
        routeGroups[key] = [];
      }
      routeGroups[key].push(route);
    });
    
    Object.keys(routeGroups).forEach(key => {
      if (routeGroups[key].length > 1) {
        console.log(`⚠️  Duplicate route: ${key}`);
        routeGroups[key].forEach(route => {
          console.log(`   - ${route.file}:${route.line}`);
        });
        console.log('');
      }
    });
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   Total routes found: ${allRoutes.length}`);
    console.log(`   Files analyzed: ${routeFiles.length}`);
    console.log(`   Issues found: ${hasIssues ? 'YES' : 'NO'}`);
    
    if (!hasIssues) {
      console.log('\n💡 No obvious route pattern issues found.');
      console.log('   The issue might be in:');
      console.log('   1. Middleware setup after routes');
      console.log('   2. Error handling middleware');
      console.log('   3. Express app configuration');
    }
    
  } catch (error) {
    console.error('❌ Error inspecting routes:', error);
  }
}

inspectAllRoutes();