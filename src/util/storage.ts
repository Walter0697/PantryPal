import { Layout } from 'react-grid-layout';
import { 
  getAreas as getServerAreas,
  getLayouts as getServerLayouts,
  saveAreas as saveServerAreas,
  saveLayouts as saveServerLayouts,
  isAreaIdentifierDuplicate as isServerAreaIdentifierDuplicate,
  getAreaById as getServerAreaById
} from './server-only/gridStorage';

// Define types for our storage
export interface AreaItem {
  id: string;
  name: string;
  identifier: string;
  iconName: string;
  color: string;
}

export type LayoutConfig = { [key: string]: Layout[] };

// Helper to check if we're in a browser environment
const isBrowser = () => typeof window !== 'undefined';

// Helper function to get the current user ID
const getCurrentUserId = (): string => {
  // This is a placeholder. You should replace it with your actual method of getting the current user ID
  // For example, if you're using a context, you might call a hook or access a global state
  if (!isBrowser()) return 'server';
  
  // Get the JWT token from localStorage - this is allowed as it's auth related
  const token = localStorage.getItem('jwtToken');
  if (!token) return 'anonymous';
  
  try {
    // Parse the JWT token to get the user ID
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || 'anonymous';
  } catch (e) {
    console.error('Error parsing JWT token', e);
    return 'anonymous';
  }
};

/**
 * Get all areas/boxes
 */
export const getAreas = async (): Promise<AreaItem[]> => {
  const userId = getCurrentUserId();
  return await getServerAreas(userId);
};

/**
 * Get all layouts from localStorage
 */
export const getLayouts = async (): Promise<LayoutConfig> => {
  const userId = getCurrentUserId();
  return await getServerLayouts(userId);
};

/**
 * Save areas to localStorage
 */
export const saveAreas = async (areas: AreaItem[]): Promise<void> => {
  const userId = getCurrentUserId();
  await saveServerAreas(userId, areas);
};

/**
 * Save layouts to localStorage
 */
export const saveLayouts = async (layouts: LayoutConfig): Promise<void> => {
  const userId = getCurrentUserId();
  await saveServerLayouts(userId, layouts);
};

/**
 * Check if area name already exists (case insensitive)
 */
export const isAreaNameDuplicate = (name: string, excludeId?: string): boolean => {
  // Names can be duplicated now, so always return false
  return false;
};

/**
 * Check if an identifier is already in use by another area
 */
export const isAreaIdentifierDuplicate = async (identifier: string, excludeId?: string): Promise<boolean> => {
  const userId = getCurrentUserId();
  return await isServerAreaIdentifierDuplicate(userId, identifier, excludeId);
};

/**
 * Add a new area/box
 */
export const addArea = async (newArea: Omit<AreaItem, 'id'>): Promise<AreaItem> => {
  // Generate a unique ID
  const newId = `box-${Date.now()}`;
  const areaWithId = { ...newArea, id: newId };
  
  // Add to areas
  const areas = await getAreas();
  const updatedAreas = [...areas, areaWithId];
  await saveAreas(updatedAreas);
  
  // Add to layouts
  const layouts = await getLayouts();
  const updatedLayouts = { ...layouts };
  
  Object.keys(updatedLayouts).forEach(breakpoint => {
    // Find a good position (at the end)
    const maxY = updatedLayouts[breakpoint].reduce(
      (max: number, item: Layout) => Math.max(max, item.y + item.h),
      0
    );
    
    // Add new item to layout with size 1x1
    const newItem = {
      i: newId,
      x: 0,
      y: maxY,
      w: 1,
      h: 1
    };
    
    updatedLayouts[breakpoint] = [...updatedLayouts[breakpoint], newItem];
  });
  
  await saveLayouts(updatedLayouts);
  
  return areaWithId;
};

/**
 * Update an existing area/box
 */
export const updateArea = async (id: string, updates: Partial<Omit<AreaItem, 'id'>>): Promise<AreaItem | null> => {
  const areas = await getAreas();
  const areaIndex = areas.findIndex(area => area.id === id);
  
  if (areaIndex === -1) return null;
  
  // Update the area
  const updatedArea = { ...areas[areaIndex], ...updates };
  const updatedAreas = [...areas];
  updatedAreas[areaIndex] = updatedArea;
  
  await saveAreas(updatedAreas);
  return updatedArea;
};

/**
 * Remove an area/box
 */
export const removeArea = async (id: string): Promise<boolean> => {
  // Remove from areas
  const areas = await getAreas();
  const updatedAreas = areas.filter(area => area.id !== id);
  
  if (updatedAreas.length === areas.length) {
    // Area not found
    return false;
  }
  
  await saveAreas(updatedAreas);
  
  // Remove from layouts
  const layouts = await getLayouts();
  const updatedLayouts: { [key: string]: Layout[] } = {};
  
  Object.keys(layouts).forEach(breakpoint => {
    updatedLayouts[breakpoint] = layouts[breakpoint].filter(item => item.i !== id);
  });
  
  await saveLayouts(updatedLayouts);
  return true;
};

/**
 * Get a specific area by ID
 */
export const getAreaById = async (id: string): Promise<AreaItem | undefined> => {
  const userId = getCurrentUserId();
  return await getServerAreaById(userId, id);
};

/**
 * Load all saved data (areas and layouts)
 */
export const loadSavedData = async () => {
  return {
    areas: await getAreas(),
    layouts: await getLayouts()
  };
}; 