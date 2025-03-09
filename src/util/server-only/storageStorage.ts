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
  areaIdentifier: string; // The area this item belongs to
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
  updatedAt: string;
  createdAt: string;
}

/**
 * Get all items for a specific area
 */
export async function getAreaItems(userId: string, areaIdentifier: string): Promise<StorageItem[]> {
  try {
    // Instead of using a query, use a scan with a filter for the areaIdentifier
    const items = await scanItems<StorageItem & { id: string, areaIdentifier: string }>(
      STORAGE_TABLE,
      'areaIdentifier = :areaId',
      {
        ':areaId': areaIdentifier
      }
    );
    
    // Map to remove the key attributes
    return items.map(item => ({
      id: item.id.includes(`${areaIdentifier}-`) ? 
        item.id.substring(item.id.indexOf('-') + 1) : item.id, // Extract the original item ID
      name: item.name,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      unit: item.unit,
      notes: item.notes,
      category: item.category,
      expiryDate: item.expiryDate,
      location: item.location,
      imageUrl: item.imageUrl,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt
    }));
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
    
    // Original item ID for returning to the client
    const originalItemId = item.id;
    
    // Create the full item with required DynamoDB attributes
    const fullItem = {
      ...item,
      areaIdentifier,
      // Create a composite ID for the DynamoDB primary key
      id: `${areaIdentifier}-${originalItemId}`
    };
    
    await putItem(STORAGE_TABLE, fullItem);
    
    // Return the original item (without the composite key)
    return {
      ...item,
      id: originalItemId
    };
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
    // The DynamoDB key is just the ID - which is the composite of area and item ID
    const dbKey = { 
      id: `${areaIdentifier}-${itemId}`
    };
    
    await deleteItem(STORAGE_TABLE, dbKey);
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
    // Scan for items where quantity <= minQuantity
    const items = await scanItems<StorageItem & { areaIdentifier: string }>(
      STORAGE_TABLE,
      'quantity <= minQuantity AND minQuantity > :zero',
      {
        ':zero': 0
      }
    );
    
    // Process the items to extract the original ID from the composite key
    return items.map(item => {
      // Extract the original item ID from the composite key if needed
      const id = item.id.includes('-') ? 
        item.id.substring(item.id.indexOf('-') + 1) : item.id;
      
      return {
        ...item,
        id
      };
    });
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
    const items = await scanItems<StorageItem & { areaIdentifier: string }>(
      STORAGE_TABLE,
      'expiryDate BETWEEN :start AND :end',
      {
        ':start': startDate,
        ':end': endDate
      }
    );
    
    // Process the items to extract the original ID from the composite key
    return items.map(item => {
      // Extract the original item ID from the composite key if needed
      const id = item.id.includes('-') ? 
        item.id.substring(item.id.indexOf('-') + 1) : item.id;
      
      return {
        ...item,
        id
      };
    });
  } catch (error) {
    console.error('Error getting items by expiry date range:', error);
    return [];
  }
} 