import React from "react";
import Icon from "../Icon";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  className = ""
}: SearchInputProps) {
  return (
    <div className={`relative flex items-center w-full max-w-sm ${className}`}>
      <span className="absolute left-3 text-gray-400 pointer-events-none">
        <Icon name="search" size={16} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 bg-white border border-[var(--color-bone)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)]/20 focus:border-[var(--color-forest)] transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Xóa tìm kiếm"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
