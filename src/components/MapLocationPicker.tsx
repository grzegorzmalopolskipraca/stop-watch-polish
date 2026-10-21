import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Crosshair, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MapLocationPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
}

interface SelectedLocation {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: SelectedLocation = { lat: 51.1079, lng: 17.0385 };
const selectedIcon = L.divIcon({
  className: 'location-picker-marker',
  html: '<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#2563eb;box-shadow:0 1px 5px #0008"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapInteractions({
  selectedLocation,
  onSelect,
}: {
  selectedLocation: SelectedLocation | null;
  onSelect: (location: SelectedLocation) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) map.setView([selectedLocation.lat, selectedLocation.lng], map.getZoom());
  }, [map, selectedLocation]);

  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return selectedLocation ? (
    <Marker
      position={[selectedLocation.lat, selectedLocation.lng]}
      icon={selectedIcon}
      draggable
      eventHandlers={{
        dragend(event) {
          const position = event.target.getLatLng();
          onSelect({ lat: position.lat, lng: position.lng });
        },
      }}
    />
  ) : null;
}

const MapLocationPicker = ({
  open,
  onClose,
  onSelectLocation,
  initialLat,
  initialLng,
  title = 'Wybierz lokalizację na mapie',
}: MapLocationPickerProps) => {
  const initialLocation = useMemo(() => (
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng }
      : null
  ), [initialLat, initialLng]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(initialLocation);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedLocation(initialLocation);
      setErrorMessage(null);
    }
  }, [open, initialLocation]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolokalizacja nie jest obsługiwana przez tę przeglądarkę.');
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSelectedLocation({ lat: coords.latitude, lng: coords.longitude });
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setErrorMessage('Nie udało się pobrać lokalizacji. Sprawdź uprawnienia przeglądarki.');
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-address', {
        body: { address: searchQuery },
      });
      if (error) throw error;
      if (!data?.success || !data.location) {
        setErrorMessage(data?.error || 'Nie znaleziono adresu.');
        return;
      }
      setSelectedLocation({ lat: data.location.lat, lng: data.location.lng });
      setSearchQuery(data.formatted_address ?? searchQuery);
    } catch (error) {
      console.error('TomTom geocoding error:', error);
      setErrorMessage('Błąd wyszukiwania adresu. Spróbuj ponownie.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedLocation) return;
    onSelectLocation(selectedLocation.lat, selectedLocation.lng);
    onClose();
  };

  const mapCenter = selectedLocation ?? DEFAULT_CENTER;

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
          <div className="flex gap-2">
            <Input
              placeholder="Szukaj adresu..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button variant="outline" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <Button variant="outline" onClick={handleUseCurrentLocation} disabled={isLoadingLocation} className="w-full">
            {isLoadingLocation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crosshair className="w-4 h-4 mr-2" />}
            Użyj mojej aktualnej lokalizacji
          </Button>

          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {errorMessage}
              <Button variant="link" className="p-0 h-auto ml-2 text-destructive underline" onClick={() => setErrorMessage(null)}>
                Zamknij
              </Button>
            </div>
          )}

          <div className="w-full h-64 sm:h-80 rounded-lg border overflow-hidden" style={{ minHeight: '250px' }}>
            {open && (
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={14}
                className="w-full h-full"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapInteractions selectedLocation={selectedLocation} onSelect={setSelectedLocation} />
              </MapContainer>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Mapa: OpenStreetMap. Wyszukiwanie adresu: TomTom.</p>

          {selectedLocation && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="text-muted-foreground">Wybrana lokalizacja:</p>
              <p className="font-mono">{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Anuluj</Button>
            <Button onClick={handleConfirm} disabled={!selectedLocation}>
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
