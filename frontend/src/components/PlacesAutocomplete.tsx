import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

declare global {
  interface Window {
    google?: typeof google;
    googleMapsReady?: boolean;
  }
}

const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter venue location",
  label,
  className = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const initAutocomplete = () => {
      if (window.google && window.google.maps && window.google.maps.places && inputRef.current) {
        // Initialize autocomplete with Thailand bias and establishment types
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'gym', 'point_of_interest'],
          componentRestrictions: { country: 'th' }, // Restrict to Thailand
          fields: ['name', 'formatted_address', 'geometry', 'place_id', 'types']
        });

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && place.formatted_address) {
            onChange(place.formatted_address);
          }
        });

        setIsLoaded(true);
      }
    };

    // Check if Google Maps is already loaded
    if (window.googleMapsReady || (window.google && window.google.maps)) {
      initAutocomplete();
    } else {
      // Wait for Google Maps to load
      const handleGoogleMapsLoad = () => {
        initAutocomplete();
      };

      window.addEventListener('google-maps-loaded', handleGoogleMapsLoad);
      
      // Also check periodically in case the event was missed
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkInterval);
          initAutocomplete();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          setHasError(true);
        }
      }, 100);

      // Cleanup
      return () => {
        window.removeEventListener('google-maps-loaded', handleGoogleMapsLoad);
        clearInterval(checkInterval);
      };
    }

    // Cleanup autocomplete
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange]);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Clear autocomplete prediction to prevent hanging
    if (autocompleteRef.current) {
      // Force clear any pending predictions
      setTimeout(() => {
        const predictions = document.querySelectorAll('.pac-container');
        predictions.forEach(container => {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
        });
      }, 100);
    }
  };

  return (
    <div className={className}>
      {label && <Label htmlFor="venue" className="text-gray-700">{label}</Label>}
      <Input
        ref={inputRef}
        id="venue"
        value={value}
        onChange={handleInputChange}
        placeholder={isLoaded ? "Search for venues in Thailand..." : placeholder}
        className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
      />
      {!isLoaded && !hasError && (
        <p className="text-xs text-gray-500 mt-1">Loading Google Maps...</p>
      )}
      {hasError && (
        <p className="text-xs text-red-500 mt-1">
          ไม่สามารถโหลด Google Maps ได้ กรุณาพิมพ์ที่อยู่เอง
        </p>
      )}
    </div>
  );
};

export default PlacesAutocomplete;