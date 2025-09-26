import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageToggleProps {
  className?: string;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`flex items-center bg-white rounded-xl shadow-md border border-gray-200 p-1 ${className}`}>
      <button
        onClick={() => setLanguage('th')}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1 ${
          language === 'th'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        🇹🇭 ไทย
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1 ${
          language === 'en'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        🇺🇸 EN
      </button>
    </div>
  );
};

export default LanguageToggle;