'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { IconType } from 'react-icons';
import { FaKitchenSet, FaToilet, FaBed, FaCouch, FaUtensils, FaShower, 
         FaTrash, FaCar, FaGamepad, FaLaptop, FaBook, FaWrench, 
         FaWineBottle, FaShirt, FaGuitar, FaUmbrellaBeach, FaBox, FaGripLines } from 'react-icons/fa6';
import { AreaItem, loadSavedData, saveAreas, saveLayouts } from '../util/storage';

// Enable responsiveness
const ResponsiveGridLayout = WidthProvider(Responsive);

// Map of icon names to components for serialization/deserialization
const iconMap: { [key: string]: IconType } = {
  'FaKitchenSet': FaKitchenSet,
  'FaToilet': FaToilet, 
  'FaBed': FaBed, 
  'FaCouch': FaCouch, 
  'FaUtensils': FaUtensils, 
  'FaShower': FaShower,
  'FaCar': FaCar, 
  'FaGamepad': FaGamepad, 
  'FaLaptop': FaLaptop, 
  'FaBook': FaBook, 
  'FaWrench': FaWrench, 
  'FaWineBottle': FaWineBottle, 
  'FaShirt': FaShirt, 
  'FaGuitar': FaGuitar, 
  'FaUmbrellaBeach': FaUmbrellaBeach,
  'FaBox': FaBox
};

// All available icons for random selection
const allIcons = [
  FaKitchenSet, FaToilet, FaBed, FaCouch, FaUtensils, FaShower,
  FaCar, FaGamepad, FaLaptop, FaBook, FaWrench, FaWineBottle, 
  FaShirt, FaGuitar, FaUmbrellaBeach
];

// Icon name to use when we can't find an icon
const fallbackIcon = FaBox;

// All available colors for random selection
const allColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 
  'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500'
];

// Helper to get icon name from component for storage
const getIconName = (iconComponent: IconType): string => {
  const iconEntries = Object.entries(iconMap);
  for (const [name, component] of iconEntries) {
    if (component === iconComponent) {
      return name;
    }
  }
  return 'FaBox'; // Default fallback
};

// Initial areas
const initialAreas = [
  { id: 'kitchen', name: 'Kitchen', iconName: 'FaKitchenSet', color: 'bg-blue-500' },
  { id: 'bathroom', name: 'Bathroom', iconName: 'FaToilet', color: 'bg-green-500' },
  { id: 'bedroom', name: 'Bedroom', iconName: 'FaBed', color: 'bg-purple-500' },
  { id: 'living-room', name: 'Living Room', iconName: 'FaCouch', color: 'bg-yellow-500' },
  { id: 'dining', name: 'Dining', iconName: 'FaUtensils', color: 'bg-red-500' },
  { id: 'shower', name: 'Shower', iconName: 'FaShower', color: 'bg-indigo-500' },
];

// Define the default layouts for different breakpoints
const defaultLayouts = {
  lg: [
    { i: 'kitchen', x: 0, y: 0, w: 6, h: 2 },
    { i: 'bathroom', x: 6, y: 0, w: 3, h: 1 },
    { i: 'bedroom', x: 9, y: 0, w: 3, h: 2 },
    { i: 'living-room', x: 0, y: 2, w: 6, h: 1 },
    { i: 'dining', x: 6, y: 1, w: 3, h: 2 },
    { i: 'shower', x: 9, y: 2, w: 3, h: 1 },
  ],
  md: [
    { i: 'kitchen', x: 0, y: 0, w: 6, h: 2 },
    { i: 'bathroom', x: 6, y: 0, w: 3, h: 1 },
    { i: 'bedroom', x: 0, y: 2, w: 6, h: 1 },
    { i: 'living-room', x: 6, y: 1, w: 3, h: 1 },
    { i: 'dining', x: 0, y: 3, w: 6, h: 1 },
    { i: 'shower', x: 6, y: 2, w: 3, h: 1 },
  ],
  sm: [
    { i: 'kitchen', x: 0, y: 0, w: 6, h: 1 },
    { i: 'bathroom', x: 0, y: 1, w: 3, h: 1 },
    { i: 'bedroom', x: 3, y: 1, w: 3, h: 1 },
    { i: 'living-room', x: 0, y: 2, w: 3, h: 1 },
    { i: 'dining', x: 3, y: 2, w: 3, h: 1 },
    { i: 'shower', x: 0, y: 3, w: 6, h: 1 },
  ],
};

interface GridLayoutProps {
  isEditMode: boolean;
  onLayoutChange: (layouts: { [key: string]: Layout[] }) => void;
  onAddBox?: () => void;
  onResetToOriginal?: () => void;
}

// Export with forwardRef to allow parent components to call methods
const GridLayout = forwardRef<any, GridLayoutProps>(({ isEditMode, onLayoutChange, onAddBox, onResetToOriginal }, ref) => {
  // State for saved data (persisted in localStorage)
  const [savedData, setSavedData] = useState(loadSavedData());
  
  // State for current editing data (temporary until saved)
  const [editingAreas, setEditingAreas] = useState<AreaItem[]>(savedData.areas);
  const [editingLayouts, setEditingLayouts] = useState(savedData.layouts);

  // Load saved data on component mount
  useEffect(() => {
    const data = loadSavedData();
    setSavedData(data);
    setEditingAreas(data.areas);
    setEditingLayouts(data.layouts);
  }, []);

  // Reset to original saved state when edit mode changes
  useEffect(() => {
    if (isEditMode) {
      // When entering edit mode, create a copy of the saved data
      setEditingAreas([...savedData.areas]);
      setEditingLayouts(JSON.parse(JSON.stringify(savedData.layouts)));
    }
  }, [isEditMode, savedData]);

  // Method to save current state to localStorage
  const saveCurrentState = () => {
    const newSavedData = {
      layouts: editingLayouts,
      areas: editingAreas
    };
    
    saveLayouts(editingLayouts);
    saveAreas(editingAreas);
    
    setSavedData(newSavedData);
    
    return newSavedData;
  };

  // Method to reset to original state
  const resetToOriginal = () => {
    const originalAreas = [...savedData.areas];
    const originalLayouts = JSON.parse(JSON.stringify(savedData.layouts));
    
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

  const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    setEditingLayouts(layouts);
    onLayoutChange(layouts);
  };

  const handleRemoveBox = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Remove the area
    const updatedAreas = editingAreas.filter(area => area.id !== id);
    setEditingAreas(updatedAreas);
    
    // Remove from layouts
    const updatedLayouts: { [key: string]: Layout[] } = {};
    Object.keys(editingLayouts).forEach(breakpoint => {
      updatedLayouts[breakpoint] = editingLayouts[breakpoint].filter((item: Layout) => item.i !== id);
    });
    
    setEditingLayouts(updatedLayouts);
    onLayoutChange(updatedLayouts);
  };

  // Function to add a new box with a custom name
  const addNewBoxWithName = (name: string) => {
    // Generate a unique identifier
    const sanitizedName = name.toUpperCase().replace(/\s+/g, '-');
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const uniqueIdentifier = `${sanitizedName.substring(0, 10)}-${randomId}`;
    
    // Generate a unique ID for the layout
    const newId = `box-${Date.now()}`;
    
    // Get a random icon and color
    const randomIcon = allIcons[Math.floor(Math.random() * allIcons.length)];
    const randomIconName = getIconName(randomIcon);
    const randomColor = allColors[Math.floor(Math.random() * allColors.length)];
    
    // Create the new area
    const newArea: AreaItem = {
      id: newId,
      name: name,
      identifier: uniqueIdentifier,
      iconName: randomIconName,
      color: randomColor
    };
    
    // Add to areas
    const updatedAreas = [...editingAreas, newArea];
    setEditingAreas(updatedAreas);
    
    // Add to layouts
    const updatedLayouts = { ...editingLayouts };
    Object.keys(updatedLayouts).forEach(breakpoint => {
      // Find a good position (at the end)
      const maxY = updatedLayouts[breakpoint].reduce(
        (max: number, item: Layout) => Math.max(max, item.y + item.h), 
        0
      );
      
      // Add new item to layout with size 1x1
      const newItem = { 
        i: newId, 
        x: 0, 
        y: maxY, 
        w: 1, 
        h: 1 
      };
      
      updatedLayouts[breakpoint] = [...updatedLayouts[breakpoint], newItem];
    });
    
    setEditingLayouts(updatedLayouts);
    onLayoutChange(updatedLayouts);
  };

  // Call the parent's onAddBox if provided
  const handleAddBox = () => {
    if (onAddBox) {
      onAddBox();
    }
  };

  // Use the editing state when in edit mode, otherwise use the saved state
  const displayAreas = isEditMode ? editingAreas : savedData.areas;
  const displayLayouts = isEditMode ? editingLayouts : savedData.layouts;

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
