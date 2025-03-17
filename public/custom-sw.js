// This file will be copied to the root directory by next-pwa
// It's a custom service worker that extends the default one

// Custom code to be injected into the service worker
self.addEventListener('install', (event) => {
  console.log('Custom service worker installing...');
});

self.addEventListener('activate', (event) => {
  console.log('Custom service worker activating...');
});

// Add a custom fetch handler for analytics or custom caching
self.addEventListener('fetch', (event) => {
  // You can add custom handling for specific routes
  const url = new URL(event.request.url);
  
  // For example, always fetch fresh data for API calls
  if (url.pathname.startsWith('/api/')) {
    // Skip the cache for API calls
    return;
  }
  
  // Let the default service worker handle other requests
}); 