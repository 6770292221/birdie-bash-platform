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

const TimePicker: React.FC<TimePickerProps> = ({
  value = '20:00',
  onChange,
  startHour = 0,
  endHour = 23,
  minuteStep = 5,
  className = ''
}) => {
  const [h, m] = value.split(':');
  const hour = isNaN(Number(h)) ? '20' : pad(Number(h));
  const minute = isNaN(Number(m)) ? '00' : pad(Number(m));

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const minutes = Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);

  const baseCls = 'border px-2 py-1 rounded text-sm bg-white';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <select
        className={baseCls}
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute}`)}
      >
        {hours.map((hh) => (
          <option key={hh} value={pad(hh)}>{pad(hh)}</option>
        ))}
      </select>
      :
      <select
        className={baseCls}
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
      >
        {minutes.map((mm) => (
          <option key={mm} value={pad(mm)}>{pad(mm)}</option>
        ))}
      </select>
    </div>
  );
};

export default TimePicker;

