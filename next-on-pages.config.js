/** @type {import('@cloudflare/next-on-pages').PluginConfig} */
const config = {
  // Specify polyfills for Node.js built-in modules
  experimentalStreamingResponse: true,
  // Add polyfill for specific Node.js APIs used in the project
  experimentalMinify: true,
  // Define any assets that should bypass the worker
  bypassInactivePath: true,
  // Performance and compatibility settings
  experimentalEnableTemporal: true,
  // compatibilityDate helps with version control of Cloudflare Worker features
  compatibilityDate: new Date().toISOString().split('T')[0],
  // Compatibility flags for Node.js compatibility
  compatibilityFlags: ['nodejs_compat'],
};

module.exports = config; 