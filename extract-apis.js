import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CleanAPIExtractor {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:3000';
        this.outputFile = options.outputFile || 'clean-api-documentation.json';
        this.apis = [];
        this.routePrefix = new Map(); // To track route prefixes from app.use()
    }

    // Main extraction method
    extractAPIs() {
        console.log('🧹 Starting clean API extraction...');
        
        // Scan route files
        this.scanRouteFiles();
        
        // Clean and deduplicate
        this.cleanAndDeduplicateAPIs();
        
        console.log(`✨ Found ${this.apis.length} clean API endpoints`);
        return this.apis;
    }

    scanRouteFiles() {
        const routesDir = './routes';
        const serverFiles = ['./server.js', './app.js', './index.js', './minimal-server.js'];
        
        // Scan routes directory
        if (fs.existsSync(routesDir)) {
            const routeFiles = this.getJSFiles(routesDir);
            routeFiles.forEach(file => this.parseRouteFile(file));
        }
        
        // Scan main server files
        serverFiles.forEach(file => {
            if (fs.existsSync(file)) {
                this.parseServerFile(file);
            }
        });
    }

    parseRouteFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath, '.js');
        const relativePath = path.relative(process.cwd(), filePath);
        
        // Extract route prefix from filename (e.g., 'userRoutes.js' -> '/users')
        let routePrefix = this.guessRoutePrefix(fileName);
        
        // Patterns for Express route definitions
        const routePatterns = [
            // router.get('/path', handler)
            /router\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
            // app.get('/path', handler) 
            /app\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g
        ];

        routePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const method = match[1].toUpperCase();
                const route = match[2];
                
                // Skip if route looks like a variable or doesn't start with /
                if (this.isValidRoute(route)) {
                    const fullPath = this.buildFullPath(routePrefix, route);
                    
                    this.apis.push({
                        method,
                        path: fullPath,
                        fullUrl: `${this.baseUrl}${fullPath}`,
                        file: relativePath,
                        routeFile: fileName,
                        description: this.extractDescription(content, match.index)
                    });
                }
            }
        });
    }

    parseServerFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        
        // Look for app.use() statements that mount routes
        const usePatterns = [
            // app.use('/api/users', userRoutes)
            /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
            // Direct route definitions in server file
            /app\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g
        ];

        usePatterns.forEach((pattern, index) => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (index === 0) {
                    // This is an app.use() statement
                    const mountPath = match[1];
                    const routerName = match[2];
                    this.routePrefix.set(routerName, mountPath);
                } else {
                    // This is a direct route definition
                    const method = match[1].toUpperCase();
                    const route = match[2];
                    
                    if (this.isValidRoute(route)) {
                        this.apis.push({
                            method,
                            path: route,
                            fullUrl: `${this.baseUrl}${route}`,
                            file: relativePath,
                            routeFile: 'server',
                            description: this.extractDescription(content, match.index)
                        });
                    }
                }
            }
        });
    }

    guessRoutePrefix(fileName) {
        // Convert route file names to likely prefixes
        const prefixMap = {
            'authRoutes': '/api/auth',
            'userRoutes': '/api/users', 
            'productRoutes': '/api/products',
            'orderRoutes': '/api/orders',
            'blogRoutes': '/api/blogs',
            'adminRoutes': '/api/admin',
            'paymentRoutes': '/api/payment',
            'cartRoutes': '/api/cart',
            'categoryRoutes': '/api/categories',
            'contactRoutes': '/api/contact',
            'eventRoutes': '/api/events',
            'dealRoutes': '/api/deals',
            'slideRoutes': '/api/slides',
            'uploadRoutes': '/api/upload',
            'aboutRoutes': '/api/about',
            'analyticsRoutes': '/api/analytics',
            'testimonialRoutes': '/api/testimonials',
            'newsletterRoutes': '/api/newsletter',
            'wishlistRoutes': '/api/wishlist',
            'winnerRoutes': '/api/winners',
            'sampleRoutes': '/api/sample'
        };
        
        return prefixMap[fileName] || '';
    }

    isValidRoute(route) {
        // Check if this looks like a real route
        return route.startsWith('/') && 
               !route.includes('${') && // No template literals
               !route.includes('req.') && // No request objects
               !route.includes('res.') && // No response objects
               route.length > 1 && // Not just '/'
               !/^[A-Z-]+$/.test(route.slice(1)); // Not just HTTP headers
    }

    buildFullPath(prefix, route) {
        if (!prefix) return route;
        
        // Handle root routes
        if (route === '/') return prefix;
        
        // Combine prefix and route
        return prefix + route;
    }

    extractDescription(content, matchIndex) {
        const beforeMatch = content.substring(0, matchIndex);
        const lines = beforeMatch.split('\n');
        
        // Look for comment on the line above
        for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
            const line = lines[i].trim();
            if (line.startsWith('//')) {
                return line.replace(/^\/\/\s*/, '');
            }
        }
        return null;
    }

    cleanAndDeduplicateAPIs() {
        // Remove duplicates and sort
        const uniqueAPIs = new Map();
        
        this.apis.forEach(api => {
            const key = `${api.method}:${api.path}`;
            
            // Keep the first occurrence or the one with better description
            if (!uniqueAPIs.has(key) || (api.description && !uniqueAPIs.get(key).description)) {
                uniqueAPIs.set(key, api);
            }
        });
        
        this.apis = Array.from(uniqueAPIs.values())
            .sort((a, b) => {
                // Sort by path first, then by method
                if (a.path === b.path) {
                    const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
                    return methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
                }
                return a.path.localeCompare(b.path);
            });
    }

    getJSFiles(dir) {
        let files = [];
        
        try {
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !item.startsWith('.')) {
                    files = files.concat(this.getJSFiles(fullPath));
                } else if (item.endsWith('.js') || item.endsWith('.mjs')) {
                    files.push(fullPath);
                }
            });
        } catch (err) {
            // Ignore directories we can't read
        }
        
        return files;
    }

    generateDocumentation() {
        const groupedAPIs = this.groupAPIsByPrefix();
        
        return {
            generatedAt: new Date().toISOString(),
            baseUrl: this.baseUrl,
            totalEndpoints: this.apis.length,
            summary: this.generateSummary(),
            apiGroups: groupedAPIs,
            allEndpoints: this.apis
        };
    }

    groupAPIsByPrefix() {
        const groups = {};
        
        this.apis.forEach(api => {
            const pathParts = api.path.split('/');
            let groupName = 'Root';
            
            if (pathParts.length >= 3 && pathParts[1] === 'api') {
                groupName = pathParts[2].charAt(0).toUpperCase() + pathParts[2].slice(1);
            } else if (pathParts.length >= 2 && pathParts[1]) {
                groupName = pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1);
            }
            
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(api);
        });
        
        return groups;
    }

    generateSummary() {
        const methodCounts = {};
        const pathGroups = {};
        
        this.apis.forEach(api => {
            // Count methods
            methodCounts[api.method] = (methodCounts[api.method] || 0) + 1;
            
            // Count by main path group
            const mainPath = api.path.split('/')[1] || 'root';
            pathGroups[mainPath] = (pathGroups[mainPath] || 0) + 1;
        });
        
        return { methodCounts, pathGroups };
    }

    generateMarkdown(documentation) {
        let md = `# API Documentation\n\n`;
        md += `**Generated:** ${new Date(documentation.generatedAt).toLocaleString()}\n`;
        md += `**Base URL:** \`${documentation.baseUrl}\`\n`;
        md += `**Total Endpoints:** ${documentation.totalEndpoints}\n\n`;
        
        // Summary
        md += `## Summary\n\n`;
        md += `### HTTP Methods\n`;
        Object.entries(documentation.summary.methodCounts).forEach(([method, count]) => {
            md += `- **${method}:** ${count} endpoints\n`;
        });
        
        md += `\n### API Groups\n`;
        Object.entries(documentation.apiGroups).forEach(([group, apis]) => {
            md += `- **${group}:** ${apis.length} endpoints\n`;
        });
        
        // API Groups
        md += `\n## API Endpoints by Group\n\n`;
        Object.entries(documentation.apiGroups).forEach(([groupName, apis]) => {
            md += `### ${groupName}\n\n`;
            
            apis.forEach(api => {
                md += `#### ${api.method} ${api.path}\n\n`;
                md += `- **URL:** \`${api.fullUrl}\`\n`;
                md += `- **File:** \`${api.file}\`\n`;
                if (api.description) {
                    md += `- **Description:** ${api.description}\n`;
                }
                md += `\n`;
            });
            
            md += `---\n\n`;
        });
        
        return md;
    }

    async saveDocumentation() {
        const documentation = this.generateDocumentation();
        
        // Save JSON
        fs.writeFileSync(this.outputFile, JSON.stringify(documentation, null, 2));
        console.log(`📄 Saved: ${this.outputFile}`);
        
        // Save Markdown
        const mdFile = this.outputFile.replace('.json', '.md');
        const markdown = this.generateMarkdown(documentation);
        fs.writeFileSync(mdFile, markdown);
        console.log(`📄 Saved: ${mdFile}`);
        
        // Save simple list
        const txtFile = this.outputFile.replace('.json', '.txt');
        let txtContent = `API Endpoints - ${new Date().toLocaleString()}\n`;
        txtContent += `Total: ${documentation.totalEndpoints} endpoints\n\n`;
        
        documentation.allEndpoints.forEach((api, index) => {
            txtContent += `${index + 1}. ${api.method} ${api.fullUrl}\n`;
        });
        
        fs.writeFileSync(txtFile, txtContent);
        console.log(`📄 Saved: ${txtFile}`);
        
        return documentation;
    }

    async run() {
        this.extractAPIs();
        
        if (this.apis.length === 0) {
            console.log('❌ No valid API endpoints found.');
            return;
        }
        
        const documentation = await this.saveDocumentation();
        
        // Show summary
        console.log(`\n📊 Summary:`);
        Object.entries(documentation.summary.methodCounts).forEach(([method, count]) => {
            console.log(`   ${method}: ${count} endpoints`);
        });
        
        console.log(`\n🎯 API Groups:`);
        Object.entries(documentation.apiGroups).forEach(([group, apis]) => {
            console.log(`   ${group}: ${apis.length} endpoints`);
        });
        
        return documentation;
    }
}

// CLI usage
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
📚 Clean API Extractor - Extract clean, accurate API documentation

Usage: node clean-extract.js [options]

Options:
  --baseurl, -b <url>    Base URL for your API (default: http://localhost:3000)
  --output, -o <file>    Output file name (default: clean-api-documentation.json)
  --help, -h             Show this help

Examples:
  node clean-extract.js
  node clean-extract.js --baseurl https://api.myapp.com
  node clean-extract.js --output my-clean-apis.json
        `);
        return;
    }
    
    const options = {
        baseUrl: 'http://localhost:3000',
        outputFile: 'clean-api-documentation.json'
    };
    
    // Parse arguments
    for (let i = 0; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        switch (flag) {
            case '--baseurl':
            case '-b':
                options.baseUrl = value;
                break;
            case '--output':
            case '-o':
                options.outputFile = value;
                break;
        }
    }
    
    const extractor = new CleanAPIExtractor(options);
    await extractor.run();
}

// Export for programmatic use
export default CleanAPIExtractor;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}