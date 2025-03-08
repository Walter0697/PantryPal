import { Layout } from 'react-grid-layout';

// Define types for our storage
export interface AreaItem {
  id: string;
  name: string;
  iconName: string;
  color: string;
}

export type LayoutConfig = { [key: string]: Layout[] };

// Storage keys
const LAYOUTS_STORAGE_KEY = 'gridLayouts';
const AREAS_STORAGE_KEY = 'gridAreas';

// Default values
const defaultAreas: AreaItem[] = [
  { id: 'kitchen', name: 'Kitchen', iconName: 'FaKitchenSet', color: 'bg-blue-500' },
  { id: 'bathroom', name: 'Bathroom', iconName: 'FaToilet', color: 'bg-green-500' },
  { id: 'bedroom', name: 'Bedroom', iconName: 'FaBed', color: 'bg-purple-500' },
  { id: 'living-room', name: 'Living Room', iconName: 'FaCouch', color: 'bg-yellow-500' },
  { id: 'dining', name: 'Dining', iconName: 'FaUtensils', color: 'bg-red-500' },
  { id: 'shower', name: 'Shower', iconName: 'FaShower', color: 'bg-indigo-500' },
];

const defaultLayouts = {
  lg: [
    { i: 'kitchen', x: 0, y: 0, w: 6, h: 2 },
    { i: 'bathroom', x: 6, y: 0, w: 3, h: 1 },
    { i: 'bedroom', x: 9, y: 0, w: 3, h: 2 },
    { i: 'living-room', x: 0, y: 2, w: 6, h: 1 },
    { i: 'dining', x: 6, y: 1, w: 3, h: 2 },
    { i: 'shower', x: 9, y: 2, w: 3, h: 1 },
  ],
  md: [
    { i: 'kitchen', x: 0, y: 0, w: 6, h: 2 },
    { i: 'bathroom', x: 6, y: 0, w: 3, h: 1 },
    { i: 'bedroom', x: 0, y: 2, w: 6, h: 1 },
    { i: 'living-room', x: 6, y: 1, w: 3, h: 1 },
    { i: 'dining', x: 0, y: 3, w: 6, h: 1 },
    { i: 'shower', x: 6, y: 2, w: 3, h: 1 },
  ],
  sm: [
    { i: 'kitchen', x: 0, y: 0, w: 6, h: 1 },
    { i: 'bathroom', x: 0, y: 1, w: 3, h: 1 },
    { i: 'bedroom', x: 3, y: 1, w: 3, h: 1 },
    { i: 'living-room', x: 0, y: 2, w: 3, h: 1 },
    { i: 'dining', x: 3, y: 2, w: 3, h: 1 },
    { i: 'shower', x: 0, y: 3, w: 6, h: 1 },
  ],
};

// Helper to check if we're in a browser environment
const isBrowser = () => typeof window !== 'undefined';

/**
 * Get all boxes/areas from localStorage
 */
export const getAreas = (): AreaItem[] => {
  if (!isBrowser()) return defaultAreas;
  
  const savedAreas = localStorage.getItem(AREAS_STORAGE_KEY);
  if (!savedAreas) return defaultAreas;
  
  try {
    const areas = JSON.parse(savedAreas);
    
    // Handle old format (icon vs iconName)
    if (areas.length > 0 && areas[0].icon && !areas[0].iconName) {
      // Migration needed
      console.log('Migrating old format grid data to new format...');
      localStorage.removeItem(AREAS_STORAGE_KEY);
      return defaultAreas;
    }
    
    return areas;
  } catch (error) {
    console.error('Error parsing areas from localStorage:', error);
    return defaultAreas;
  }
};

/**
 * Get all layouts from localStorage
 */
export const getLayouts = (): LayoutConfig => {
  if (!isBrowser()) return defaultLayouts;
  
  const savedLayouts = localStorage.getItem(LAYOUTS_STORAGE_KEY);
  if (!savedLayouts) return defaultLayouts;
  
  try {
    return JSON.parse(savedLayouts);
  } catch (error) {
    console.error('Error parsing layouts from localStorage:', error);
    return defaultLayouts;
  }
};

/**
 * Save areas to localStorage
 */
export const saveAreas = (areas: AreaItem[]): void => {
  if (!isBrowser()) return;
  localStorage.setItem(AREAS_STORAGE_KEY, JSON.stringify(areas));
};

/**
 * Save layouts to localStorage
 */
export const saveLayouts = (layouts: LayoutConfig): void => {
  if (!isBrowser()) return;
  localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(layouts));
};

/**
 * Check if area name already exists (case insensitive)
 */
export const isAreaNameDuplicate = (name: string, excludeId?: string): boolean => {
  const areas = getAreas();
  return areas.some(area => 
    area.id !== excludeId && 
    area.name.toLowerCase() === name.toLowerCase()
  );
};

/**
 * Add a new area/box
 */
export const addArea = (newArea: Omit<AreaItem, 'id'>): AreaItem => {
  // Generate a unique ID
  const newId = `box-${Date.now()}`;
  const areaWithId = { ...newArea, id: newId };
  
  // Add to areas
  const areas = getAreas();
  const updatedAreas = [...areas, areaWithId];
  saveAreas(updatedAreas);
  
  // Add to layouts
  const layouts = getLayouts();
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
  
  saveLayouts(updatedLayouts);
  
  return areaWithId;
};

/**
 * Update an existing area/box
 */
export const updateArea = (id: string, updates: Partial<Omit<AreaItem, 'id'>>): AreaItem | null => {
  const areas = getAreas();
  const areaIndex = areas.findIndex(area => area.id === id);
  
  if (areaIndex === -1) return null;
  
  // Update the area
  const updatedArea = { ...areas[areaIndex], ...updates };
  const updatedAreas = [...areas];
  updatedAreas[areaIndex] = updatedArea;
  
  saveAreas(updatedAreas);
  return updatedArea;
};

/**
 * Remove an area/box
 */
export const removeArea = (id: string): boolean => {
  // Remove from areas
  const areas = getAreas();
  const updatedAreas = areas.filter(area => area.id !== id);
  
  if (updatedAreas.length === areas.length) {
    // Area not found
    return false;
  }
  
  saveAreas(updatedAreas);
  
  // Remove from layouts
  const layouts = getLayouts();
  const updatedLayouts: { [key: string]: Layout[] } = {};
  
  Object.keys(layouts).forEach(breakpoint => {
    updatedLayouts[breakpoint] = layouts[breakpoint].filter(item => item.i !== id);
  });
  
  saveLayouts(updatedLayouts);
  return true;
};

/**
 * Get a specific area by ID
 */
export const getAreaById = (id: string): AreaItem | undefined => {
  const areas = getAreas();
  return areas.find(area => area.id === id);
};

/**
 * Load all saved data (areas and layouts)
 */
export const loadSavedData = () => {
  return {
    areas: getAreas(),
    layouts: getLayouts()
  };
}; 