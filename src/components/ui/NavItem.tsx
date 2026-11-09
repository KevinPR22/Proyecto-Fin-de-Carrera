import React from 'react';

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export default function NavItem({ active, onClick, icon, label }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-4 px-6 py-4 transition-all w-full text-left ${
        active
          ? 'bg-[#141414] text-white border-r-4 border-blue-500'
          : 'hover:bg-gray-100'
      }`}
    >
      <span
        className={`${
          active ? 'text-white' : 'text-[#141414] opacity-50 group-hover:opacity-100'
        } transition-opacity`}
      >
        {icon}
      </span>
      <span
        className={`hidden md:block font-bold text-sm tracking-tight ${
          active ? 'text-white' : 'text-[#141414] opacity-50 group-hover:opacity-100'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
