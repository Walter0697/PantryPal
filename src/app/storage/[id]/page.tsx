'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSearch, FaPlus, FaMinus, FaPencilAlt, FaRobot, FaTrash } from 'react-icons/fa';
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
import StorageIconSelect from '../../../components/StorageIconSelect';

type PageParams = {
  params: {
    id: string;
  };
};

// Get icon component from name
const getIconComponent = (iconName: string): IconType => {
  return (Icons as any)[iconName] || Icons.FaBox;
};

// Available icons for selection
const availableIcons = [
  // Food ingredients and drinks
  'FaBowlFood', 'FaAppleWhole', 'FaEgg', 'FaBreadSlice', 'FaMeatFrozen', 'FaFish',
  'FaBottleWater', 'FaWineBottle', 'FaMugHot',
  
  // Sauces and seasonings
  'FaJar', 'FaBottleDroplet', 'FaDroplet', 'FaPepperHot',
  
  // Cleaning items
  'FaPumpSoap', 'FaSprayCanSparkles', 'FaBroom', 'FaSoap',
  
  // Toilet products
  'FaToilet', 'FaToothbrush', 'FaShower', 'FaHandSparkles',
  
  // Tissue paper
  'FaToiletPaper', 'FaBox', 'FaScroll',
  
  // Electronic items
  'FaLaptop', 'FaMobile', 'FaHeadphones', 'FaPlug', 'FaBatteryFull',
  
  // Generic/Other
  'FaKitchenSet', 'FaBed', 'FaCouch', 'FaUtensils', 'FaCar', 'FaGamepad',
  'FaBook', 'FaWrench', 'FaShirt', 'FaUmbrellaBeach'
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
  
  // Get the area identifier from the URL parameter
  const areaIdentifier = params.id;
  
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
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = items.filter(item => 
        item.name.toLowerCase().includes(searchTermLower) || 
        (item.category && item.category.toLowerCase().includes(searchTermLower))
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

  // Handle item deletion
  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        const success = await deleteItem(areaIdentifier, itemId);
        
        if (success) {
          // Update local state by removing the item
          const updatedItems = items.filter(item => item.id !== itemId);
          setItems(updatedItems);
          setFilteredItems(filteredItems.filter(item => item.id !== itemId));
          console.log(`Item ${itemId} deleted successfully`);
        } else {
          console.error('Failed to delete item');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  // Render the page
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header with Back Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackClick}
            className="bg-dark-blue hover:bg-dark-blue-light text-white p-2 rounded-md shadow-sm border border-primary-700 cursor-pointer"
            aria-label="Back to Home"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          
          <h1 className="text-2xl font-bold text-white">
            {boxName || 'Storage'}
          </h1>
        </div>
        
        {/* Add Item Button */}
        <button
          onClick={handleAddItemClick}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors flex items-center cursor-pointer"
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
            {filteredItems.map(item => {
              // Check if this is a low stock item (quantity <= minQuantity)
              // Use 0 as default minimum quantity if undefined
              const minQuantity = item.minQuantity !== undefined ? item.minQuantity : 0;
              const isLowStock = item.quantity <= minQuantity;
              
              return (
                <li 
                  key={item.id} 
                  className={`p-4 hover:bg-dark-blue-light transition-colors ${isLowStock ? 'bg-red-900 bg-opacity-70 hover:bg-red-800' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {item.iconName && (
                        <div className="text-2xl text-gray-300">
                          {React.createElement(getIconComponent(item.iconName))}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg text-black">{item.name}</h3>
                        <div className="text-sm text-black flex items-center space-x-2 font-medium">
                          <span className={`${isLowStock ? 'text-white font-bold' : ''}`}>
                            Quantity: {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                          </span>
                          {item.minQuantity !== undefined && item.minQuantity > 0 && (
                            <span className={`${isLowStock ? 'bg-red-700' : 'bg-gray-800'} px-1.5 py-0.5 rounded text-xs text-white`}>
                              Min: {item.minQuantity}
                            </span>
                          )}
                          {item.category && (
                            <span className="bg-primary-800 px-1.5 py-0.5 rounded text-xs text-white">
                              {item.category}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-sm text-black mt-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Edit button */}
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-2 text-white hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <FaPencilAlt />
                      </button>
                      
                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-white hover:text-red-500 rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <FaTrash />
                      </button>
                      
                      {/* Quantity adjustment buttons */}
                      <div className="flex items-center bg-dark-blue-light rounded-md overflow-hidden">
                        <button 
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 0}
                          className="p-2 text-white hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                          title="Decrease Quantity"
                        >
                          <FaMinus />
                        </button>
                        
                        <span className="text-black px-2">{item.quantity}</span>
                        
                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="p-2 text-white hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                          title="Increase Quantity"
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
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
                  <StorageIconSelect
                    value={editIconName}
                    onChange={setEditIconName}
                  />
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
                  className="px-4 py-2 bg-dark-blue-light hover:bg-dark-blue text-white rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer"
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
                  <StorageIconSelect
                    value={newItemIconName}
                    onChange={setNewItemIconName}
                  />
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
                  className="px-4 py-2 bg-dark-blue-light hover:bg-dark-blue text-white rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItemSave}
                  disabled={isAdding}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer"
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