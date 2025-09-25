import React from 'react';

interface TimePickerProps {
  value?: string;
  onChange: (v: string) => void;
  startHour?: number; // default 0
  endHour?: number;   // default 23 inclusive
  minuteStep?: number; // default 5
  className?: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');

const isValidTime = (val?: string) => typeof val === 'string' && /^\d{2}:\d{2}$/.test(val ?? '');

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  startHour = 0,
  endHour = 23,
  minuteStep = 5,
  className = ''
}) => {
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const minutes = Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);
  const defaultHour = pad(hours[0] ?? 0);
  const defaultMinute = pad(minutes[0] ?? 0);

  const [h, m] = isValidTime(value) ? (value as string).split(':') : ['', ''];
  const hour = h ? pad(Number(h)) : '';
  const minute = m ? pad(Number(m)) : '';

  const baseCls = 'border px-2 py-1 rounded text-sm bg-white';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <select
        className={baseCls}
        value={hour}
        onChange={(e) => {
          const newHour = e.target.value;
          const resolvedMinute = minute || defaultMinute;
          onChange(`${newHour}:${resolvedMinute}`);
        }}
      >
        <option value="" disabled hidden>ชั่วโมง</option>
        {hours.map((hh) => (
          <option key={hh} value={pad(hh)}>{pad(hh)}</option>
        ))}
      </select>
      :
      <select
        className={baseCls}
        value={minute}
        onChange={(e) => {
          const newMinute = e.target.value;
          const resolvedHour = hour || defaultHour;
          onChange(`${resolvedHour}:${newMinute}`);
        }}
        disabled={!hour}
      >
        <option value="" disabled hidden>นาที</option>
        {minutes.map((mm) => (
          <option key={mm} value={pad(mm)}>{pad(mm)}</option>
        ))}
      </select>
    </div>
  );
};

export default TimePicker;
