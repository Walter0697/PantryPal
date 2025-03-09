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
    'FaBox': 'Box / Container',
    'FaKitchenSet': 'Kitchen',
    'FaToilet': 'Bathroom',
    'FaBed': 'Bedroom',
    'FaCouch': 'Living Room',
    'FaUtensils': 'Cutlery',
    'FaShower': 'Shower',
    'FaCar': 'Garage / Car',
    'FaGamepad': 'Gaming',
    'FaLaptop': 'Electronics',
    'FaBook': 'Books',
    'FaWrench': 'Tools',
    'FaWineBottle': 'Drinks',
    'FaShirt': 'Clothing',
    'FaGuitar': 'Music',
    'FaUmbrellaBeach': 'Outdoor',
    'FaToothbrush': 'Hygiene',
    'FaPumpSoap': 'Cleaning',
    'FaBowlFood': 'Food',
    'FaMugHot': 'Hot Drinks',
    'FaBottleWater': 'Water'
  };

  return iconNames.map(name => ({
    value: name,
    label: iconLabels[name] || name.replace('Fa', ''),
    icon: getIconComponent(name)
  }));
};

// Available icons for selection
const availableIcons = [
  'FaBox', 'FaKitchenSet', 'FaToilet', 'FaBed', 'FaCouch', 'FaUtensils', 
  'FaShower', 'FaCar', 'FaGamepad', 'FaLaptop', 'FaBook', 'FaWrench',
  'FaWineBottle', 'FaShirt', 'FaGuitar', 'FaUmbrellaBeach', 'FaToothbrush',
  'FaPumpSoap', 'FaBowlFood', 'FaMugHot', 'FaBottleWater'
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

interface IconSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const IconSelect: React.FC<IconSelectProps> = ({ value, onChange, className }) => {
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

export default IconSelect; 