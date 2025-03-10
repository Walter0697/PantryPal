'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { IconType } from 'react-icons';
import { FaKitchenSet, FaToilet, FaBed, FaCouch, FaUtensils, FaShower, 
         FaTrash, FaCar, FaGamepad, FaLaptop, FaBook, FaWrench, 
         FaWineBottle, FaShirt, FaGuitar, FaUmbrellaBeach, FaBox, FaGripLines } from 'react-icons/fa6';
import { AreaItem, loadSavedData, saveAreas, saveLayouts, LayoutConfig } from '../util/storage';
import RoomIconSelect from './RoomIconSelect';

// Enable responsiveness
const ResponsiveGridLayout = WidthProvider(Responsive);

// Map of icon names to components for serialization/deserialization
const iconMap: { [key: string]: IconType } = {
  // Primary Living Areas
  'FaKitchenSet': FaKitchenSet,  // Kitchen
  'FaCouch': FaCouch,            // Living Room
  'FaBed': FaBed,                // Bedroom
  'FaUtensils': FaUtensils,      // Dining Room
  
  // Bathrooms and Utilities
  'FaToilet': FaToilet,          // Bathroom
  'FaShower': FaShower,          // Shower/Bathroom
  'FaShirt': FaShirt,            // Closet/Laundry Room
  
  // Storage and Special Purpose Rooms
  'FaBox': FaBox,                // Storage Room
  'FaCar': FaCar,                // Garage
  'FaLaptop': FaLaptop,          // Home Office
  'FaGamepad': FaGamepad,        // Game Room
  'FaWrench': FaWrench,          // Workshop
  'FaBook': FaBook,              // Library/Study
  'FaUmbrellaBeach': FaUmbrellaBeach, // Patio/Outdoor Space
  'FaGuitar': FaGuitar,          // Music Room
  'FaWineBottle': FaWineBottle   // Bar/Cellar
};

// All available icons for random selection
const allIcons = [
  // Primary Living Areas
  FaKitchenSet,  // Kitchen
  FaCouch,       // Living Room
  FaBed,         // Bedroom
  FaUtensils,    // Dining Room
  
  // Bathrooms and Utilities
  FaToilet,      // Bathroom
  FaShower,      // Shower/Bathroom
  FaShirt,       // Closet/Laundry Room
  
  // Storage and Special Purpose Rooms
  FaBox,         // Storage Room
  FaCar,         // Garage
  FaLaptop,      // Home Office
  FaGamepad,     // Game Room
  FaWrench,      // Workshop
  FaBook,        // Library/Study
  FaUmbrellaBeach, // Patio/Outdoor Space
  FaGuitar,      // Music Room
  FaWineBottle   // Bar/Cellar
];

// Icon name to use when we can't find an icon
const fallbackIcon = FaBox;

// All available colors for random selection
const allColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 
  'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500'
];

// Helper to get the name of an icon component for serialization
const getIconName = (iconComponent: IconType): string => {
  for (const [name, component] of Object.entries(iconMap)) {
    if (component === iconComponent) {
      return name;
    }
  }
  return 'FaBox'; // Default fallback icon name
};

// Initial areas (focusing on house areas)
const initialAreas: AreaItem[] = [
  // Primary Living Areas
  { id: 'kitchen', name: 'Kitchen', identifier: 'KITCHEN-001', iconName: 'FaKitchenSet', color: 'bg-blue-500' },
  { id: 'living-room', name: 'Living Room', identifier: 'LIVING-001', iconName: 'FaCouch', color: 'bg-yellow-500' },
  { id: 'bedroom', name: 'Bedroom', identifier: 'BED-001', iconName: 'FaBed', color: 'bg-purple-500' },
  { id: 'dining', name: 'Dining Room', identifier: 'DINING-001', iconName: 'FaUtensils', color: 'bg-red-500' },
  
  // Bathrooms and Utilities
  { id: 'bathroom', name: 'Bathroom', identifier: 'BATH-001', iconName: 'FaToilet', color: 'bg-green-500' },
  { id: 'laundry', name: 'Laundry Room', identifier: 'LAUNDRY-001', iconName: 'FaShirt', color: 'bg-cyan-500' },
  
  // Storage and Special Purpose Rooms
  { id: 'storage', name: 'Storage Room', identifier: 'STORAGE-001', iconName: 'FaBox', color: 'bg-gray-500' },
  { id: 'garage', name: 'Garage', identifier: 'GARAGE-001', iconName: 'FaCar', color: 'bg-orange-500' },
  { id: 'office', name: 'Home Office', identifier: 'OFFICE-001', iconName: 'FaLaptop', color: 'bg-indigo-500' },
];

// Define the default layouts for different breakpoints
const defaultLayouts: LayoutConfig = {
  lg: [
    // Primary Living Areas
    { i: 'kitchen', x: 0, y: 0, w: 6, h: 2 },
    { i: 'living-room', x: 0, y: 2, w: 6, h: 2 },
    { i: 'bedroom', x: 6, y: 0, w: 6, h: 2 },
    { i: 'dining', x: 6, y: 2, w: 6, h: 1 },
    
    // Bathrooms and Utilities
    { i: 'bathroom', x: 0, y: 4, w: 4, h: 1 },
    { i: 'laundry', x: 4, y: 4, w: 4, h: 1 },
    
    // Storage and Special Purpose Rooms
    { i: 'storage', x: 8, y: 4, w: 4, h: 1 },
    { i: 'garage', x: 0, y: 5, w: 6, h: 1 },
    { i: 'office', x: 6, y: 5, w: 6, h: 1 },
  ],
  md: [
    // Primary Living Areas
    { i: 'kitchen', x: 0, y: 0, w: 4, h: 2 },
    { i: 'living-room', x: 4, y: 0, w: 5, h: 2 },
    { i: 'bedroom', x: 0, y: 2, w: 5, h: 2 },
    { i: 'dining', x: 5, y: 2, w: 4, h: 2 },
    
    // Bathrooms and Utilities
    { i: 'bathroom', x: 0, y: 4, w: 3, h: 1 },
    { i: 'laundry', x: 3, y: 4, w: 3, h: 1 },
    
    // Storage and Special Purpose Rooms
    { i: 'storage', x: 6, y: 4, w: 3, h: 1 },
    { i: 'garage', x: 0, y: 5, w: 4, h: 1 },
    { i: 'office', x: 4, y: 5, w: 5, h: 1 },
  ],
  sm: [
    // Primary Living Areas
    { i: 'kitchen', x: 0, y: 0, w: 6, h: 1 },
    { i: 'living-room', x: 0, y: 1, w: 6, h: 1 },
    { i: 'bedroom', x: 0, y: 2, w: 6, h: 1 },
    { i: 'dining', x: 0, y: 3, w: 6, h: 1 },
    
    // Bathrooms and Utilities
    { i: 'bathroom', x: 0, y: 4, w: 3, h: 1 },
    { i: 'laundry', x: 3, y: 4, w: 3, h: 1 },
    
    // Storage and Special Purpose Rooms
    { i: 'storage', x: 0, y: 5, w: 3, h: 1 },
    { i: 'garage', x: 3, y: 5, w: 3, h: 1 },
    { i: 'office', x: 0, y: 6, w: 6, h: 1 },
  ],
};

// Define the data structure type
interface SavedData {
  areas: AreaItem[];
  layouts: LayoutConfig;
}

interface GridLayoutProps {
  isEditMode: boolean;
  onLayoutChange: (layouts: LayoutConfig) => void;
  onAddBox?: () => void;
  onResetToOriginal?: () => void;
}

// Export with forwardRef to allow parent components to call methods
const GridLayout = forwardRef<any, GridLayoutProps>(({ isEditMode, onLayoutChange, onAddBox, onResetToOriginal }, ref) => {
  // State for saved data (persisted in DynamoDB)
  const [savedData, setSavedData] = useState<SavedData>({
    areas: initialAreas,
    layouts: defaultLayouts
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // State for current editing data (temporary until saved)
  const [editingAreas, setEditingAreas] = useState<AreaItem[]>(initialAreas);
  const [editingLayouts, setEditingLayouts] = useState<LayoutConfig>(defaultLayouts);

  // Load saved data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await loadSavedData();
        setSavedData(data);
        setEditingAreas(data.areas);
        setEditingLayouts(data.layouts);
      } catch (error) {
        console.error("Error loading saved data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Reset to original saved state when edit mode changes
  useEffect(() => {
    if (isEditMode && !isLoading) {
      // When entering edit mode, create a copy of the saved data
      setEditingAreas([...savedData.areas]);
      setEditingLayouts(JSON.parse(JSON.stringify(savedData.layouts)));
    }
  }, [isEditMode, savedData, isLoading]);

  // Method to save current state to DynamoDB
  const saveCurrentState = async () => {
    try {
      // Save to DynamoDB
      await saveLayouts(editingLayouts);
      await saveAreas(editingAreas);
      
      // Update local state
      const newSavedData: SavedData = {
        layouts: editingLayouts,
        areas: editingAreas
      };
      
      setSavedData(newSavedData);
      return newSavedData;
    } catch (error) {
      console.error("Error saving data:", error);
      throw error;
    }
  };

  // Method to reset to original state
  const resetToOriginal = () => {
    const originalAreas = [...savedData.areas];
    const originalLayouts = JSON.parse(JSON.stringify(savedData.layouts)) as LayoutConfig;
    
    setEditingAreas(originalAreas);
    setEditingLayouts(originalLayouts);
    
    // Notify parent component of layout reset
    onLayoutChange(originalLayouts);
    
    if (onResetToOriginal) {
      onResetToOriginal();
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addNewBox: (name: string) => addNewBoxWithName(name),
    saveCurrentState,
    resetToOriginal
  }));

  const handleBoxClick = (areaId: string, identifier: string) => {
    if (!isEditMode) {
      // Navigate to the storage page with the area identifier
      const storageUrl = `/storage/${identifier}`;
      
      // This creates a cleaner navigation experience without a full page reload
      const a = document.createElement('a');
      a.href = storageUrl;
      a.click();
    }
  };

  const handleLayoutChange = (layout: Layout[], layouts: LayoutConfig) => {
    setEditingLayouts(layouts);
    onLayoutChange(layouts);
  };

  const handleRemoveBox = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Remove the area
    const updatedAreas = editingAreas.filter(area => area.id !== id);
    setEditingAreas(updatedAreas);
    
    // Remove from layouts
    const updatedLayouts: LayoutConfig = { ...editingLayouts };
    
    Object.keys(updatedLayouts).forEach(breakpoint => {
      if (breakpoint in updatedLayouts) {
        updatedLayouts[breakpoint] = updatedLayouts[breakpoint].filter((item: Layout) => item.i !== id);
      }
    });
    
    setEditingLayouts(updatedLayouts);
    onLayoutChange(updatedLayouts);
  };

  // Define random icon and color for new boxes
  const getRandomIcon = (): IconType => {
    const randomIndex = Math.floor(Math.random() * allIcons.length);
    return allIcons[randomIndex];
  };

  const getRandomColor = (): string => {
    const randomIndex = Math.floor(Math.random() * allColors.length);
    return allColors[randomIndex];
  };

  const generateUniqueIdentifier = (name: string): string => {
    // Convert name to uppercase, replace spaces with dashes
    const baseIdentifier = name.toUpperCase().replace(/\s+/g, '-');
    
    // Add a timestamp to make it unique
    const uniqueIdentifier = `${baseIdentifier}-${Date.now() % 10000}`;
    
    // Limit length to 15 characters
    return uniqueIdentifier.substring(0, 15);
  };

  const addNewBoxWithName = async (name: string) => {
    if (!name || name.trim() === '') {
      console.warn('Cannot add box with empty name');
      return null;
    }
    
    const randomIcon = getRandomIcon();
    const randomColor = getRandomColor();
    
    // Create a new area with unique ID
    const newId = `box-${Date.now()}`;
    
    // Create a unique identifier based on the name
    const identifier = generateUniqueIdentifier(name);
    
    const newArea: AreaItem = {
      id: newId,
      name: name.trim(),
      identifier,
      iconName: getIconName(randomIcon),
      color: randomColor
    };
    
    // Add to areas
    const updatedAreas = [...editingAreas, newArea];
    setEditingAreas(updatedAreas);
    
    // Add to all layouts
    const updatedLayouts: LayoutConfig = { ...editingLayouts };
    
    Object.keys(updatedLayouts).forEach(breakpoint => {
      if (breakpoint in updatedLayouts) {
        // Find a good position (at the end)
        const maxY = updatedLayouts[breakpoint].reduce(
          (max: number, item: Layout) => Math.max(max, item.y + item.h),
          0
        );
        
        // Add new item to layout with size based on breakpoint
        let w = 3;
        let h = 1;
        
        if (breakpoint === 'lg') {
          w = 3;
          h = 2;
        } else if (breakpoint === 'md') {
          w = 3;
          h = 1;
        } else {
          w = 3;
          h = 1;
        }
        
        const newItem = {
          i: newId,
          x: 0,
          y: maxY,
          w,
          h
        };
        
        updatedLayouts[breakpoint] = [...updatedLayouts[breakpoint], newItem];
      }
    });
    
    setEditingLayouts(updatedLayouts);
    onLayoutChange(updatedLayouts);
    
    return newArea;
  };

  const handleAddBox = () => {
    if (onAddBox) {
      onAddBox();
    }
  };

  // Display appropriate data based on edit mode
  const displayAreas = isEditMode ? editingAreas : savedData.areas;
  const displayLayouts = isEditMode ? editingLayouts : savedData.layouts;

  if (isLoading) {
    return <div className="p-4 text-center">Loading layout...</div>;
  }

  return (
    <div className="p-4">
      <ResponsiveGridLayout
        className="layout"
        layouts={displayLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 9, sm: 6, xs: 3, xxs: 1 }}
        rowHeight={150}
        margin={[16, 16]}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
      >
      {displayAreas.map((area: AreaItem) => {
          const Icon = iconMap[area.iconName] || FaBox;
          return (
            <div 
              key={area.id} 
              className={`${area.color} rounded-lg shadow-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-transform ${isEditMode ? 'cursor-move' : 'hover:scale-102'}`}
              onClick={() => handleBoxClick(area.id, area.identifier)}
            >
              {isEditMode && (
                <>
                  <div className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-1.5 cursor-move" title="Drag to move">
                    <FaGripLines className="text-gray-700" />
                  </div>
                </>
              )}
              <Icon className="text-white text-4xl mb-2" />
              <h3 className="text-white text-lg font-semibold">{area.name}</h3>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
});

// Add display name for debugging
GridLayout.displayName = 'GridLayout';

export default GridLayout;
