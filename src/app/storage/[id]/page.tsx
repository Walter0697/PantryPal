'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSearch, FaPlus, FaMinus, FaPencilAlt, FaRobot } from 'react-icons/fa';
import { getAreaByIdentifier } from '../../../util/server-only/gridStorage';
import { 
  getAreaItems, 
  saveItem, 
  deleteItem,
  StorageItem,
  createNewItem
} from '../../../util/storageItems';
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
  const areaIdentifier = unwrappedParams.id;
  
  const [boxName, setBoxName] = useState('');
  const [boxIdentifier, setBoxIdentifier] = useState('');
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
  const [editMinQuantity, setEditMinQuantity] = useState(0);
  const [editUnit, setEditUnit] = useState<string | undefined>(undefined);
  const [editNotes, setEditNotes] = useState<string | undefined>(undefined);
  const [editCategory, setEditCategory] = useState<string | undefined>(undefined);
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Add new item dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemIconName, setNewItemIconName] = useState('FaBox');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemMinQuantity, setNewItemMinQuantity] = useState(0);
  const [newItemUnit, setNewItemUnit] = useState<string | undefined>(undefined);
  const [newItemNotes, setNewItemNotes] = useState<string | undefined>(undefined);
  const [newItemCategory, setNewItemCategory] = useState<string | undefined>(undefined);
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Fetch box data and items based on ID
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get box details using the area identifier - no userId needed as we're a single-user app
        const area = await getAreaByIdentifier('single-user', areaIdentifier);
        if (area) {
          setBoxName(area.name);
          setBoxIdentifier(area.identifier);
        } else {
          console.warn(`Box with identifier ${areaIdentifier} not found`);
        }
        
        // Get items for this storage location - areaIdentifier is the key in our database
        const storageItems = await getAreaItems(areaIdentifier);
        setItems(storageItems);
        setFilteredItems(storageItems);
        
        // Log items to console
        console.log('Items for storage', areaIdentifier, ':', storageItems);
      } catch (error) {
        console.error('Error fetching storage data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [areaIdentifier]);
  
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
      
      // Update the item in the database
      const updatedItem = await saveItem(areaIdentifier, { 
        ...item, 
        quantity: newQuantity 
      });
      
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
    setEditIconName(item.iconName || 'FaBox');
    setEditQuantity(item.quantity);
    setEditMinQuantity(item.minQuantity || 0);
    setEditUnit(item.unit);
    setEditNotes(item.notes);
    setEditCategory(item.category);
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
      // Create updated item
      const updatedItemData: StorageItem = {
        ...editingItem,
        name: editName.trim(),
        iconName: editIconName,
        quantity: editQuantity,
        minQuantity: editMinQuantity,
        unit: editUnit,
        notes: editNotes,
        category: editCategory,
        updatedAt: new Date().toISOString()
      };
      
      // Update the item in the database
      const updatedItem = await saveItem(areaIdentifier, updatedItemData);
      
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
    setNewItemMinQuantity(0);
    setNewItemUnit('');
    setNewItemNotes('');
    setNewItemCategory('');
    setAddError('');
    setShowAddDialog(true);
  };
  
  // Handle adding a new item
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
      const newItem = createNewItem(newItemName.trim());
      newItem.iconName = newItemIconName;
      newItem.quantity = newItemQuantity;
      newItem.minQuantity = newItemMinQuantity;
      
      if (newItemUnit) newItem.unit = newItemUnit;
      if (newItemNotes) newItem.notes = newItemNotes;
      if (newItemCategory) newItem.category = newItemCategory;
      
      // Save the item to the database
      const savedItem = await saveItem(areaIdentifier, newItem);
      
      if (savedItem) {
        // Update local state
        const updatedItems = [...items, savedItem];
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
  
  // Navigate back to home
  const handleBackClick = () => {
    router.push('/home');
  };

  // Render the page
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header with Back Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackClick}
            className="bg-dark-blue hover:bg-dark-blue-light text-white p-2 rounded-md shadow-sm border border-primary-700"
            aria-label="Back to Home"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          
          <h1 className="text-2xl font-bold text-white">
            {boxName || 'Storage'}
          </h1>
          
          {boxIdentifier && (
            <span className="text-gray-400 text-sm bg-dark-blue px-2 py-1 rounded-md">
              {boxIdentifier}
            </span>
          )}
        </div>
        
        {/* Add Item Button */}
        <button
          onClick={handleAddItemClick}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors flex items-center"
        >
          <FaPlus className="mr-2" />
          <span>Add Item</span>
        </button>
      </div>
      
      {/* Search Box */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search items..."
          className="w-full pl-10 pr-4 py-2 bg-dark-blue-light border border-primary-700 rounded-md text-white"
        />
      </div>
      
      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState onAddClick={handleAddItemClick} />
      ) : (
        <div className="bg-dark-blue rounded-lg shadow-lg overflow-hidden">
          <ul className="divide-y divide-gray-800">
            {filteredItems.map(item => (
              <li key={item.id} className="p-4 hover:bg-dark-blue-light transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {item.iconName && (
                      <div className="text-2xl text-gray-300">
                        {React.createElement(getIconComponent(item.iconName))}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg text-white">{item.name}</h3>
                      <div className="text-sm text-gray-400 flex items-center space-x-2">
                        <span>Quantity: {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                        {item.minQuantity !== undefined && item.minQuantity > 0 && (
                          <span className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                            Min: {item.minQuantity}
                          </span>
                        )}
                        {item.category && (
                          <span className="bg-primary-800 px-1.5 py-0.5 rounded text-xs">
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Edit button */}
                    <button
                      onClick={() => handleEditClick(item)}
                      className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
                      title="Edit Item"
                    >
                      <FaPencilAlt />
                    </button>
                    
                    {/* Quantity adjustment buttons */}
                    <div className="flex items-center bg-dark-blue-light rounded-md overflow-hidden">
                      <button
                        disabled={updating === item.id}
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                        title="Decrease Quantity"
                      >
                        <FaMinus />
                      </button>
                      
                      <span className="w-10 text-center font-mono text-white">
                        {updating === item.id ? '...' : item.quantity}
                      </span>
                      
                      <button
                        disabled={updating === item.id}
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                        title="Increase Quantity"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Edit Item Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-blue-medium border border-primary-700 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Edit Item</h2>
              
              {editError && (
                <div className="bg-red-900 text-white p-3 rounded-md mb-4">
                  {editError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Icon</label>
                  <select
                    value={editIconName}
                    onChange={(e) => setEditIconName(e.target.value)}
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  >
                    {availableIcons.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                      className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-1">Min Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={editMinQuantity}
                      onChange={(e) => setEditMinQuantity(parseInt(e.target.value) || 0)}
                      className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Unit (optional)</label>
                  <input
                    type="text"
                    value={editUnit || ''}
                    onChange={(e) => setEditUnit(e.target.value || undefined)}
                    placeholder="e.g. kg, lbs, pcs"
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Category (optional)</label>
                  <input
                    type="text"
                    value={editCategory || ''}
                    onChange={(e) => setEditCategory(e.target.value || undefined)}
                    placeholder="e.g. Produce, Dairy, Cleaning"
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Notes (optional)</label>
                  <textarea
                    value={editNotes || ''}
                    onChange={(e) => setEditNotes(e.target.value || undefined)}
                    rows={3}
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditDialog(false)}
                  className="px-4 py-2 bg-dark-blue-light hover:bg-dark-blue text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Item Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-blue-medium border border-primary-700 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Add New Item</h2>
              
              {addError && (
                <div className="bg-red-900 text-white p-3 rounded-md mb-4">
                  {addError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Icon</label>
                  <select
                    value={newItemIconName}
                    onChange={(e) => setNewItemIconName(e.target.value)}
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  >
                    {availableIcons.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 0)}
                      className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-1">Min Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={newItemMinQuantity}
                      onChange={(e) => setNewItemMinQuantity(parseInt(e.target.value) || 0)}
                      className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Unit (optional)</label>
                  <input
                    type="text"
                    value={newItemUnit || ''}
                    onChange={(e) => setNewItemUnit(e.target.value || undefined)}
                    placeholder="e.g. kg, lbs, pcs"
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Category (optional)</label>
                  <input
                    type="text"
                    value={newItemCategory || ''}
                    onChange={(e) => setNewItemCategory(e.target.value || undefined)}
                    placeholder="e.g. Produce, Dairy, Cleaning"
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Notes (optional)</label>
                  <textarea
                    value={newItemNotes || ''}
                    onChange={(e) => setNewItemNotes(e.target.value || undefined)}
                    rows={3}
                    className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 bg-dark-blue-light hover:bg-dark-blue text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItemSave}
                  disabled={isAdding}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isAdding ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 