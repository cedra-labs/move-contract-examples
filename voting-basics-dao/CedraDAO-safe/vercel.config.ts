/** @type {import('@vercel/node').VercelConfig} */
const config = {
  // Build configuration
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  
  // Framework preset for Vite
  framework: 'vite',
  
  // Install command
  installCommand: 'npm install',
  
  // Development command
  devCommand: 'npm run dev',
  
  // Routes configuration for SPA
  routes: [
    {
      src: '/(.*)',
      dest: '/index.html'
    }
  ]
};

module.exports = config;
