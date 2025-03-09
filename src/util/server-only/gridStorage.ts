'use server';

import { 
  getItem, 
  putItem, 
  scanItems 
} from './dynamodb';
import { AreaItem, LayoutConfig } from '../storage';

// Storage key - just one table now for both layouts and areas
const HOME_TABLE = 'home';

// Default values (same as in the client-side storage)
const defaultAreas: AreaItem[] = [
  { id: 'home', name: 'Home', identifier: 'HOME-MAIN', iconName: 'FaKitchenSet', color: 'bg-blue-500' },
  { id: 'kitchen', name: 'Kitchen', identifier: 'KITCHEN-001', iconName: 'FaKitchenSet', color: 'bg-blue-500' },
  { id: 'washroom', name: 'Washroom', identifier: 'WASHROOM-001', iconName: 'FaToilet', color: 'bg-green-500' },
  { id: 'bedroom', name: 'Bedroom', identifier: 'BED-001', iconName: 'FaBed', color: 'bg-purple-500' },
  { id: 'living-room', name: 'Living Room', identifier: 'LIVING-001', iconName: 'FaCouch', color: 'bg-yellow-500' },
  { id: 'dining', name: 'Dining', identifier: 'DINING-001', iconName: 'FaUtensils', color: 'bg-red-500' },
  { id: 'shower', name: 'Shower', identifier: 'SHOWER-001', iconName: 'FaShower', color: 'bg-indigo-500' },
];

const defaultLayouts = {
  lg: [
    { i: 'home', x: 0, y: 0, w: 12, h: 1 },
    { i: 'kitchen', x: 0, y: 1, w: 6, h: 2 },
    { i: 'washroom', x: 6, y: 1, w: 6, h: 2 },
    { i: 'bedroom', x: 0, y: 3, w: 4, h: 2 },
    { i: 'living-room', x: 4, y: 3, w: 4, h: 2 },
    { i: 'dining', x: 8, y: 3, w: 4, h: 2 },
  ],
  md: [
    { i: 'home', x: 0, y: 0, w: 9, h: 1 },
    { i: 'kitchen', x: 0, y: 1, w: 5, h: 2 },
    { i: 'washroom', x: 5, y: 1, w: 4, h: 2 },
    { i: 'bedroom', x: 0, y: 3, w: 3, h: 2 },
    { i: 'living-room', x: 3, y: 3, w: 3, h: 2 },
    { i: 'dining', x: 6, y: 3, w: 3, h: 2 },
  ],
  sm: [
    { i: 'home', x: 0, y: 0, w: 6, h: 1 },
    { i: 'kitchen', x: 0, y: 1, w: 3, h: 1 },
    { i: 'washroom', x: 3, y: 1, w: 3, h: 1 },
    { i: 'bedroom', x: 0, y: 2, w: 2, h: 1 },
    { i: 'living-room', x: 2, y: 2, w: 2, h: 1 },
    { i: 'dining', x: 4, y: 2, w: 2, h: 1 },
  ],
};

// Combined home data structure
interface HomeData {
  areas: AreaItem[];
  layouts: LayoutConfig;
}

// DynamoDB key structure
interface StorageKey {
  userId: string;
  type: string;
}

// Helper to ensure all areas have identifiers
const migrateAreasWithIdentifiers = (areas: AreaItem[]): AreaItem[] => {
  return areas.map((area, index) => {
    if (!area.identifier) {
      // Create a default identifier based on the name or ID
      const baseIdentifier = area.name.toUpperCase().replace(/\s+/g, '-');
      const uniqueIdentifier = `${baseIdentifier}-${index + 1}`.substring(0, 15);
      return { ...area, identifier: uniqueIdentifier };
    }
    return area;
  });
};

/**
 * Get home data (combined areas and layouts) for a user
 */
async function getHomeData(userId: string): Promise<HomeData> {
  try {
    // Simplified key structure - just using the id as the primary key
    const key = { 
      id: `user-${userId}-home` 
    };
    
    const data = await getItem<{ id: string, homeData: HomeData }>(HOME_TABLE, key);
    
    if (!data || !data.homeData) {
      // If no data found, create default data for this user
      console.log(`Creating default home data for user ${userId}`);
      const defaultHomeData: HomeData = {
        areas: migrateAreasWithIdentifiers(defaultAreas),
        layouts: defaultLayouts
      };
      await saveHomeData(userId, defaultHomeData);
      return defaultHomeData;
    }
    
    // Apply migration to ensure all areas have identifiers
    const migratedAreas = migrateAreasWithIdentifiers(data.homeData.areas);
    
    // If we had to add identifiers, save the updated data
    if (JSON.stringify(data.homeData.areas) !== JSON.stringify(migratedAreas)) {
      const updatedHomeData = {
        ...data.homeData,
        areas: migratedAreas
      };
      await saveHomeData(userId, updatedHomeData);
      return updatedHomeData;
    }
    
    return data.homeData;
  } catch (error) {
    console.error('Error retrieving home data from database:', error);
    return {
      areas: defaultAreas, 
      layouts: defaultLayouts
    };
  }
}

/**
 * Get all areas/boxes for a user
 */
export async function getAreas(userId: string): Promise<AreaItem[]> {
  try {
    const homeData = await getHomeData(userId);
    return homeData.areas;
  } catch (error) {
    console.error('Error retrieving areas from database:', error);
    return defaultAreas;
  }
}

/**
 * Get all layouts for a user
 */
export async function getLayouts(userId: string): Promise<LayoutConfig> {
  try {
    const homeData = await getHomeData(userId);
    return homeData.layouts;
  } catch (error) {
    console.error('Error retrieving layouts from database:', error);
    return defaultLayouts;
  }
}

/**
 * Save the combined home data to the database
 */
async function saveHomeData(userId: string, homeData: HomeData): Promise<void> {
  try {
    // Simplified item structure with only the necessary fields
    const item = {
      id: `user-${userId}-home`,
      userId, // Keep this for filtering/querying but not as part of the primary key
      homeData, // Store all data in a single field
      updatedAt: new Date().toISOString()
    };
    
    await putItem(HOME_TABLE, item);
  } catch (error) {
    console.error('Error saving home data to database:', error);
    throw error;
  }
}

/**
 * Save areas to the database
 */
export async function saveAreas(userId: string, areas: AreaItem[]): Promise<void> {
  try {
    // First get the current home data to preserve layouts
    const homeData = await getHomeData(userId);
    
    // Update only the areas
    const updatedHomeData: HomeData = {
      ...homeData,
      areas
    };
    
    // Save the updated home data
    await saveHomeData(userId, updatedHomeData);
  } catch (error) {
    console.error('Error saving areas to database:', error);
    throw error;
  }
}

/**
 * Save layouts to the database
 */
export async function saveLayouts(userId: string, layouts: LayoutConfig): Promise<void> {
  try {
    // First get the current home data to preserve areas
    const homeData = await getHomeData(userId);
    
    // Update only the layouts
    const updatedHomeData: HomeData = {
      ...homeData,
      layouts
    };
    
    // Save the updated home data
    await saveHomeData(userId, updatedHomeData);
  } catch (error) {
    console.error('Error saving layouts to database:', error);
    throw error;
  }
}

/**
 * Function to get areas by identifier
 */
export async function getAreaByIdentifier(userId: string, identifier: string): Promise<AreaItem | undefined> {
  const areas = await getAreas(userId);
  return areas.find(area => 
    area.identifier && identifier &&
    area.identifier.toLowerCase() === identifier.toLowerCase()
  );
}

/**
 * Check if an identifier is already in use by another area
 */
export async function isAreaIdentifierDuplicate(userId: string, identifier: string, excludeId?: string): Promise<boolean> {
  const areas = await getAreas(userId);
  return areas.some(area => 
    area.id !== excludeId && 
    area.identifier && identifier &&
    area.identifier.toLowerCase() === identifier.toLowerCase()
  );
}

/**
 * Get a specific area by ID
 */
export async function getAreaById(userId: string, id: string): Promise<AreaItem | undefined> {
  const areas = await getAreas(userId);
  return areas.find(area => area.id === id);
} 