'use server';

import { 
  getItem, 
  putItem, 
  scanItems,
  deleteItem,
  queryItems
} from './dynamodb';

// Storage table name
const STORAGE_TABLE = 'storage';

// DynamoDB key structure - simpler for single user
interface StorageKey {
  id: string; // The area identifier this item belongs to
}

// Define the item storage interface
export interface StorageItem {
  id: string;
  name: string;
  quantity: number;
  minQuantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  expiryDate?: string;
  location?: string;
  imageUrl?: string;
  iconName?: string;
  updatedAt: string;
  createdAt: string;
}

// Structure for storing all items in an area
interface AreaItemsData {
  id: string; // The area identifier
  items: StorageItem[];
  updatedAt: string;
}

/**
 * Migrate from old storage format to new format
 * This function should be called once when upgrading the database
 */
export async function migrateToNewStorageFormat(): Promise<void> {
  try {
    console.log("Starting migration to new storage format...");
    
    // 1. Get all items in the old format
    const oldItems = await scanItems<StorageItem & { areaIdentifier: string }>(STORAGE_TABLE);
    
    if (!oldItems || oldItems.length === 0) {
      console.log("No items to migrate, database might be empty or already in new format");
      return;
    }
    
    // Group items by areaIdentifier
    const itemsByArea: Record<string, StorageItem[]> = {};
    
    for (const item of oldItems) {
      if (!item.areaIdentifier) {
        console.warn(`Item ${item.id} has no areaIdentifier, skipping`);
        continue;
      }
      
      // Process item to extract the original ID if it's a composite key
      const originalId = item.id.includes(`${item.areaIdentifier}-`) ? 
        item.id.substring(item.id.indexOf('-') + 1) : item.id;
        
      // Convert to the new format
      const newItem: StorageItem = {
        ...item,
        id: originalId
      };
      
      // Remove the areaIdentifier from the item itself
      delete (newItem as any).areaIdentifier;
      
      // Add to the appropriate area group
      if (!itemsByArea[item.areaIdentifier]) {
        itemsByArea[item.areaIdentifier] = [];
      }
      itemsByArea[item.areaIdentifier].push(newItem);
    }
    
    // 3. Save each area's items as a single entry
    for (const [areaId, items] of Object.entries(itemsByArea)) {
      const areaData: AreaItemsData = {
        id: areaId,
        items: items,
        updatedAt: new Date().toISOString()
      };
      
      await putItem(STORAGE_TABLE, areaData);
      console.log(`Migrated ${items.length} items for area ${areaId}`);
    }
    
    console.log("Migration to new storage format completed successfully!");
  } catch (error) {
    console.error("Error during migration to new storage format:", error);
    throw error;
  }
}

/**
 * Get all items for a specific area
 */
export async function getAreaItems(userId: string, areaIdentifier: string): Promise<StorageItem[]> {
  try {
    const key: StorageKey = {
      id: areaIdentifier
    };
    
    const data = await getItem<AreaItemsData>(STORAGE_TABLE, key);
    
    if (!data || !data.items) {
      // Try to migrate old data if no items found in new format
      try {
        await migrateToNewStorageFormat();
        
        // Try again after migration
        const migratedData = await getItem<AreaItemsData>(STORAGE_TABLE, key);
        if (!migratedData || !migratedData.items) {
          console.log(`No items found for area ${areaIdentifier} after migration, returning empty array`);
          return [];
        }
        return migratedData.items;
      } catch (migrationError) {
        console.error("Migration error:", migrationError);
        return [];
      }
    }
    
    return data.items;
  } catch (error) {
    console.error(`Error getting items for area ${areaIdentifier}:`, error);
    return [];
  }
}

/**
 * Save a storage item
 */
export async function saveItem(
  userId: string, 
  areaIdentifier: string, 
  item: StorageItem
): Promise<StorageItem> {
  try {
    const timestamp = new Date().toISOString();
    
    // If it's a new item, ensure it has created/updated timestamps
    if (!item.createdAt) {
      item.createdAt = timestamp;
    }
    
    // Always update the updated timestamp
    item.updatedAt = timestamp;
    
    // Ensure item has an ID
    if (!item.id) {
      item.id = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    // Get current items for this area
    const key: StorageKey = {
      id: areaIdentifier
    };
    
    const data = await getItem<AreaItemsData>(STORAGE_TABLE, key);
    let items: StorageItem[] = [];
    
    if (data && data.items) {
      items = data.items;
      // Replace existing item or add new item
      const index = items.findIndex(i => i.id === item.id);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
    } else {
      // No existing items, create a new array with this item
      items = [item];
    }
    
    // Save the entire items array back to the database
    const areaData: AreaItemsData = {
      id: areaIdentifier,
      items: items,
      updatedAt: timestamp
    };
    
    await putItem(STORAGE_TABLE, areaData);
    
    return item;
  } catch (error) {
    console.error(`Error saving item in area ${areaIdentifier}:`, error);
    throw error;
  }
}

/**
 * Delete a storage item
 */
export async function deleteStorageItem(
  userId: string,
  areaIdentifier: string,
  itemId: string
): Promise<boolean> {
  try {
    const key: StorageKey = {
      id: areaIdentifier
    };
    
    const data = await getItem<AreaItemsData>(STORAGE_TABLE, key);
    
    if (!data || !data.items) {
      console.warn(`No items found for area ${areaIdentifier} when attempting to delete item ${itemId}`);
      return false;
    }
    
    // Filter out the item to delete
    const updatedItems = data.items.filter(item => item.id !== itemId);
    
    // Save the updated items array back to the database
    const areaData: AreaItemsData = {
      id: areaIdentifier,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };
    
    await putItem(STORAGE_TABLE, areaData);
    return true;
  } catch (error) {
    console.error(`Error deleting item ${itemId} from area ${areaIdentifier}:`, error);
    return false;
  }
}

/**
 * Get all items (across all areas) that are low in stock
 */
export async function getLowStockItems(userId: string): Promise<(StorageItem & { areaIdentifier: string })[]> {
  try {
    // Get all storage areas
    const allStorageData = await scanItems<AreaItemsData>(STORAGE_TABLE);
    
    // Collect all low stock items
    const lowStockItems: (StorageItem & { areaIdentifier: string })[] = [];
    
    for (const storageData of allStorageData) {
      if (storageData.items && Array.isArray(storageData.items)) {
        // Find items where quantity <= minQuantity
        const lowItems = storageData.items.filter(
          item => item.minQuantity !== undefined && 
                 item.minQuantity > 0 && 
                 item.quantity <= item.minQuantity
        );
        
        // Add area identifier to each item
        lowItems.forEach(item => {
          lowStockItems.push({
            ...item,
            areaIdentifier: storageData.id
          });
        });
      }
    }
    
    return lowStockItems;
  } catch (error) {
    console.error('Error getting low stock items:', error);
    return [];
  }
}

/**
 * Get items by expiry date range
 */
export async function getItemsByExpiryDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<(StorageItem & { areaIdentifier: string })[]> {
  try {
    // Get all storage areas
    const allStorageData = await scanItems<AreaItemsData>(STORAGE_TABLE);
    
    // Collect all items in the expiry date range
    const expiringItems: (StorageItem & { areaIdentifier: string })[] = [];
    
    for (const storageData of allStorageData) {
      if (storageData.items && Array.isArray(storageData.items)) {
        // Find items where expiryDate is in the specified range
        const items = storageData.items.filter(
          item => item.expiryDate && 
                 item.expiryDate >= startDate && 
                 item.expiryDate <= endDate
        );
        
        // Add area identifier to each item
        items.forEach(item => {
          expiringItems.push({
            ...item,
            areaIdentifier: storageData.id
          });
        });
      }
    }
    
    return expiringItems;
  } catch (error) {
    console.error('Error getting items by expiry date range:', error);
    return [];
  }
} 