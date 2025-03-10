// This file is server-only and not exposed to the client
import { getItem, putItem, scanItems } from './dynamodb';

// Define type for the home layout
export type HomeLayout = {
  id: string;
  name: string;
  layout: LayoutItem[];
  createdAt: string;
  updatedAt: string;
};

// Define type for layout items
export type LayoutItem = {
  i: string;  // unique identifier for the item
  x: number;  // x position
  y: number;  // y position
  w: number;  // width
  h: number;  // height
  content: {
    type: 'recent-items' | 'shopping-list' | 'expired-items' | 'stats' | 'inventory-overview';
    title: string;
    config?: Record<string, any>;
  };
};

// Default home layout configuration
const DEFAULT_HOME_LAYOUT: HomeLayout = {
  id: 'default',
  name: 'Default Layout',
  layout: [
    {
      i: 'recent-items',
      x: 0,
      y: 0,
      w: 6,
      h: 2,
      content: {
        type: 'recent-items',
        title: 'Recently Added Items',
      }
    },
    {
      i: 'shopping-list',
      x: 6,
      y: 0,
      w: 6,
      h: 2,
      content: {
        type: 'shopping-list',
        title: 'Shopping List',
      }
    },
    {
      i: 'expired-items',
      x: 0,
      y: 2,
      w: 4,
      h: 2,
      content: {
        type: 'expired-items',
        title: 'Expiring Soon',
      }
    },
    {
      i: 'stats',
      x: 4,
      y: 2,
      w: 4,
      h: 2,
      content: {
        type: 'stats',
        title: 'Inventory Stats',
      }
    },
    {
      i: 'inventory-overview',
      x: 8,
      y: 2,
      w: 4,
      h: 2,
      content: {
        type: 'inventory-overview',
        title: 'Inventory Overview',
      }
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Initialize the home layout in DynamoDB if it doesn't exist
 * This will run once when the server starts
 */
export async function initializeHomeLayout(): Promise<HomeLayout> {
  console.log(`[${new Date().toISOString()}] 🔄 HOME LAYOUT: Starting initialization check...`);
  try {
    // Check if default layout already exists
    console.log(`[${new Date().toISOString()}] 🔍 HOME LAYOUT: Checking if default layout exists in DynamoDB...`);
    const existingLayout = await getItem<HomeLayout>('home', { id: 'default' });
    
    if (!existingLayout) {
      console.log(`[${new Date().toISOString()}] ⚠️ HOME LAYOUT: No default layout found. Creating now...`);
      // Create default layout
      await putItem('home', DEFAULT_HOME_LAYOUT);
      console.log(`[${new Date().toISOString()}] ✅ HOME LAYOUT: Default layout created successfully!`);
      return DEFAULT_HOME_LAYOUT;
    }
    
    console.log(`[${new Date().toISOString()}] ✅ HOME LAYOUT: Default layout already exists. Using existing layout.`);
    return existingLayout;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ HOME LAYOUT: Initialization failed with error:`, error);
    throw new Error('Failed to initialize home layout');
  }
}

/**
 * Get all available home layouts
 */
export async function getAllHomeLayouts(): Promise<HomeLayout[]> {
  console.log(`[${new Date().toISOString()}] 🔍 HOME LAYOUT: Fetching all home layouts...`);
  try {
    const layouts = await scanItems<HomeLayout>('home');
    console.log(`[${new Date().toISOString()}] ✅ HOME LAYOUT: Found ${layouts.length} layouts.`);
    return layouts;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ HOME LAYOUT: Failed to get home layouts:`, error);
    throw new Error('Failed to get home layouts');
  }
}

/**
 * Get a specific home layout by ID
 */
export async function getHomeLayout(id: string): Promise<HomeLayout | null> {
  console.log(`[${new Date().toISOString()}] 🔍 HOME LAYOUT: Fetching layout with ID "${id}"...`);
  try {
    const layout = await getItem<HomeLayout>('home', { id });
    if (layout) {
      console.log(`[${new Date().toISOString()}] ✅ HOME LAYOUT: Successfully fetched layout "${id}"`);
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️ HOME LAYOUT: Layout "${id}" not found.`);
    }
    return layout;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ HOME LAYOUT: Failed to get home layout:`, error);
    throw new Error('Failed to get home layout');
  }
}

// Log that this module is being loaded
console.log(`[${new Date().toISOString()}] 🚀 HOME LAYOUT: Module loaded, initialization starting...`);

// Initialize the home layout when this module is imported
// This will run once when the server starts
initializeHomeLayout(); 