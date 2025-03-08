'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSearch, FaPlus, FaMinus, FaPencilAlt, FaRobot } from 'react-icons/fa';
import { getAreaById } from '../../../util/storageActions';
import { getItemsByStorageId, StorageItem, updateItem, addItem } from '../../../util/itemActions';
import * as Icons from 'react-icons/fa6';
import { IconType } from 'react-icons';

type PageParams = {
  params: {
    id: string;
  } | Promise<{ id: string }>;
};

// Helper function to unwrap params safely across Next.js versions
function useParams(params: { id: string } | Promise<{ id: string }>): { id: string } {
  // Check if params is a Promise (for future Next.js versions)
  if (params instanceof Promise || typeof (params as any).then === 'function') {
    // Unwrap the Promise using React.use
    return React.use(params as Promise<{ id: string }>);
  }
  
  // Current version of Next.js where params is a direct object
  return params as { id: string };
}

// Get icon component from name
const getIconComponent = (iconName: string): IconType => {
  return (Icons as any)[iconName] || Icons.FaBox;
};

// Available icons for selection
const availableIcons = [
  'FaBox', 'FaKitchenSet', 'FaToilet', 'FaBed', 'FaCouch', 'FaUtensils', 
  'FaShower', 'FaCar', 'FaGamepad', 'FaLaptop', 'FaBook', 'FaWrench',
  'FaWineBottle', 'FaShirt', 'FaGuitar', 'FaUmbrellaBeach', 'FaToothbrush',
  'FaPumpSoap', 'FaBowlFood', 'FaMugHot', 'FaBottleWater'
];

// Empty state content with add button
const EmptyState = ({ onAddClick }: { onAddClick: () => void }) => (
  <div className="text-center py-10">
    <p className="text-gray-100 text-lg font-medium mb-6">
      No items found in this storage location.
    </p>
    <button
      onClick={onAddClick}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center mx-auto transition-all"
    >
      <FaPlus className="mr-2" />
      <span>Add First Item</span>
    </button>
  </div>
);

export default function StoragePage({ params }: PageParams) {
  const router = useRouter();
  
  // Safely unwrap params for current and future Next.js versions
  const unwrappedParams = useParams(params);
  const id = unwrappedParams.id;
  
  const [boxName, setBoxName] = useState('');
  const [items, setItems] = useState<StorageItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<StorageItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<StorageItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editIconName, setEditIconName] = useState('');
  const [editQuantity, setEditQuantity] = useState(0);
  const [editVolume, setEditVolume] = useState<string | undefined>(undefined);
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Add new item dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemIconName, setNewItemIconName] = useState('FaBox');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemVolume, setNewItemVolume] = useState<string | undefined>(undefined);
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Fetch box data and items based on ID
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get box details
        const area = await getAreaById(id);
        if (area) {
          setBoxName(area.name);
        } else {
          console.warn(`Box with ID ${id} not found`);
        }
        
        // Get items for this storage location
        const storageItems = await getItemsByStorageId(id);
        setItems(storageItems);
        setFilteredItems(storageItems);
        
        // Log items to console as requested
        console.log('Items for storage', id, ':', storageItems);
      } catch (error) {
        console.error('Error fetching storage data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  // Filter items when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, items]);
  
  // Handle quantity changes
  const handleQuantityChange = async (itemId: string, change: number) => {
    // Find the item
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    // Mark this item as updating
    setUpdating(itemId);
    
    try {
      // Calculate new quantity (prevent going below 0)
      const newQuantity = Math.max(0, item.quantity + change);
      
      // Update the item on the server
      const updatedItem = await updateItem(id, itemId, { quantity: newQuantity });
      
      if (updatedItem) {
        // Update local state
        const updatedItems = items.map(i => 
          i.id === itemId ? { ...i, quantity: newQuantity } : i
        );
        setItems(updatedItems);
        
        // Also update filtered items
        const updatedFilteredItems = filteredItems.map(i => 
          i.id === itemId ? { ...i, quantity: newQuantity } : i
        );
        setFilteredItems(updatedFilteredItems);
        
        console.log(`Updated quantity for ${updatedItem.name} to ${newQuantity}`);
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
    } finally {
      // Remove updating state
      setUpdating(null);
    }
  };
  
  // Open edit dialog for an item
  const handleEditClick = (item: StorageItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditIconName(item.iconName);
    setEditQuantity(item.quantity);
    setEditVolume(item.volume);
    setEditError('');
    setShowEditDialog(true);
  };
  
  // Handle edit save
  const handleEditSave = async () => {
    if (!editingItem) return;
    
    // Validate inputs
    if (!editName.trim()) {
      setEditError('Name is required');
      return;
    }
    
    // Check for duplicate names (exclude current item)
    const isDuplicate = items.some(
      item => item.id !== editingItem.id && 
      item.name.toLowerCase() === editName.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      setEditError('Another item with this name already exists in this storage');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Create updates object
      const updates: Partial<Omit<StorageItem, 'id'>> = {
        name: editName.trim(),
        iconName: editIconName,
        quantity: editQuantity
      };
      
      // Only include volume if it's defined
      if (editVolume !== undefined) {
        updates.volume = editVolume;
      }
      
      // Update the item
      const updatedItem = await updateItem(id, editingItem.id, updates);
      
      if (updatedItem) {
        // Update local state
        const updatedItems = items.map(i => 
          i.id === editingItem.id ? updatedItem : i
        );
        setItems(updatedItems);
        
        // Also update filtered items
        const updatedFilteredItems = filteredItems.map(i => 
          i.id === editingItem.id ? updatedItem : i
        );
        setFilteredItems(updatedFilteredItems);
        
        // Close the dialog
        setShowEditDialog(false);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setEditError('Failed to update item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handler to open the Add Item dialog
  const handleAddItemClick = () => {
    setNewItemName('');
    setNewItemIconName('FaBox');
    setNewItemQuantity(1);
    setNewItemVolume(undefined);
    setAddError('');
    setShowAddDialog(true);
  };
  
  // Handler to add a new item
  const handleAddItemSave = async () => {
    // Validate inputs
    if (!newItemName.trim()) {
      setAddError('Name is required');
      return;
    }
    
    // Check for duplicate names
    const isDuplicate = items.some(
      item => item.name.toLowerCase() === newItemName.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      setAddError('An item with this name already exists in this storage');
      return;
    }
    
    setIsAdding(true);
    
    try {
      // Create new item object
      const newItemData: Omit<StorageItem, 'id'> = {
        name: newItemName.trim(),
        iconName: newItemIconName,
        quantity: newItemQuantity
      };
      
      // Only include volume if it's defined
      if (newItemVolume !== undefined) {
        newItemData.volume = newItemVolume;
      }
      
      // Add the item
      const addedItem = await addItem(id, newItemData);
      
      if (addedItem) {
        // Update local state
        const updatedItems = [...items, addedItem];
        setItems(updatedItems);
        setFilteredItems(updatedItems);
        
        // Close the dialog
        setShowAddDialog(false);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setAddError('Failed to add item. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleBackClick = () => {
    router.push('/home');
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Storage Details</h1>
        <button
          onClick={handleBackClick}
          className="flex items-center bg-dark-blue hover:bg-dark-blue-light text-white hover:text-secondary-500 px-3 py-2 rounded-md shadow-sm border border-primary-700 transition-colors cursor-pointer action-button"
        >
          <FaArrowLeft className="mr-2" />
          <span>Back to Dashboard</span>
        </button>
      </div>
      
      <div className="bg-dark-blue rounded-lg shadow-lg p-6 flex-grow">
        <h2 className="text-xl font-semibold text-white mb-4">{boxName || 'Unknown Box'}</h2>
        <p className="text-gray-100 mb-6">Box Identifier: {id}</p>
        
        {/* Search */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-200" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white placeholder-gray-300"
          />
        </div>
        
        {/* Loading State */}
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary-500 mb-2"></div>
            <p className="text-gray-100">Loading items...</p>
          </div>
        ) : (
          <>
            {/* Item List */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                {items.length === 0 ? (
                  <EmptyState onAddClick={handleAddItemClick} />
                ) : (
                  <p className="text-gray-100 text-lg font-medium">
                    No items match your search.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-primary-700">
                <ul className="divide-y divide-primary-700">
                  {filteredItems.map(item => {
                    const Icon = getIconComponent(item.iconName);
                    const isUpdating = updating === item.id;
                    
                    return (
                      <li key={item.id} className="p-4 hover:bg-dark-blue-light transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <div className={`bg-blue-500 p-2 rounded-md`}>
                              <Icon className="text-white text-xl" />
                            </div>
                            <div>
                              <h3 className="text-white font-medium">{item.name}</h3>
                              {item.volume && (
                                <p className="text-gray-200 text-sm">Volume: {item.volume}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Edit button */}
                            <button
                              onClick={() => handleEditClick(item)}
                              className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-md w-8 h-8 flex items-center justify-center transition-colors"
                              disabled={isUpdating}
                              title="Edit item"
                            >
                              <FaPencilAlt />
                            </button>
                            
                            {/* Quantity controls */}
                            <button 
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className={`bg-red-600 hover:bg-red-700 text-white p-1 rounded-md w-8 h-8 flex items-center justify-center transition-colors ${isUpdating ? 'opacity-50' : ''}`}
                              disabled={item.quantity <= 0 || isUpdating}
                              title="Decrease quantity"
                            >
                              {isUpdating ? (
                                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                              ) : (
                                <FaMinus />
                              )}
                            </button>
                            <span className="text-white font-medium text-lg w-8 text-center">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className={`bg-green-600 hover:bg-green-700 text-white p-1 rounded-md w-8 h-8 flex items-center justify-center transition-colors ${isUpdating ? 'opacity-50' : ''}`}
                              disabled={isUpdating}
                              title="Increase quantity"
                            >
                              {isUpdating ? (
                                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                              ) : (
                                <FaPlus />
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            {/* Summary */}
            <div className="mt-6 p-4 bg-dark-blue-light rounded-md">
              <p className="text-white font-semibold">
                {filteredItems.length > 0 
                  ? `Showing ${filteredItems.length} of ${items.length} items.` 
                  : items.length > 0 ? 'No matching items found.' : 'No items in this storage.'}
              </p>
              <p className="text-gray-200 mt-2 font-medium">
                Total quantity: {filteredItems.reduce((sum, item) => sum + item.quantity, 0)} items
              </p>
            </div>
          </>
        )}
      </div>
      
      {/* Footer - Joke about AI in bottom right */}
      <footer className="mt-8 py-4 border-t border-primary-700 relative">
        <div className="absolute bottom-4 right-4">
          <p className="text-black font-semibold text-right flex items-center justify-end">
            <FaRobot className="ml-1 mr-2 text-primary-600" />
            This website was entirely generated by AI
          </p>
        </div>
      </footer>
      
      {/* Edit Item Dialog */}
      {showEditDialog && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-blue bg-opacity-90 border-2 border-primary-700 rounded-lg shadow-lg p-6 w-[500px] max-w-[90vw]">
            <h3 className="text-xl font-bold text-white mb-4">Edit Item</h3>
            
            {editError && (
              <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-md text-white">
                {editError}
              </div>
            )}
            
            <div className="flex flex-col space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-gray-200 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white placeholder-gray-400"
                  placeholder="Item name"
                />
              </div>
              
              {/* Quantity field */}
              <div>
                <label className="block text-gray-200 mb-1">Quantity</label>
                <input
                  type="number"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white"
                />
              </div>
              
              {/* Volume field (optional) - now accepting any string */}
              <div>
                <label className="block text-gray-200 mb-1">
                  Volume <span className="text-gray-400 text-sm">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editVolume === undefined ? '' : editVolume}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditVolume(val === '' ? undefined : val);
                  }}
                  className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white"
                  placeholder="e.g. 250ml, 2L, half-full, etc."
                />
              </div>
              
              {/* Icon selection */}
              <div>
                <label className="block text-gray-200 mb-1">Icon</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-40 overflow-y-auto bg-dark-blue-light bg-opacity-70 p-2 rounded-md">
                  {availableIcons.map(iconName => {
                    const IconComponent = getIconComponent(iconName);
                    return (
                      <button
                        key={iconName}
                        type="button"
                        className={`p-2 rounded-md ${iconName === editIconName ? 'bg-primary-700 ring-2 ring-white' : 'bg-dark-blue hover:bg-dark-blue-light'} transition-colors cursor-pointer`}
                        onClick={() => setEditIconName(iconName)}
                        title={iconName.replace('Fa', '')}
                      >
                        <IconComponent className="text-white text-xl mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowEditDialog(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  className={`bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors flex items-center ${isSaving ? 'opacity-70' : ''}`}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Item Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-blue bg-opacity-90 border-2 border-primary-700 rounded-lg shadow-lg p-6 w-[500px] max-w-[90vw]">
            <h3 className="text-xl font-bold text-white mb-4">Add New Item</h3>
            
            {addError && (
              <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-md text-white">
                {addError}
              </div>
            )}
            
            <div className="flex flex-col space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-gray-200 mb-1">Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white placeholder-gray-400"
                  placeholder="Item name"
                />
              </div>
              
              {/* Quantity field */}
              <div>
                <label className="block text-gray-200 mb-1">Quantity</label>
                <input
                  type="number"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white"
                />
              </div>
              
              {/* Volume field (optional) - now accepting any string */}
              <div>
                <label className="block text-gray-200 mb-1">
                  Volume <span className="text-gray-400 text-sm">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newItemVolume === undefined ? '' : newItemVolume}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewItemVolume(val === '' ? undefined : val);
                  }}
                  className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white"
                  placeholder="e.g. 250ml, 2L, half-full, etc."
                />
              </div>
              
              {/* Icon selection */}
              <div>
                <label className="block text-gray-200 mb-1">Icon</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-40 overflow-y-auto bg-dark-blue-light bg-opacity-70 p-2 rounded-md">
                  {availableIcons.map(iconName => {
                    const IconComponent = getIconComponent(iconName);
                    return (
                      <button
                        key={iconName}
                        type="button"
                        className={`p-2 rounded-md ${iconName === newItemIconName ? 'bg-primary-700 ring-2 ring-white' : 'bg-dark-blue hover:bg-dark-blue-light'} transition-colors cursor-pointer`}
                        onClick={() => setNewItemIconName(iconName)}
                        title={iconName.replace('Fa', '')}
                      >
                        <IconComponent className="text-white text-xl mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItemSave}
                  className={`bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors flex items-center ${isAdding ? 'opacity-70' : ''}`}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Item</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add a floating action button for adding items when there are already some items */}
      {items.length > 0 && !loading && (
        <button
          onClick={handleAddItemClick}
          className="fixed bottom-8 right-8 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 cursor-pointer"
          title="Add New Item"
        >
          <FaPlus className="text-xl" />
        </button>
      )}
    </div>
  );
}

// Add a comment about the params handling that meets Next.js requirements
// While direct access to params.id is supported in the current version of Next.js,
// in future versions we'll need to unwrap params with React.use() before accessing properties.
// This will be updated when upgrading to the newer Next.js version that requires it. 