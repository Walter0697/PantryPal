'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaEdit, FaTrash, FaArrowLeft, FaSave, FaTimesCircle, FaPlus, FaLayerGroup } from 'react-icons/fa';
import { IconType } from 'react-icons';
import * as Icons from 'react-icons/fa6';
import { AreaItem, getAreas, updateArea, removeArea, addArea, isAreaNameDuplicate, isAreaIdentifierDuplicate } from '../../util/storage';
import RoomIconSelect from '../../components/RoomIconSelect';

export default function ListPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [filteredAreas, setFilteredAreas] = useState<AreaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [newBoxColor, setNewBoxColor] = useState('bg-blue-500');
  const [newBoxIcon, setNewBoxIcon] = useState('FaBox');
  const [newBoxIdentifier, setNewBoxIdentifier] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Colors available for selection
  const colorOptions = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 
    'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500'
  ];

  // Popular icons for selection
  const popularIcons = [
    'FaBox', 'FaKitchenSet', 'FaToilet', 'FaBed', 'FaCouch', 'FaUtensils', 
    'FaShower', 'FaCar', 'FaGamepad', 'FaLaptop', 'FaBook', 'FaWrench',
    'FaWineBottle', 'FaShirt', 'FaGuitar', 'FaUmbrellaBeach'
  ];

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const loadedAreas = await getAreas();
        setAreas(loadedAreas);
        setFilteredAreas(loadedAreas);
      } catch (error) {
        console.error('Error loading areas:', error);
        setAreas([]);
        setFilteredAreas([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter areas when search term changes
  useEffect(() => {
    if (areas && areas.length > 0) {
      if (searchTerm) {
        const filtered = areas.filter((area: AreaItem) => 
          area.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredAreas(filtered);
      } else {
        setFilteredAreas(areas);
      }
    }
  }, [searchTerm, areas]);

  // Handle back button click
  const handleBackClick = () => {
    router.push('/home');
  };

  // Start editing an item
  const handleEditClick = (item: AreaItem) => {
    setEditingItem(item.id);
    setEditName(item.name);
    setEditColor(item.color);
    setEditIcon(item.iconName);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditName('');
    setEditColor('');
    setEditIcon('');
  };

  // Save edited item
  const handleSaveEdit = async (id: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      alert("Box name cannot be empty");
      return;
    }
    
    try {
      // Update the area
      const updatedArea = await updateArea(id, {
        name: trimmedName,
        color: editColor,
        iconName: editIcon
      });
      
      if (updatedArea) {
        // Refresh the data
        const updatedAreas = await getAreas();
        setAreas(updatedAreas);
        setFilteredAreas(updatedAreas);
        
        // Reset edit state
        setEditingItem(null);
        setEditName('');
        setEditColor('');
        setEditIcon('');
      }
    } catch (error) {
      console.error('Error saving area:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Remove an item
  const handleRemoveClick = async (id: string) => {
    if (confirm('Are you sure you want to remove this box?')) {
      try {
        // Remove the area and its layout entries
        const success = await removeArea(id);
        
        if (success) {
          // Refresh the data
          const updatedAreas = await getAreas();
          setAreas(updatedAreas);
          setFilteredAreas(updatedAreas);
        }
      } catch (error) {
        console.error('Error removing area:', error);
        alert('Failed to remove the box. Please try again.');
      }
    }
  };

  // Get icon component from name
  const getIconComponent = (iconName: string): IconType => {
    return (Icons as any)[iconName] || Icons.FaBox;
  };

  // Show create dialog
  const handleCreateClick = () => {
    setShowCreateDialog(true);
    setNewBoxName('');
    setNewBoxColor('bg-blue-500');
    setNewBoxIcon('FaBox');
    setNewBoxIdentifier('');
  };

  // Cancel create dialog
  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setNewBoxName('');
    setNewBoxColor('bg-blue-500');
    setNewBoxIcon('FaBox');
    setNewBoxIdentifier('');
  };

  // Save new box
  const handleSaveCreate = async () => {
    const trimmedName = newBoxName.trim();
    const trimmedIdentifier = newBoxIdentifier.trim();
    
    if (!trimmedName) {
      alert("Box name cannot be empty");
      return;
    }
    
    if (!trimmedIdentifier) {
      alert("Identifier cannot be empty");
      return;
    }
    
    try {
      // Check for duplicate identifiers
      const isDuplicate = await isAreaIdentifierDuplicate(trimmedIdentifier);
      if (isDuplicate) {
        alert("An item with this identifier already exists. Please use a different identifier.");
        return;
      }
      
      // Add the new area
      await addArea({
        name: trimmedName,
        identifier: trimmedIdentifier,
        iconName: newBoxIcon,
        color: newBoxColor
      });
      
      // Refresh the data
      const updatedAreas = await getAreas();
      setAreas(updatedAreas);
      setFilteredAreas(updatedAreas);
      
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating box:', error);
      alert('Failed to create the box. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Box List</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleCreateClick}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors cursor-pointer"
          >
            <FaPlus className="mr-2" />
            <span>Create New Box</span>
          </button>
          <button
            onClick={() => router.push('/all-items')}
            className="flex items-center bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-2 rounded-md shadow-sm border border-primary-700 transition-colors cursor-pointer"
          >
            <FaLayerGroup className="mr-2" />
            <span>All Items</span>
          </button>
          <button
            onClick={handleBackClick}
            className="flex items-center bg-dark-blue hover:bg-dark-blue-light text-white hover:text-secondary-500 px-3 py-2 rounded-md shadow-sm border border-primary-700 transition-colors cursor-pointer"
          >
            <FaArrowLeft className="mr-2" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search boxes..."
          className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredAreas.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-300 text-lg">No boxes found. Create some boxes on the dashboard first.</p>
        </div>
      ) : (
        <div className="bg-dark-blue rounded-lg shadow-lg overflow-hidden max-h-[70vh] overflow-y-auto">
          <ul className="divide-y divide-primary-700">
            {Array.isArray(filteredAreas) && filteredAreas.map(item => {
              const Icon = getIconComponent(item.iconName);
              
              return (
                <li key={item.id} className="p-4 hover:bg-dark-blue-light transition-colors">
                  {editingItem === item.id ? (
                    <div className="flex flex-col space-y-4">
                      <div>
                        <label className="block text-gray-300 mb-1">Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-300 mb-1">Identifier (cannot be changed)</label>
                        <input
                          type="text"
                          value={item.identifier}
                          disabled
                          className="w-full bg-dark-blue-light bg-opacity-50 border border-primary-700 rounded-md p-2 text-gray-400 cursor-not-allowed"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-300 mb-1">Color</label>
                        <div className="flex flex-wrap gap-2">
                          {colorOptions.map(color => (
                            <button
                              key={color}
                              type="button"
                              className={`w-8 h-8 rounded-full ${color} ${editColor === color ? 'ring-2 ring-white' : ''} hover:opacity-80 transition-opacity cursor-pointer`}
                              onClick={() => setEditColor(color)}
                              aria-label={`Select ${color} color`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-gray-300 mb-1">Icon</label>
                        <RoomIconSelect
                          value={editIcon}
                          onChange={setEditIcon}
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4">
                        <button
                          onClick={handleCancelEdit}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md shadow-sm border border-red-800 transition-colors flex items-center cursor-pointer"
                        >
                          <FaTimesCircle className="mr-1" />
                          <span>Cancel</span>
                        </button>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md shadow-sm border border-green-800 transition-colors flex items-center cursor-pointer"
                        >
                          <FaSave className="mr-1" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`${item.color} p-2 rounded-md mr-3`}>
                          <Icon className="text-white text-xl" />
                        </div>
                        <div>
                          <span className="text-black font-medium">{item.name}</span>
                          <div className="text-black text-sm font-medium">ID: {item.identifier}</div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/storage/${item.identifier}`)}
                          className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-md shadow-sm border border-green-800 transition-colors cursor-pointer"
                          title="Go to Storage"
                        >
                          <Icons.FaBoxOpen />
                        </button>
                        <button
                          onClick={() => handleEditClick(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md shadow-sm border border-blue-800 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleRemoveClick(item.id)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md shadow-sm border border-red-800 transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Create Box Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-blue bg-opacity-90 border-2 border-primary-700 rounded-lg shadow-lg p-6 w-[500px] max-w-[90vw]">
            <h3 className="text-xl font-bold text-white mb-4">Create New Box</h3>
            <div className="flex flex-col space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newBoxName}
                  onChange={(e) => setNewBoxName(e.target.value)}
                  className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white"
                  placeholder="Enter a name for the box"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Identifier (must be unique)</label>
                <input
                  type="text"
                  value={newBoxIdentifier}
                  onChange={(e) => setNewBoxIdentifier(e.target.value)}
                  className="w-full bg-dark-blue-light bg-opacity-80 border border-primary-700 rounded-md p-2 text-white"
                  placeholder="Enter unique identifier (e.g., KITCHEN-001)"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full ${color} ${newBoxColor === color ? 'ring-2 ring-white' : ''} hover:opacity-80 transition-opacity cursor-pointer`}
                      onClick={() => setNewBoxColor(color)}
                      aria-label={`Select ${color} color`}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Icon</label>
                <RoomIconSelect
                  value={newBoxIcon}
                  onChange={setNewBoxIcon}
                />
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleCancelCreate}
                  className="bg-red-600 hover:bg-red-700 text-white hover:text-white px-3 py-2 rounded-md shadow-sm border border-red-800 transition-colors flex items-center cursor-pointer"
                >
                  <FaTimesCircle className="mr-1" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveCreate}
                  className="bg-green-600 hover:bg-green-700 text-white hover:text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors flex items-center cursor-pointer"
                >
                  <FaSave className="mr-1" />
                  <span>Create</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 