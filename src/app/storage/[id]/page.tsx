'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSearch, FaPlus, FaMinus, FaPencilAlt, FaRobot, FaTrash, FaExchangeAlt, FaList, FaTh, FaCheck, FaFilter, FaShoppingBasket } from 'react-icons/fa';
import { CSSTransition, TransitionGroup, SwitchTransition } from 'react-transition-group';
import { getAreaByIdentifier, getAreas } from '../../../util/server-only/gridStorage';
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
import Select from 'react-select';

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

// Custom option component that displays the icon
const IconOption = ({ data, ...props }: any) => (
  <div 
    {...props.innerProps} 
    className={`flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer ${data.color ? data.color + ' bg-opacity-20' : ''}`}
  >
    {data.icon && React.createElement(data.icon, { className: "w-5 h-5 mr-2 text-primary-300" })}
    <span className="text-white">{data.label}</span>
  </div>
);

// Custom value container that displays selected icon
const ValueContainer = ({ data, children, ...props }: any) => (
  <div className={`flex items-center h-full px-3 py-2 ${data?.color ? data.color + ' bg-opacity-20 rounded' : ''}`} style={{ width: '95%' }}>
    {data?.icon && React.createElement(data.icon, { className: "w-5 h-5 mr-3 text-primary-300" })}
    <div className="text-white truncate">{children}</div>
  </div>
);

// Animated Counter Component for smooth transitions
const AnimatedCounter = ({ count, loading }: { count: number, loading: boolean }) => {
  // Create a key that changes when the counter changes for the transition
  const key = loading ? 'loading' : `total-${count}`;
  
  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        key={key}
        timeout={200}
        classNames="counter"
      >
        <p className="font-medium">
          {loading ? 'Loading items...' : 
            `Total ${count} item${count !== 1 ? 's' : ''}`}
        </p>
      </CSSTransition>
    </SwitchTransition>
  );
};

export default function StoragePage({ params }: PageParams) {
  const router = useRouter();
  const { id } = params;
  const decodedId = decodeURIComponent(id);
  
  const [isGridView, setIsGridView] = useState(false);
  
  // Get the area identifier from the URL parameter
  const areaIdentifier = decodedId;
  
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
  
  // Transfer dialog state
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferringItem, setTransferringItem] = useState<StorageItem | null>(null);
  const [availableBoxes, setAvailableBoxes] = useState<{ value: string; label: string }[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
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
  
  // Filter items when search term or low stock filter changes
  useEffect(() => {
    let filtered = [...items];
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTermLower) || 
        (item.category && item.category.toLowerCase().includes(searchTermLower))
      );
    }
    
    // Filter by low stock if enabled
    if (showLowStockOnly) {
      filtered = filtered.filter(item => {
        const minQuantity = item.minQuantity !== undefined ? item.minQuantity : 0;
        return item.quantity <= minQuantity;
      });
    }
    
    setFilteredItems(filtered);
  }, [searchTerm, items, showLowStockOnly]);
  
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
        } else {
          console.error('Failed to delete item');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  // Add this new function to handle opening the transfer dialog
  const handleTransferClick = async (item: StorageItem) => {
    setTransferringItem(item);
    setSelectedBox(null);
    setShowTransferDialog(true);
    
    try {
      // Fetch all storage boxes except the current one
      const allAreas = await getAreas('single-user');
      
      const boxOptions = allAreas
        .filter(area => area.identifier !== areaIdentifier)
        .map(area => ({
          value: area.identifier,
          label: area.name,
          iconName: area.iconName,
          icon: getIconComponent(area.iconName),
          color: area.color
        }));
      
      setAvailableBoxes(boxOptions);
    } catch (error) {
      console.error('Error fetching storage boxes:', error);
    }
  };

  // Add this new function to handle the item transfer
  const handleTransferSave = async () => {
    if (!transferringItem || !selectedBox) return;
    
    setIsTransferring(true);
    
    try {
      // 1. Remove item from current storage
      await deleteItem(areaIdentifier, transferringItem.id);
      
      // 2. Add the item to the destination storage
      await saveItem(selectedBox, transferringItem);
      
      // 3. Update the UI by removing the item from the current list
      const updatedItems = items.filter(item => item.id !== transferringItem.id);
      setItems(updatedItems);
      setFilteredItems(updatedItems);
      
      // 4. Close the dialog
      setShowTransferDialog(false);
      setTransferringItem(null);
      
      console.log(`Item ${transferringItem.name} transferred from ${areaIdentifier} to ${selectedBox}`);
    } catch (error) {
      console.error('Error transferring item:', error);
    } finally {
      setIsTransferring(false);
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
          
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
            {boxName || 'Storage'}
          </h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Low Stock Filter - Modern Custom Checkbox */}
          <label className="flex items-center cursor-pointer mr-2">
            <div className="relative">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="sr-only" // Hide the actual checkbox
              />
              <div className={`w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center ${
                showLowStockOnly 
                  ? 'bg-red-600 border-red-600' 
                  : 'bg-dark-blue-light border-gray-500 hover:border-gray-300'
              }`}>
                {showLowStockOnly && (
                  <FaCheck className="text-white text-xs" />
                )}
              </div>
            </div>
            <div className="ml-2 flex items-center">
              <FaShoppingBasket className="text-gray-300 text-xl" title="Filter Missing Items" />
              <span className="hidden md:inline text-white text-xs md:text-sm ml-1">Missing Items</span>
            </div>
          </label>
          
          {/* View Toggle Button */}
          <button
            onClick={() => setIsGridView(!isGridView)}
            className="bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-2 rounded-md shadow-sm border border-primary-700 transition-colors cursor-pointer flex items-center justify-center"
            aria-label={isGridView ? "Switch to List View" : "Switch to Grid View"}
            title={isGridView ? "Switch to List View" : "Switch to Grid View"}
          >
            {isGridView ? <FaList className="text-lg" /> : <FaTh className="text-lg" />}
            <span className="hidden md:inline ml-2">
              {isGridView ? "List View" : "Grid View"}
            </span>
          </button>
          
          {/* Add Item Button */}
          <button
            onClick={handleAddItemClick}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            <FaPlus className="text-lg md:mr-2" />
            <span className="hidden md:inline">Add Item</span>
          </button>
        </div>
      </div>
      
      {/* Item Count - with animation */}
      <div className="mb-2 text-gray-300 h-6 overflow-hidden">
        <AnimatedCounter count={filteredItems.length} loading={loading} />
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
      ) : isGridView ? (
        // Grid View
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            // Check if this is a low stock item (quantity <= minQuantity)
            const minQuantity = item.minQuantity !== undefined ? item.minQuantity : 0;
            const isLowStock = item.quantity <= minQuantity;
            
            return (
              <CSSTransition
                key={item.id}
                timeout={300}
                classNames="item"
              >
                <div 
                  className={`bg-slate-700 rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${isLowStock ? 'bg-red-900 bg-opacity-70' : ''}`}
                >
                  <div className="p-4 flex flex-col items-center h-full">
                    {/* Title above icon */}
                    <h3 className="font-bold text-xl text-center text-white mb-3">{item.name}</h3>
                    
                    {/* Icon - bigger and centered */}
                    <div className="text-6xl text-gray-300 mb-3 flex-grow flex items-center justify-center">
                      {React.createElement(getIconComponent(item.iconName || 'FaBox'))}
                    </div>
                    
                    {/* Category (if available) */}
                    {item.category && (
                      <span className="bg-primary-800 px-2 py-1 rounded text-xs text-white mb-2">
                        {item.category}
                      </span>
                    )}
                    
                    {/* Notes (if available) */}
                    {item.notes && (
                      <p className="text-sm text-gray-300 mb-2 text-center line-clamp-2">{item.notes}</p>
                    )}
                    
                    {/* Divider */}
                    <div className="w-full border-t border-gray-600 my-2"></div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-between w-full">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-2 text-white hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <FaPencilAlt />
                      </button>
                      
                      <button
                        onClick={() => handleTransferClick(item)}
                        className="p-2 text-white hover:text-blue-400 rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Transfer to Another Storage"
                      >
                        <FaExchangeAlt />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-white hover:text-red-500 rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    {/* Quantity adjustment */}
                    <div className="w-full mt-2 relative pb-6">
                      {/* Display min quantity warning as absolute at bottom right */}
                      {item.minQuantity !== undefined && item.minQuantity > 0 && item.quantity <= item.minQuantity && (
                        <div className="absolute bottom-0 right-0">
                          <span className="bg-red-700 px-1.5 py-0.5 rounded text-xs text-white inline-block">
                            Low Stock (Min: {item.minQuantity})
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center bg-dark-blue rounded-md overflow-hidden w-full justify-center">
                        <button 
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 0}
                          className="p-2 text-white hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                          title="Decrease Quantity"
                        >
                          <FaMinus />
                        </button>
                        
                        <span className="text-white px-2">{item.quantity}</span>
                        
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
                </div>
              </CSSTransition>
            );
          })}
        </div>
      ) : (
        // List View
        <div className="bg-dark-blue rounded-lg shadow-lg overflow-hidden">
          <ul className="divide-y divide-gray-800">
            <TransitionGroup>
              {filteredItems.map(item => {
                // Check if this is a low stock item
                const minQuantity = item.minQuantity !== undefined ? item.minQuantity : 0;
                const isLowStock = item.quantity <= minQuantity;
                
                return (
                  <CSSTransition
                    key={item.id}
                    timeout={300}
                    classNames="item"
                  >
                    <li 
                      className={`p-4 hover:bg-dark-blue-light transition-all duration-300 ${isLowStock ? 'bg-red-900 bg-opacity-70 hover:bg-red-800' : ''}`}
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
                          
                          {/* Transfer button */}
                          <button
                            onClick={() => handleTransferClick(item)}
                            className="p-2 text-white hover:text-blue-400 rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Transfer to Another Storage"
                          >
                            <FaExchangeAlt />
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
                          <div className="flex flex-col items-end">
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
                      </div>
                    </li>
                  </CSSTransition>
                );
              })}
            </TransitionGroup>
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
      
      {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-blue-medium border border-primary-700 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Transfer Item</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-lg text-white mb-2">
                    {transferringItem?.iconName && (
                      <span className="mr-2 inline-block">
                        {React.createElement(getIconComponent(transferringItem.iconName))}
                      </span>
                    )}
                    Transfer <span className="font-bold">{transferringItem?.name}</span> to another storage location:
                  </p>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Destination Storage</label>
                  <Select
                    options={availableBoxes}
                    value={availableBoxes.find(box => box.value === selectedBox)}
                    onChange={(option: any) => setSelectedBox(option.value)}
                    components={{
                      Option: IconOption,
                      SingleValue: ValueContainer
                    }}
                    styles={{
                      control: (base: any) => ({
                        ...base,
                        backgroundColor: '#0a192f', // dark-blue
                        borderColor: '#003d99', // primary-700
                        color: 'white',
                        boxShadow: 'none',
                        minHeight: '48px', // Increased height for better padding
                        height: '48px', // Increased height for better padding
                        display: 'flex',
                        flexDirection: 'row',
                        '&:hover': {
                          borderColor: '#0066ff',
                        },
                      }),
                      valueContainer: (base: any) => ({
                        ...base,
                        height: '48px', // Match control height
                        padding: '0', // Remove default padding since we handle it in the component
                        display: 'flex',
                        alignItems: 'center',
                        flexGrow: 1,
                        overflow: 'hidden',
                        maxWidth: 'calc(100% - 32px)', // Leave space for the dropdown arrow
                      }),
                      menu: (base: any) => ({
                        ...base,
                        backgroundColor: '#0a192f', // dark-blue
                        borderColor: '#003d99', // primary-700
                        color: 'white',
                      }),
                      option: (base: any, state: any) => ({
                        ...base,
                        backgroundColor: state.isFocused ? '#112240' : '#0a192f', // Dark blue when focused
                        color: 'white',
                        width: '100%',
                      }),
                      singleValue: (base: any) => ({
                        ...base,
                        color: 'white',
                        margin: '0',
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }),
                      input: (base: any) => ({
                        ...base,
                        color: 'white',
                        margin: '0',
                        padding: '0',
                      }),
                      placeholder: (base: any) => ({
                        ...base,
                        color: 'rgba(255, 255, 255, 0.6)',
                        margin: '0',
                        padding: '0 0 0 6px', // Add left padding to the placeholder text
                      }),
                      indicatorsContainer: (base: any) => ({
                        ...base,
                        height: '48px', // Match control height
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        position: 'relative',
                      }),
                      dropdownIndicator: (base: any) => ({
                        ...base,
                        padding: '0 8px',
                      }),
                      indicatorSeparator: () => ({
                        display: 'none',
                      }),
                    }}
                    placeholder="Select destination storage..."
                    isSearchable={true}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowTransferDialog(false)}
                  className="px-4 py-2 bg-dark-blue-light hover:bg-dark-blue text-white rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleTransferSave}
                  disabled={!selectedBox || isTransferring}
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ${
                    !selectedBox || isTransferring ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {isTransferring ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 