import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Crosshair, Search, Loader2 } from 'lucide-react';

// Declare google maps types
declare global {
  interface Window {
    google?: {
      maps: typeof google.maps;
    };
  }
}

interface MapLocationPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
}

// Default center: Wrocław, Poland
const DEFAULT_CENTER = { lat: 51.1079, lng: 17.0385 };

const MapLocationPicker = ({ 
  open, 
  onClose, 
  onSelectLocation, 
  initialLat, 
  initialLng,
  title = "Wybierz lokalizację na mapie"
}: MapLocationPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (!open) return;

    const loadGoogleMaps = () => {
      // Check if already loaded
      if (window.google?.maps) {
        setMapLoaded(true);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setMapLoaded(true));
        return;
      }

      // Get API key from environment
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setMapError('Klucz API Google Maps nie jest skonfigurowany. Użyj geolokalizacji przeglądarki.');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => setMapError('Nie udało się załadować mapy Google. Sprawdź klucz API.');
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [open]);

  // Initialize map when loaded
  useEffect(() => {
    if (!open || !mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    try {
      const center = initialLat && initialLng 
        ? { lat: initialLat, lng: initialLng }
        : DEFAULT_CENTER;

      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Add click listener
      mapInstanceRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          updateMarker(lat, lng);
        }
      });

      // Set initial marker if coordinates provided
      if (initialLat && initialLng) {
        updateMarker(initialLat, initialLng);
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Nie udało się zainicjalizować mapy.');
    }
  }, [open, mapLoaded, initialLat, initialLng]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [open]);

  const updateMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    setSelectedLocation({ lat, lng });

    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else {
      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });

      markerRef.current.addListener('dragend', () => {
        const position = markerRef.current?.getPosition();
        if (position) {
          setSelectedLocation({ lat: position.lat(), lng: position.lng() });
        }
      });
    }

    mapInstanceRef.current.panTo({ lat, lng });
  }, []);

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      setMapError('Geolokalizacja nie jest obsługiwana przez tę przeglądarkę.');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (mapInstanceRef.current) {
          updateMarker(lat, lng);
          mapInstanceRef.current.setZoom(16);
        } else {
          setSelectedLocation({ lat, lng });
        }
        
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setMapError('Nie udało się pobrać lokalizacji. Sprawdź uprawnienia przeglądarki.');
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    
    setIsSearching(true);
    
    try {
      const geocoder = new google.maps.Geocoder();
      const results = await geocoder.geocode({ 
        address: searchQuery,
        region: 'pl',
        language: 'pl'
      });
      
      if (results.results && results.results.length > 0) {
        const location = results.results[0].geometry.location;
        updateMarker(location.lat(), location.lng());
        mapInstanceRef.current.setZoom(16);
      } else {
        setMapError('Nie znaleziono adresu.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setMapError('Błąd podczas wyszukiwania adresu. Sprawdź czy Geocoding API jest włączone.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelectLocation(selectedLocation.lat, selectedLocation.lng);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Kliknij na mapę, aby wybrać lokalizację, lub użyj wyszukiwarki.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              placeholder="Szukaj adresu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={handleSearch} 
              disabled={isSearching || !mapLoaded}
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {/* Current location button */}
          <Button
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={isLoadingLocation}
            className="w-full"
          >
            {isLoadingLocation ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4 mr-2" />
            )}
            Użyj mojej aktualnej lokalizacji
          </Button>

          {/* Error message */}
          {mapError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {mapError}
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2 text-destructive underline"
                onClick={() => setMapError(null)}
              >
                Zamknij
              </Button>
            </div>
          )}

          {/* Map container */}
          <div 
            ref={mapRef} 
            className="w-full h-64 sm:h-80 bg-muted rounded-lg border"
            style={{ minHeight: '250px' }}
          >
            {!mapLoaded && !mapError && (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Selected coordinates */}
          {selectedLocation && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="text-muted-foreground">Wybrana lokalizacja:</p>
              <p className="font-mono">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedLocation}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Wybierz tę lokalizację
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapLocationPicker;
