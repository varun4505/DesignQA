import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In plugin mode, Vite builds directly to ../plugin/dist
// This script verifies the build was successful
const targetDir = path.join(__dirname, '..', '..', 'plugin', 'dist');
const targetIndexPath = path.join(targetDir, 'index.html');

if (fs.existsSync(targetIndexPath)) {
  const stats = fs.statSync(targetIndexPath);
  console.log(`✓ Plugin UI built successfully: index.html (${(stats.size / 1024).toFixed(2)} KB)`);
} else {
  console.error('✗ Build verification failed: index.html not found in plugin/dist');
  process.exit(1);
}
