import { IconType } from 'react-icons';

// Define item interface
export interface StorageItem {
  id: string;
  name: string;
  iconName: string;
  volume?: number;
  quantity: number;
}

// Mock data for various storage locations
const mockItemData: { [key: string]: StorageItem[] } = {
  'kitchen': [
    { id: 'k1', name: 'Plates', iconName: 'FaUtensils', quantity: 8 },
    { id: 'k2', name: 'Glasses', iconName: 'FaWineBottle', volume: 250, quantity: 6 },
    { id: 'k3', name: 'Pots', iconName: 'FaKitchenSet', quantity: 3 },
    { id: 'k4', name: 'Cutlery Set', iconName: 'FaUtensils', quantity: 4 }
  ],
  'bathroom': [
    { id: 'b1', name: 'Toothbrushes', iconName: 'FaToothbrush', quantity: 2 },
    { id: 'b2', name: 'Towels', iconName: 'FaShirt', quantity: 5 },
    { id: 'b3', name: 'Soap', iconName: 'FaPumpSoap', volume: 300, quantity: 2 }
  ],
  'bedroom': [
    { id: 'br1', name: 'Sheets', iconName: 'FaBed', quantity: 2 },
    { id: 'br2', name: 'Pillows', iconName: 'FaBed', quantity: 4 },
    { id: 'br3', name: 'Books', iconName: 'FaBook', quantity: 12 }
  ],
  'living-room': [
    { id: 'lr1', name: 'Cushions', iconName: 'FaCouch', quantity: 6 },
    { id: 'lr2', name: 'Blankets', iconName: 'FaShirt', quantity: 2 },
    { id: 'lr3', name: 'Remote Controls', iconName: 'FaGamepad', quantity: 3 }
  ],
  'dining': [
    { id: 'd1', name: 'Place Mats', iconName: 'FaUtensils', quantity: 6 },
    { id: 'd2', name: 'Table Cloth', iconName: 'FaShirt', quantity: 1 },
    { id: 'd3', name: 'Napkins', iconName: 'FaShirt', quantity: 10 }
  ],
  'shower': [
    { id: 's1', name: 'Shampoo', iconName: 'FaShower', volume: 500, quantity: 1 },
    { id: 's2', name: 'Conditioner', iconName: 'FaShower', volume: 500, quantity: 1 },
    { id: 's3', name: 'Body Wash', iconName: 'FaShower', volume: 750, quantity: 1 }
  ]
};

/**
 * Get items for a specific storage location by ID
 * @param identifier The ID of the storage location
 * @returns Array of items in that storage
 */
export const getItemsByStorageId = (identifier: string): StorageItem[] => {
  // Convert to lowercase for case-insensitive matching
  const normalizedId = identifier.toLowerCase();
  
  // Find items for this storage area (either by exact ID or by category)
  for (const [key, items] of Object.entries(mockItemData)) {
    if (key.toLowerCase() === normalizedId || 
        normalizedId.includes(key.toLowerCase()) || 
        identifier.startsWith(key)) {
      return items;
    }
  }
  
  // Return empty array if no match found
  return [];
};

/**
 * Add a new item to storage
 * @param storageId The storage location ID
 * @param item The item to add (without ID)
 * @returns The added item with generated ID
 */
export const addItemToStorage = (
  storageId: string, 
  item: Omit<StorageItem, 'id'>
): StorageItem => {
  const storageKey = storageId.toLowerCase();
  
  // Generate a new ID
  const newId = `${storageKey.charAt(0)}${Date.now()}`;
  const newItem = { ...item, id: newId };
  
  // If we have this storage already
  if (mockItemData[storageKey]) {
    mockItemData[storageKey].push(newItem);
  } else {
    // Create new storage area
    mockItemData[storageKey] = [newItem];
  }
  
  return newItem;
};

/**
 * Update an item's details
 * @param storageId The storage location ID
 * @param itemId The item ID
 * @param updates The updates to apply
 * @returns The updated item or null if not found
 */
export const updateItem = (
  storageId: string,
  itemId: string,
  updates: Partial<Omit<StorageItem, 'id'>>
): StorageItem | null => {
  const storageKey = storageId.toLowerCase();
  
  if (!mockItemData[storageKey]) return null;
  
  const itemIndex = mockItemData[storageKey].findIndex(item => item.id === itemId);
  if (itemIndex === -1) return null;
  
  // Update the item
  const updatedItem = { 
    ...mockItemData[storageKey][itemIndex], 
    ...updates 
  };
  
  mockItemData[storageKey][itemIndex] = updatedItem;
  return updatedItem;
};

/**
 * Remove an item from storage
 * @param storageId The storage location ID
 * @param itemId The item ID to remove
 * @returns Boolean indicating success
 */
export const removeItem = (storageId: string, itemId: string): boolean => {
  const storageKey = storageId.toLowerCase();
  
  if (!mockItemData[storageKey]) return false;
  
  const initialLength = mockItemData[storageKey].length;
  mockItemData[storageKey] = mockItemData[storageKey].filter(item => item.id !== itemId);
  
  return mockItemData[storageKey].length < initialLength;
}; 