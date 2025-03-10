import React from 'react';
import Select from 'react-select';
import * as Icons from 'react-icons/fa6';
import { IconType } from 'react-icons';

// Icon data with both name and component
interface IconOption {
  value: string;
  label: string;
  icon: IconType;
}

// Get icon component from name
const getIconComponent = (iconName: string): IconType => {
  return (Icons as Record<string, IconType>)[iconName] || Icons.FaBox;
};

// Create the options array for the select with human-readable labels
const createIconOptions = (iconNames: string[]): IconOption[] => {
  const iconLabels: Record<string, string> = {
    // Food ingredients and drinks
    'FaBowlFood': 'Food Ingredient',
    'FaAppleWhole': 'Fruit/Produce',
    'FaEgg': 'Dairy/Eggs',
    'FaBreadSlice': 'Bakery/Bread',
    'FaMeatFrozen': 'Meat',
    'FaFish': 'Fish/Seafood',
    'FaBottleWater': 'Water/Drinks',
    'FaWineBottle': 'Alcoholic Drinks',
    'FaMugHot': 'Hot Beverages',
    
    // Sauces and seasonings
    'FaJar': 'Jar/Preserve',
    'FaBottleDroplet': 'Sauce/Oil',
    'FaDroplet': 'Liquid Seasoning',
    'FaPepperHot': 'Spices/Seasonings',
    
    // Cleaning items
    'FaPumpSoap': 'Cleaning Product',
    'FaSprayCanSparkles': 'Spray Cleaner',
    'FaBroom': 'Cleaning Tool',
    'FaSoap': 'Detergent/Soap',
    
    // Toilet products
    'FaToilet': 'Toilet Product',
    'FaToothbrush': 'Oral Care',
    'FaShower': 'Shower Product',
    'FaHandSparkles': 'Hand Care',
    
    // Tissue paper
    'FaToiletPaper': 'Toilet Paper',
    'FaBox': 'Tissue Box',
    'FaScroll': 'Paper Towel',
    
    // Electronic items
    'FaLaptop': 'Computer/Laptop',
    'FaMobile': 'Mobile Device',
    'FaHeadphones': 'Audio Equipment',
    'FaPlug': 'Electronic Accessory',
    'FaBatteryFull': 'Battery/Power'
  };

  return iconNames.map(name => ({
    value: name,
    label: iconLabels[name] || name.replace('Fa', ''),
    icon: getIconComponent(name)
  }));
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
  'FaLaptop', 'FaMobile', 'FaHeadphones', 'FaPlug', 'FaBatteryFull'
];

// Custom option component that displays the icon
const IconOption = ({ data, ...props }: any) => (
  <div {...props.innerProps} className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer">
    <data.icon className="w-5 h-5 mr-2 text-primary-300" />
    <span className="text-white">{data.label}</span>
  </div>
);

// Custom value container that displays selected icon
const ValueContainer = ({ children, data }: any) => (
  <div className="flex items-center">
    {data?.icon && (
      <data.icon className="w-5 h-5 mr-2 text-primary-300" />
    )}
    <div className="text-white">{children}</div>
  </div>
);

interface StorageIconSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const StorageIconSelect: React.FC<StorageIconSelectProps> = ({ value, onChange, className }) => {
  const options = createIconOptions(availableIcons);
  const selectedOption = options.find(option => option.value === value);
  
  const customStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: '#0a192f', // dark-blue
      borderColor: '#003d99', // primary-700
      minHeight: '36px',
      height: '36px',
      color: 'white',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#0066ff',
      },
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: '0 8px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
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
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'white',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
    }),
    input: (base: any) => ({
      ...base,
      color: 'white',
      margin: '0',
      padding: '0',
    }),
    indicatorsContainer: (base: any) => ({
      ...base,
      height: '38px',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      padding: '0 8px',
    }),
  };
  
  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option: any) => onChange(option.value)}
      components={{
        Option: IconOption,
        SingleValue: ValueContainer,
      }}
      className={className}
      styles={customStyles}
      isSearchable={true}
      placeholder="Select an icon..."
    />
  );
};

export default StorageIconSelect; 