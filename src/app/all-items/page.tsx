'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSearch, FaPlus, FaMinus, FaBox, FaExchangeAlt, FaPencilAlt, FaTrash, FaCheck, FaShoppingBasket, FaTimes } from 'react-icons/fa';
import * as Icons from 'react-icons/fa6';
import { IconType } from 'react-icons';
import { CSSTransition, TransitionGroup, SwitchTransition } from 'react-transition-group';
import { getAllStorageItems, StorageWithItems } from '../actions';
import { StorageItem } from '../../util/storageItems';

// Get icon component from name
const getIconComponent = (iconName: string): IconType => {
  return (Icons as any)[iconName] || Icons.FaBox;
};

// Animated Counter Component for smooth transitions
const AnimatedCounter = ({ count, loading, isSmall = false }: { count: number, loading: boolean, isSmall?: boolean }) => {
  // Create a key that changes when the counter changes for the transition
  const key = loading ? 'loading' : `total-${count}`;
  
  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        key={key}
        timeout={200}
        classNames="counter"
      >
        <p className={`font-medium ${isSmall ? 'text-sm text-white' : ''}`}>
          {loading ? (isSmall ? 'Loading...' : 'Loading items...') : 
            isSmall ? 
            `${count} ${count === 1 ? 'item' : 'items'}` : 
            `Total ${count} item${count !== 1 ? 's' : ''}`}
        </p>
      </CSSTransition>
    </SwitchTransition>
  );
};

export default function AllItemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allStorages, setAllStorages] = useState<StorageWithItems[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStorages, setFilteredStorages] = useState<StorageWithItems[]>([]);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Calculate total items
  const totalItems = React.useMemo(() => {
    return filteredStorages.reduce((total, storage) => total + storage.items.length, 0);
  }, [filteredStorages]);
  
  // Fetch all storage items on component mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getAllStorageItems();
        setAllStorages(data);
        setFilteredStorages(data);
      } catch (error) {
        console.error('Error fetching all storage items:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // Filter items when search term or low stock filter changes
  useEffect(() => {
    const filtered = allStorages.map(storage => {
      // First filter by search term
      let filteredItems = storage.items;
      
      if (searchTerm.trim() !== '') {
        const searchTermLower = searchTerm.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.name.toLowerCase().includes(searchTermLower) || 
          (item.category && item.category.toLowerCase().includes(searchTermLower))
        );
      }
      
      // Then filter by low stock if enabled
      if (showLowStockOnly) {
        filteredItems = filteredItems.filter(item => {
          const minQuantity = item.minQuantity !== undefined ? item.minQuantity : 0;
          return item.quantity <= minQuantity;
        });
      }
      
      // Return a new storage object with only the filtered items
      return {
        ...storage,
        items: filteredItems
      };
    }).filter(storage => storage.items.length > 0); // Only keep storages with matching items
    
    setFilteredStorages(filtered);
  }, [searchTerm, allStorages, showLowStockOnly]);
  
  // Navigate back to home
  const handleBackClick = () => {
    router.push('/home');
  };
  
  // Navigate to storage detail page
  const handleStorageClick = (identifier: string) => {
    router.push(`/storage/${encodeURIComponent(identifier)}`);
  };
  
  // Navigate to edit item page
  const handleEditItem = (storageIdentifier: string, item: StorageItem) => {
    // Navigate to the storage page with focus on the item
    router.push(`/storage/${encodeURIComponent(storageIdentifier)}?editItem=${item.id}`);
  };

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
            All Items
          </h1>
        </div>
        
        {/* Low Stock Filter - Modern Custom Checkbox */}
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
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
        </div>
      </div>
      
      {/* Item Count - with animation */}
      <div className="mb-2 text-gray-300 h-6 overflow-hidden">
        <AnimatedCounter count={totalItems} loading={loading} />
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
          placeholder="Search items across all storages..."
          className="w-full pl-10 pr-10 py-2 bg-dark-blue-light border border-primary-700 rounded-md text-white"
        />
        {searchTerm && (
          <div 
            className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
          >
            <FaTimes className="text-gray-400 hover:text-white transition-colors" />
          </div>
        )}
      </div>
      
      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredStorages.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-100 text-lg font-medium mb-6">
            No items found across any storage.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <TransitionGroup>
            {filteredStorages.map(storage => (
              <CSSTransition
                key={storage.identifier}
                timeout={300}
                classNames="item"
              >
                <div className="bg-dark-blue rounded-lg shadow-lg overflow-hidden mb-6">
                  {/* Storage Header */}
                  <div 
                    className={`${storage.color || 'bg-blue-600'} p-4 flex items-center justify-between cursor-pointer`}
                    onClick={() => handleStorageClick(storage.identifier)}
                  >
                    <div className="flex items-center space-x-3">
                      {storage.iconName && (
                        <div className="text-2xl text-white">
                          {React.createElement(getIconComponent(storage.iconName))}
                        </div>
                      )}
                      <h2 className="text-xl font-bold text-white">{storage.name}</h2>
                    </div>
                    <div className="h-5">
                      <AnimatedCounter count={storage.items.length} loading={false} isSmall={true} />
                    </div>
                  </div>
                  
                  {/* Items List */}
                  <ul className="divide-y divide-gray-800">
                    <TransitionGroup>
                      {storage.items.map(item => {
                        // Check if this is a low stock item
                        const minQuantity = item.minQuantity !== undefined ? item.minQuantity : 0;
                        const isLowStock = item.quantity <= minQuantity;
                        
                        return (
                          <CSSTransition
                            key={`${storage.identifier}-${item.id}`}
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
                                    <h3 className="font-semibold text-lg text-white">
                                      {item.name}
                                      {item.unit && <span className="text-blue-300 text-sm ml-1 font-medium">({item.unit})</span>}
                                    </h3>
                                    <div className="text-sm text-gray-300 flex items-center space-x-2 font-medium">
                                      <span className={`${isLowStock ? 'text-red-300 font-bold' : ''}`}>
                                        Quantity: <span className="font-bold">{item.quantity}</span>
                                      </span>
                                      {item.category && (
                                        <span className="bg-primary-800 px-1.5 py-0.5 rounded text-xs text-white">
                                          {item.category}
                                        </span>
                                      )}
                                    </div>
                                    {item.notes && (
                                      <p className="text-sm text-gray-400 mt-1">{item.notes}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {/* Navigate to storage button */}
                                  <button
                                    onClick={() => handleStorageClick(storage.identifier)}
                                    className="p-2 text-white hover:text-blue-400 rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                                    title={`Go to ${storage.name}`}
                                  >
                                    <FaBox />
                                  </button>
                                  
                                  {/* Edit button */}
                                  <button
                                    onClick={() => handleEditItem(storage.identifier, item)}
                                    className="p-2 text-white hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                                    title="Edit Item"
                                  >
                                    <FaPencilAlt />
                                  </button>
                                </div>
                              </div>
                            </li>
                          </CSSTransition>
                        );
                      })}
                    </TransitionGroup>
                  </ul>
                </div>
              </CSSTransition>
            ))}
          </TransitionGroup>
        </div>
      )}
    </div>
  );
} 