'use server';

import { revalidatePath } from 'next/cache';

// Define item interface
export interface StorageItem {
  id: string;
  name: string;
  iconName: string;
  volume?: string;
  quantity: number;
}

// Backend in-memory storage (will be reset on server restart)
let itemStorage: { [storageId: string]: StorageItem[] } = {};

// Initialize with empty arrays for default storage locations
const defaultStorageLocations = ['kitchen', 'bathroom', 'bedroom', 'living-room', 'dining', 'shower'];
defaultStorageLocations.forEach(location => {
  itemStorage[location] = [];
});

// Helper function to find or initialize a storage location
function getOrCreateStorage(storageId: string): StorageItem[] {
  const normalizedId = getNormalizedId(storageId);
  
  if (!itemStorage[normalizedId]) {
    itemStorage[normalizedId] = [];
  }
  
  return itemStorage[normalizedId];
}

// Helper to normalize storage IDs
function getNormalizedId(id: string): string {
  // First check if we have an exact match
  if (itemStorage[id]) {
    return id;
  }
  
  // Then check for known storage types in custom IDs (like box-123456)
  const knownStorageTypes = Object.keys(itemStorage);
  for (const type of knownStorageTypes) {
    if (id.includes(type) || id.startsWith(type)) {
      return type;
    }
  }
  
  // If no match, just return the original ID
  return id;
}

/**
 * Get items for a specific storage location
 */
export async function getItemsByStorageId(storageId: string): Promise<StorageItem[]> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const normalizedId = getNormalizedId(storageId);
    return itemStorage[normalizedId] || [];
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
}

/**
 * Add a new item to storage
 */
export async function addItem(
  storageId: string, 
  item: Omit<StorageItem, 'id'>
): Promise<StorageItem> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const normalizedId = getNormalizedId(storageId);
    const storage = getOrCreateStorage(normalizedId);
    
    // Generate a new ID
    const newId = `${normalizedId.charAt(0)}${Date.now()}`;
    const newItem: StorageItem = { ...item, id: newId };
    
    // Add to storage
    storage.push(newItem);
    
    // Revalidate the storage page to reflect changes
    revalidatePath(`/storage/${storageId}`);
    
    return newItem;
  } catch (error) {
    console.error("Error adding item:", error);
    throw new Error("Failed to add item");
  }
}

/**
 * Update an existing item's details
 */
export async function updateItem(
  storageId: string,
  itemId: string,
  updates: Partial<Omit<StorageItem, 'id'>>
): Promise<StorageItem | null> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const normalizedId = getNormalizedId(storageId);
    const storage = itemStorage[normalizedId];
    
    if (!storage) return null;
    
    const itemIndex = storage.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return null;
    
    // Update the item
    const updatedItem = { 
      ...storage[itemIndex], 
      ...updates 
    };
    
    storage[itemIndex] = updatedItem;
    
    // Revalidate the storage page to reflect changes
    revalidatePath(`/storage/${storageId}`);
    
    return updatedItem;
  } catch (error) {
    console.error("Error updating item:", error);
    return null;
  }
}

/**
 * Remove an item from storage
 */
export async function removeItem(
  storageId: string, 
  itemId: string
): Promise<boolean> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const normalizedId = getNormalizedId(storageId);
    const storage = itemStorage[normalizedId];
    
    if (!storage) return false;
    
    const initialLength = storage.length;
    itemStorage[normalizedId] = storage.filter(item => item.id !== itemId);
    
    // Revalidate the storage page to reflect changes
    revalidatePath(`/storage/${storageId}`);
    
    return itemStorage[normalizedId].length < initialLength;
  } catch (error) {
    console.error("Error removing item:", error);
    return false;
  }
}

/**
 * Get a single item by ID
 */
export async function getItemById(
  storageId: string,
  itemId: string
): Promise<StorageItem | null> {
  try {
    // Add artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const normalizedId = getNormalizedId(storageId);
    const storage = itemStorage[normalizedId];
    
    if (!storage) return null;
    
    return storage.find(item => item.id === itemId) || null;
  } catch (error) {
    console.error("Error getting item:", error);
    return null;
  }
} 