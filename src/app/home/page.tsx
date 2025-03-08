'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { FaEdit, FaSave, FaTimesCircle, FaList } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import { Layout } from 'react-grid-layout';
import { useAuth } from '../../components/AuthProvider';
import { getLayouts, saveLayouts } from '../../util/storage';

// Dynamically import the GridLayout component to avoid SSR issues
const GridLayout = dynamic(() => import('../../components/GridLayout'), {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLayouts, setCurrentLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [temporaryLayouts, setTemporaryLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Reference to the GridLayout component
  const gridLayoutRef = useRef<any>(null);

  // Load saved layouts on component mount
  useEffect(() => {
    const layouts = getLayouts();
    setCurrentLayouts(layouts);
    // Initialize temporary layouts with the same data
    setTemporaryLayouts(JSON.parse(JSON.stringify(layouts)));
  }, []);

  const handleEditClick = () => {
    // Store the current layouts as temporary layouts when entering edit mode
    setTemporaryLayouts(JSON.parse(JSON.stringify(currentLayouts)));
    setIsEditMode(true);
  };

  const handleSaveClick = () => {
    // Save layouts to localStorage
    saveLayouts(currentLayouts);
    
    // Also save to GridLayout component's internal state
    if (gridLayoutRef.current && gridLayoutRef.current.saveCurrentState) {
      gridLayoutRef.current.saveCurrentState();
    }
    
    // Update the temporary layouts to match the current ones
    setTemporaryLayouts(JSON.parse(JSON.stringify(currentLayouts)));
    setIsEditMode(false);
  };

  const handleCancelClick = () => {
    // Restore the original layouts when canceling
    setCurrentLayouts(JSON.parse(JSON.stringify(temporaryLayouts)));
    
    // Also reset the GridLayout component's internal state
    if (gridLayoutRef.current && gridLayoutRef.current.resetToOriginal) {
      gridLayoutRef.current.resetToOriginal();
    }
    
    setIsEditMode(false);
  };

  const handleLayoutChange = (layouts: { [key: string]: Layout[] }) => {
    if (isEditMode) {
      // Only update current layouts if in edit mode
      setCurrentLayouts(layouts);
    }
  };

  const handleAddBox = () => {
    setShowNameDialog(true);
    // Focus the input after the dialog is shown
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoxName.trim()) {
      // Pass the name to the GridLayout component
      if (gridLayoutRef.current && gridLayoutRef.current.addNewBox) {
        gridLayoutRef.current.addNewBox(newBoxName);
      }
      setNewBoxName('');
      setShowNameDialog(false);
    }
  };

  const handleNameCancel = () => {
    setNewBoxName('');
    setShowNameDialog(false);
  };

  const navigateToListView = () => {
    router.push('/list');
  };

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Edit mode controls */}
      {isEditMode && (
        <div className="flex justify-end mb-4 space-x-2">
          <button 
            onClick={handleSaveClick}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors flex items-center"
            title="Save Layout"
          >
            <FaSave className="mr-1" />
            <span>Save</span>
          </button>
          <button 
            onClick={handleCancelClick}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md shadow-sm border border-red-800 transition-colors flex items-center"
            title="Cancel Editing"
          >
            <FaTimesCircle className="mr-1" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Edit button and List View button (only shown when not in edit mode) */}
      {!isEditMode && (
        <div className="flex justify-end mb-4 space-x-2">
          <button 
            onClick={navigateToListView}
            className="bg-dark-blue hover:bg-dark-blue-light text-white p-2 rounded-md shadow-sm border border-primary-700 action-button"
            title="List View"
          >
            <FaList className="text-xl" />
          </button>
          <button 
            onClick={handleEditClick}
            className="bg-dark-blue hover:bg-dark-blue-light text-white p-2 rounded-md shadow-sm border border-primary-700 action-button"
            title="Edit Layout"
          >
            <FaEdit className="text-xl" />
          </button>
        </div>
      )}

      {/* Grid Layout */}
      <div className="mb-8">
        <GridLayout 
          ref={gridLayoutRef}
          isEditMode={isEditMode} 
          onLayoutChange={handleLayoutChange} 
          onAddBox={handleAddBox}
        />
      </div>
      
      {isEditMode && (
        <div className="text-center text-gray-300 mb-8">
          <p>Tip: Drag boxes to move them, grab the corner/edge to resize, or use the remove button to delete</p>
        </div>
      )}

      {/* Name Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-blue border-2 border-primary-700 rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-xl font-bold text-white mb-4">Add New Box</h3>
            <form onSubmit={handleNameSubmit}>
              <div className="mb-4">
                <label htmlFor="boxName" className="block text-gray-300 mb-2">Box Name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="boxName"
                  value={newBoxName}
                  onChange={(e) => setNewBoxName(e.target.value)}
                  className="w-full bg-dark-blue-light border border-primary-700 rounded-md p-2 text-white"
                  placeholder="Enter a name for the box"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleNameCancel}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md shadow-sm border border-red-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
