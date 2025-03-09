'use client';

import { FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from './AuthProvider';

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className="flex items-center bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-1.5 rounded-md shadow-sm border border-primary-700 transition-colors cursor-pointer"
      aria-label="Logout"
    >
      <FaSignOutAlt className="text-sm" />
      <span className="ml-2 text-sm font-medium">Logout</span>
    </button>
  );
}
