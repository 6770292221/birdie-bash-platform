
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className="w-36 bg-white/90 backdrop-blur-sm border-gray-300 shadow-md hover:shadow-lg transition-all hover:bg-white focus:ring-2 focus:ring-blue-500">
        <Globe className="w-4 h-4 mr-2 text-gray-600" />
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent className="bg-white border-gray-200 shadow-xl z-50 backdrop-blur-sm">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="hover:bg-gray-100">
            <span className="flex items-center">
              <span className="mr-3 text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
