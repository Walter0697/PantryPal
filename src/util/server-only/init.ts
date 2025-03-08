// This file is responsible for initializing all required data on server start
// Simply import this file in server components or server-side code 
// to ensure initialization happens

console.log(`[${new Date().toISOString()}] 🚀 SERVER INIT: Starting server initialization process...`);

// Import all initialization modules here
console.log(`[${new Date().toISOString()}] 📂 SERVER INIT: Loading home layout initialization module...`);
import './initHomeLayout';

// Add any additional initialization modules here
// Example: import './initUsers';
// Example: import './initProducts';

console.log(`[${new Date().toISOString()}] 🎉 SERVER INIT: All initialization modules loaded`);

// Export a function to explicitly run initialization
export async function runAllInitializations() {
  console.log(`[${new Date().toISOString()}] 🔄 SERVER INIT: Running explicit initialization...`);
  // This function is here for explicit initialization if needed
  // Just importing this file should be enough in most cases
  // as the import statements above will trigger the initialization
  
  console.log(`[${new Date().toISOString()}] ✅ SERVER INIT: Explicit initialization complete`);
  return true;
} 