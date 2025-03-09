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

// DynamoDB key structure
interface StorageKey {
  userId: string;
  areaIdentifier: string; // Composite key with userId to partition by area
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
    // Query items for this specific area
    const items = await queryItems<StorageItem & StorageKey>(
      STORAGE_TABLE,
      'userId = :userId AND areaIdentifier = :areaId',
      {
        ':userId': userId,
        ':areaId': areaIdentifier
      }
    );
    
    // Map to remove the key attributes
    return items.map(item => ({
      id: item.id,
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
    
    // Create the full item with key attributes
    const fullItem = {
      ...item,
      userId,
      areaIdentifier,
      // Generate a composite ID for DynamoDB if needed
      dbId: `${userId}-${areaIdentifier}-${item.id}`
    };
    
    await putItem(STORAGE_TABLE, fullItem);
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
    await deleteItem(STORAGE_TABLE, { 
      id: `${userId}-${areaIdentifier}-${itemId}`, // Use composite ID
      userId, 
      areaIdentifier
    });
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
    // We need to scan the table here as we're querying across partitions
    const items = await scanItems<StorageItem & StorageKey & { dbId: string }>(
      STORAGE_TABLE,
      'userId = :userId AND quantity <= minQuantity',
      {
        ':userId': userId
      }
    );
    
    return items.map(item => ({
      id: item.id,
      areaIdentifier: item.areaIdentifier,
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
    const items = await scanItems<StorageItem & StorageKey & { dbId: string }>(
      STORAGE_TABLE,
      'userId = :userId AND expiryDate BETWEEN :start AND :end',
      {
        ':userId': userId,
        ':start': startDate,
        ':end': endDate
      }
    );
    
    return items.map(item => ({
      id: item.id,
      areaIdentifier: item.areaIdentifier,
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
    console.error('Error getting items by expiry date range:', error);
    return [];
  }
} 