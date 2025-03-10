// Cloudflare Pages Worker for Next.js
export default {
  async fetch(request, env) {
    try {
      // Forward the request to the Next.js server
      const nextServer = await import('./server.js');
      
      // Create a simulated request event for the Next.js server
      return await nextServer.default.fetch(request, env);
    } catch (error) {
      return new Response(`Server Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
}; 