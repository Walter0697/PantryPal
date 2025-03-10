'use client';

import React, { useState } from 'react';
import { FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  labelClassName?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
  iconClassName?: string;
  toggleClassName?: string;
  showLeftIcon?: boolean;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Enter password',
  label,
  required = false,
  autoComplete = 'current-password',
  className = '',
  labelClassName = 'block text-sm font-medium text-gray-700',
  inputWrapperClassName = 'mt-1 relative',
  inputClassName = 'block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
  iconClassName = 'text-gray-400',
  toggleClassName = 'absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600',
  showLeftIcon = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine if we're using dark mode based on input class
  const isDarkMode = inputClassName.includes('bg-dark-blue') || inputClassName.includes('dark');

  // Adjust base classes for dark mode if needed
  const baseInputClass = isDarkMode 
    ? 'w-full pr-10 py-2 bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent'
    : 'w-full pr-10 py-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500';

  // Add left padding if showing left icon
  const paddingClass = showLeftIcon ? 'pl-10' : 'pl-3';
  
  // Combined input class
  const finalInputClass = `${baseInputClass} ${paddingClass} ${inputClassName}`;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={inputWrapperClassName}>
        {showLeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaLock className={iconClassName} />
          </div>
        )}
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={finalInputClass}
        />
        <div 
          className={toggleClassName}
          onClick={togglePasswordVisibility}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              togglePasswordVisibility();
              e.preventDefault();
            }
          }}
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </div>
      </div>
    </div>
  );
};

export default PasswordInput; 