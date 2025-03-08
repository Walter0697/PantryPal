import React from 'react';
import { FaReact, FaGithub, FaTwitter } from 'react-icons/fa';
import { IoMdSettings } from 'react-icons/io';
import { MdDashboard } from 'react-icons/md';

const IconExample = () => {
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md flex flex-col items-center space-y-4">
      <h2 className="text-xl font-bold text-gray-800">React Icons Example</h2>
      
      <div className="flex space-x-4">
        <div className="flex flex-col items-center">
          <FaReact className="text-4xl text-blue-500" />
          <span className="text-sm text-gray-600">React</span>
        </div>
        
        <div className="flex flex-col items-center">
          <FaGithub className="text-4xl text-gray-800" />
          <span className="text-sm text-gray-600">GitHub</span>
        </div>
        
        <div className="flex flex-col items-center">
          <FaTwitter className="text-4xl text-blue-400" />
          <span className="text-sm text-gray-600">Twitter</span>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <div className="flex flex-col items-center">
          <IoMdSettings className="text-4xl text-gray-600" />
          <span className="text-sm text-gray-600">Settings</span>
        </div>
        
        <div className="flex flex-col items-center">
          <MdDashboard className="text-4xl text-purple-500" />
          <span className="text-sm text-gray-600">Dashboard</span>
        </div>
      </div>
    </div>
  );
};

export default IconExample;
