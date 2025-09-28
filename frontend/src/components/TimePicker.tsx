import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TimePickerProps {
  value?: string;
  onChange: (v: string) => void;
  startHour?: number; // default 0
  endHour?: number;   // default 23 inclusive
  minuteStep?: number; // default 5
  className?: string;
  hourlyOnly?: boolean; // force minutes to be 00 (default true)
  availableHours?: number[]; // specific hours available (overrides startHour/endHour)
}

const pad = (n: number) => n.toString().padStart(2, '0');

const isValidTime = (val?: string) => typeof val === 'string' && /^\d{2}:\d{2}$/.test(val ?? '');

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  startHour = 0,
  endHour = 23,
  minuteStep = 5,
  className = '',
  hourlyOnly = true, // Default to true - minutes always 00
  availableHours
}) => {
  const { t } = useLanguage();
  const hours = availableHours || Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const minutes = Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);
  const defaultHour = pad(hours[0] ?? 0);
  const defaultMinute = '00'; // Always default to 00 minutes

  const [h, m] = isValidTime(value) ? (value as string).split(':') : ['', ''];
  const hour = h ? pad(Number(h)) : '';
  const minute = '00'; // Always use 00 minutes

  const baseCls = 'border px-2 py-1 rounded text-sm bg-white';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <select
        className={baseCls}
        value={hour}
        onChange={(e) => {
          const newHour = e.target.value;
          onChange(`${newHour}:00`); // Always use 00 minutes
        }}
      >
        <option value="" disabled hidden>{t('timepicker.hour')}</option>
        {hours.map((hh) => (
          <option key={hh} value={pad(hh)}>{pad(hh)}</option>
        ))}
      </select>
      :
      <span className="px-2 py-1 text-sm text-gray-500 bg-gray-100 rounded border">00</span>
    </div>
  );
};

export default TimePicker;
