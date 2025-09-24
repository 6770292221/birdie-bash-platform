import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';

interface PlaceInfo {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  mapUrl?: string;
}

interface PlacePickerProps {
  id?: string;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (place: PlaceInfo) => void;
  placeholder?: string;
  disabled?: boolean;
}

const PlacePicker = ({ id, className, value, onChange, onSelect, placeholder, disabled }: PlacePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps(apiKey).then(() => {
      if (!inputRef.current) { setLoaded(false); return; }
      if (!(window as any).google?.maps) { setLoadError('maps-missing'); return; }
      if (!(window as any).google?.maps?.places) { setLoadError('places-missing'); return; }
      setLoaded(true);
      autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
        // types removed to allow broader search (addresses/places)
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete!.getPlace();
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        const info: PlaceInfo = {
          name: place.name || undefined,
          address: place.formatted_address || undefined,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          placeId: place.place_id || undefined,
        };
        if (info.lat && info.lng) {
          const qp = new URLSearchParams();
          qp.set('api', '1');
          qp.set('query', `${info.lat},${info.lng}`);
          if (info.placeId) qp.set('query_place_id', info.placeId);
          info.mapUrl = `https://www.google.com/maps/search/?${qp.toString()}`;
        }
        onChange(info.address || info.name || '');
        onSelect?.(info);
      });
    }).catch((e) => {
      setLoadError('failed');
      console.warn('Google Maps failed to load', e);
    });

    return () => {
      // nothing to cleanup for Autocomplete
    };
  }, [onChange, onSelect]);

  const hasApiKey = !!(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined);

  return (
    <div>
      <Input
      id={id}
      ref={inputRef}
      className={className}
      placeholder={placeholder || 'ค้นหาสถานที่ (Google Maps)'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      disabled={disabled}
      type="text"
      inputMode="text"
    />
      {!hasApiKey && (
        <div className="text-xs text-gray-500 mt-1">ใส่คีย์ Google Maps ใน VITE_GOOGLE_MAPS_API_KEY เพื่อเปิดการค้นหาสถานที่</div>
      )}
      {hasApiKey && !loaded && !loadError && (
        <div className="text-xs text-gray-500 mt-1">กำลังโหลด Google Maps…</div>
      )}
      {loadError && (
        <div className="text-xs text-red-600 mt-1">โหลด Google Maps ไม่สำเร็จ โปรดตรวจสอบ API key/สิทธิ์การใช้งาน</div>
      )}
    </div>
  );
};

export default PlacePicker;
