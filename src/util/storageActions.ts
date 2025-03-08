'use server';

import { revalidatePath } from 'next/cache';

// Define storage area interface
export interface AreaItem {
  id: string;
  name: string;
  iconName: string;
  color: string;
}

// Backend in-memory storage for storage locations (will be reset on server restart)
let storageAreas: AreaItem[] = [
  { id: 'kitchen', name: 'Kitchen', iconName: 'FaKitchenSet', color: 'bg-blue-500' },
  { id: 'bathroom', name: 'Bathroom', iconName: 'FaToilet', color: 'bg-green-500' },
  { id: 'bedroom', name: 'Bedroom', iconName: 'FaBed', color: 'bg-purple-500' },
  { id: 'living-room', name: 'Living Room', iconName: 'FaCouch', color: 'bg-yellow-500' },
  { id: 'dining', name: 'Dining', iconName: 'FaUtensils', color: 'bg-red-500' },
  { id: 'shower', name: 'Shower', iconName: 'FaShower', color: 'bg-indigo-500' },
];

// Backend in-memory storage for layouts
let storageLayouts: { [key: string]: any[] } = {
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

/**
 * Get all storage areas
 */
export async function getAreas(): Promise<AreaItem[]> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [...storageAreas];
  } catch (error) {
    console.error("Error fetching storage areas:", error);
    return [];
  }
}

/**
 * Get storage layouts
 */
export async function getLayouts(): Promise<{ [key: string]: any[] }> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return JSON.parse(JSON.stringify(storageLayouts));
  } catch (error) {
    console.error("Error fetching layouts:", error);
    return { lg: [], md: [], sm: [] };
  }
}

/**
 * Get a specific storage area by ID
 */
export async function getAreaById(id: string): Promise<AreaItem | null> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const area = storageAreas.find(area => area.id === id);
    return area || null;
  } catch (error) {
    console.error("Error fetching storage area:", error);
    return null;
  }
}

/**
 * Add a new storage area
 */
export async function addArea(area: Omit<AreaItem, 'id'>): Promise<AreaItem> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate a unique ID
    const newId = `box-${Date.now()}`;
    
    // Create new area
    const newArea: AreaItem = {
      ...area,
      id: newId
    };
    
    // Add to areas
    storageAreas.push(newArea);
    
    // Add to layouts
    Object.keys(storageLayouts).forEach(breakpoint => {
      // Find a good position (at the end)
      const maxY = storageLayouts[breakpoint].reduce(
        (max: number, item: any) => Math.max(max, item.y + item.h),
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
      
      storageLayouts[breakpoint].push(newItem);
    });
    
    // Revalidate relevant paths
    revalidatePath('/home');
    revalidatePath('/list');
    
    return newArea;
  } catch (error) {
    console.error("Error adding storage area:", error);
    throw new Error("Failed to add storage area");
  }
}

/**
 * Update a storage area
 */
export async function updateArea(id: string, updates: Partial<Omit<AreaItem, 'id'>>): Promise<AreaItem | null> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const areaIndex = storageAreas.findIndex(area => area.id === id);
    
    if (areaIndex === -1) return null;
    
    // Update the area
    const updatedArea = {
      ...storageAreas[areaIndex],
      ...updates
    };
    
    storageAreas[areaIndex] = updatedArea;
    
    // Revalidate relevant paths
    revalidatePath('/home');
    revalidatePath('/list');
    revalidatePath(`/storage/${id}`);
    
    return updatedArea;
  } catch (error) {
    console.error("Error updating storage area:", error);
    return null;
  }
}

/**
 * Remove a storage area
 */
export async function removeArea(id: string): Promise<boolean> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if area exists
    const initialLength = storageAreas.length;
    storageAreas = storageAreas.filter(area => area.id !== id);
    
    if (storageAreas.length === initialLength) {
      return false; // Area not found
    }
    
    // Remove from layouts
    Object.keys(storageLayouts).forEach(breakpoint => {
      storageLayouts[breakpoint] = storageLayouts[breakpoint].filter(item => item.i !== id);
    });
    
    // Revalidate relevant paths
    revalidatePath('/home');
    revalidatePath('/list');
    
    return true;
  } catch (error) {
    console.error("Error removing storage area:", error);
    return false;
  }
}

/**
 * Check if area name already exists (case insensitive)
 */
export async function isAreaNameDuplicate(name: string, excludeId?: string): Promise<boolean> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return storageAreas.some(area =>
      area.id !== excludeId &&
      area.name.toLowerCase() === name.toLowerCase()
    );
  } catch (error) {
    console.error("Error checking for duplicate name:", error);
    return false;
  }
}

/**
 * Save layouts
 */
export async function saveLayouts(layouts: { [key: string]: any[] }): Promise<boolean> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    storageLayouts = JSON.parse(JSON.stringify(layouts));
    
    // Revalidate home path
    revalidatePath('/home');
    
    return true;
  } catch (error) {
    console.error("Error saving layouts:", error);
    return false;
  }
} 