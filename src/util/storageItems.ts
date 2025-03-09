import { 
  getAreaItems as getServerAreaItems,
  saveItem as saveServerItem,
  deleteStorageItem,
  getLowStockItems as getServerLowStockItems,
  getItemsByExpiryDateRange as getServerItemsByExpiryDateRange,
  StorageItem as ServerStorageItem
} from './server-only/storageStorage';

// Define our StorageItem type with additional UI-specific fields
export interface StorageItem extends ServerStorageItem {
  iconName?: string;  // Make iconName optional but available for UI
}

// Helper to get the current user ID (reusing the same approach as in storage.ts)
const getCurrentUserId = (): string => {
  // We're in the browser
  if (typeof window !== 'undefined') {
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
  }
  
  // We're on the server
  return 'server';
};

/**
 * Get all items for a specific area
 */
export const getAreaItems = async (areaIdentifier: string): Promise<StorageItem[]> => {
  const userId = getCurrentUserId();
  return await getServerAreaItems(userId, areaIdentifier);
};

/**
 * Save an item
 */
export const saveItem = async (areaIdentifier: string, item: StorageItem): Promise<StorageItem> => {
  const userId = getCurrentUserId();
  return await saveServerItem(userId, areaIdentifier, item);
};

/**
 * Delete an item
 */
export const deleteItem = async (areaIdentifier: string, itemId: string): Promise<boolean> => {
  const userId = getCurrentUserId();
  return await deleteStorageItem(userId, areaIdentifier, itemId);
};

/**
 * Get all low stock items across all areas
 */
export const getLowStockItems = async (): Promise<(StorageItem & { areaIdentifier: string })[]> => {
  const userId = getCurrentUserId();
  return await getServerLowStockItems(userId);
};

/**
 * Get items expiring in a date range
 */
export const getItemsByExpiryDateRange = async (
  startDate: string,
  endDate: string
): Promise<(StorageItem & { areaIdentifier: string })[]> => {
  const userId = getCurrentUserId();
  return await getServerItemsByExpiryDateRange(userId, startDate, endDate);
};

/**
 * Get items that are expiring soon (within the next week)
 */
export const getExpiringSoonItems = async (): Promise<(StorageItem & { areaIdentifier: string })[]> => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  return await getItemsByExpiryDateRange(
    today.toISOString().split('T')[0],
    nextWeek.toISOString().split('T')[0]
  );
};

/**
 * Create a new item with default values
 */
export const createNewItem = (name: string = ''): StorageItem => {
  return {
    id: `item-${Date.now()}`,
    name,
    quantity: 1,
    minQuantity: 0,
    unit: '',
    notes: '',
    category: '',
    iconName: 'FaBox',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
};

// Export the public API
export const StorageItemsAPI = {
  getAreaItems,
  saveItem,
  deleteItem,
  getLowStockItems,
  getItemsByExpiryDateRange,
  getExpiringSoonItems,
  createNewItem
}; 