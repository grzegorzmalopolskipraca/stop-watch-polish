import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Save, MapPin, Briefcase, Clock, Search, CheckCircle, Loader2, RefreshCw, Map, Crosshair, Car, Home, Building2, ArrowRight, TrendingDown, Calendar, Sun, Moon, Settings } from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';
import MapLocationPicker from '@/components/MapLocationPicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Traffic API options with descriptions
const TRAFFIC_API_OPTIONS = [
  {
    value: 'distance_matrix_pessimistic',
    label: 'Pesymistyczny (zalecany)',
    description: 'Uwzględnia największe korki - najbardziej realistyczny w godzinach szczytu'
  },
  {
    value: 'distance_matrix_best_guess',
    label: 'Uśredniony',
    description: 'Średni czas na podstawie danych historycznych'
  },
  {
    value: 'distance_matrix_optimistic',
    label: 'Optymistyczny',
    description: 'Zakłada minimalny ruch - najkrótszy możliwy czas'
  },
  {
    value: 'routes_api',
    label: 'Google Routes API',
    description: 'Nowsze API z danymi w czasie rzeczywistym (TRAFFIC_AWARE)'
  }
];

interface CommuteSchedule {
  id: string;
  day_of_week: number;
  to_work_start: string;
  to_work_end: string;
  from_work_start: string;
  from_work_end: string;
}

interface AddressLocation {
  lat: number;
  lng: number;
}

interface TravelTime {
  departure_time: string;
  travel_duration_minutes: number;
  direction: 'to_work' | 'from_work';
  travel_date: string;
  calculated_at: string;
  day_of_week: number;
}

const DAYS_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

// Generate time slots for a range
const generateTimeSlots = (startTime: string, endTime: string): string[] => {
  const times: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    times.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    currentMinutes += 10;
  }
  
  return times;
};

// Find min time for green coloring
const getMinTime = (times: { time: string; minutes: number | null }[]) => {
  const validTimes = times.filter(t => t.minutes !== null);
  if (validTimes.length === 0) return Infinity;
  return Math.min(...validTimes.map(t => t.minutes!));
};

const Konto = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAddresses, setSavingAddresses] = useState(false);
  const [validatingHome, setValidatingHome] = useState(false);
  const [validatingWork, setValidatingWork] = useState(false);
  const [homeAddressValidated, setHomeAddressValidated] = useState(false);
  const [workAddressValidated, setWorkAddressValidated] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [homeLocation, setHomeLocation] = useState<AddressLocation | null>(null);
  const [workLocation, setWorkLocation] = useState<AddressLocation | null>(null);
  const [schedule, setSchedule] = useState<CommuteSchedule[]>([]);
  const [travelTimes, setTravelTimes] = useState<TravelTime[]>([]);
  const [refreshingTimes, setRefreshingTimes] = useState(false);
  const [showHomeMapPicker, setShowHomeMapPicker] = useState(false);
  const [showWorkMapPicker, setShowWorkMapPicker] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState<'home' | 'work' | null>(null);
  const [trafficApiPreference, setTrafficApiPreference] = useState('distance_matrix_pessimistic');
  const [savingApiPreference, setSavingApiPreference] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      } else {
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    try {
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profile) {
        setHomeAddress(profile.home_address || '');
        setWorkAddress(profile.work_address || '');
        // Load traffic API preference
        setTrafficApiPreference(profile.traffic_api_preference || 'distance_matrix_pessimistic');
        // If addresses exist, consider them validated
        if (profile.home_address) setHomeAddressValidated(true);
        if (profile.work_address) setWorkAddressValidated(true);
        // Load saved coordinates
        if (profile.home_lat && profile.home_lng) {
          setHomeLocation({ lat: profile.home_lat, lng: profile.home_lng });
        }
        if (profile.work_lat && profile.work_lng) {
          setWorkLocation({ lat: profile.work_lat, lng: profile.work_lng });
        }
      }

      // Load schedule
      const { data: scheduleData } = await supabase
        .from('commute_schedule')
        .select('*')
        .eq('user_id', userId)
        .order('day_of_week');

      if (scheduleData) {
        setSchedule(scheduleData);
      }

      // Load travel times for today
      await loadTravelTimes(userId);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTravelTimes = async (userId: string) => {
    try {
      // Get travel times for ALL days of the week - most recent data for each day
      const { data: timesData, error } = await supabase
        .from('commute_travel_times')
        .select('*')
        .eq('user_id', userId)
        .order('travel_date', { ascending: false })
        .order('day_of_week', { ascending: true })
        .order('departure_time', { ascending: true });

      if (error) {
        console.error('Error loading travel times:', error);
        return;
      }

      if (timesData) {
        // For each day_of_week, keep only the most recent travel_date records
        const latestByDay: Record<number, { date: string; records: TravelTime[] }> = {};
        
        for (const record of timesData) {
          const dayOfWeek = record.day_of_week;
          const travelDate = record.travel_date;
          
          if (!latestByDay[dayOfWeek]) {
            latestByDay[dayOfWeek] = { date: travelDate, records: [] };
          }
          
          // Only include records from the most recent date for this day_of_week
          if (latestByDay[dayOfWeek].date === travelDate) {
            latestByDay[dayOfWeek].records.push(record as TravelTime);
          }
        }
        
        // Flatten all records from all days
        const allRecords: TravelTime[] = [];
        for (const dayOfWeek of Object.keys(latestByDay).map(Number)) {
          allRecords.push(...latestByDay[dayOfWeek].records);
        }
        
        setTravelTimes(allRecords);
      }
    } catch (error) {
      console.error('Error loading travel times:', error);
    }
  };

  const handleRefreshTravelTimes = async () => {
    if (!user) return;
    setRefreshingTimes(true);
    
    try {
      // Call the edge function with force=true to bypass interval check and fill missing slots
      // Pass the traffic API preference so the edge function uses the correct API/model
      const { data, error } = await supabase.functions.invoke('calculate-commute-times', {
        body: { force: true, fillMissing: true, trafficApi: trafficApiPreference }
      });
      
      if (error) {
        console.error('Error refreshing travel times:', error);
        toast({
          title: 'Błąd',
          description: 'Nie udało się odświeżyć czasów dojazdu.',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('Travel times refresh result:', data);
      
      // Reload travel times from database
      await loadTravelTimes(user.id);
      
      const apiLabel = TRAFFIC_API_OPTIONS.find(o => o.value === trafficApiPreference)?.label || trafficApiPreference;
      const slotsInfo = data?.slots?.length > 0 
        ? `Obliczono ${data.processed} czasów (${apiLabel}): ${data.slots.join(', ')}.`
        : `Obliczono ${data?.processed || 0} czasów dojazdu (${apiLabel}).`;
      
      toast({
        title: 'Odświeżono',
        description: slotsInfo,
      });
    } catch (error) {
      console.error('Error refreshing travel times:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się odświeżyć czasów dojazdu.',
        variant: 'destructive',
      });
    } finally {
      setRefreshingTimes(false);
    }
  };

  const handleTrafficApiChange = async (value: string) => {
    if (!user) return;
    
    setTrafficApiPreference(value);
    setSavingApiPreference(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ traffic_api_preference: value })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const apiLabel = TRAFFIC_API_OPTIONS.find(o => o.value === value)?.label || value;
      toast({
        title: 'Zapisano',
        description: `Wybrano: ${apiLabel}. Kliknij "Oblicz czasy" aby przeliczyć.`,
      });
    } catch (error) {
      console.error('Error saving traffic API preference:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać preferencji API.',
        variant: 'destructive',
      });
    } finally {
      setSavingApiPreference(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const validateAddress = async (address: string, type: 'home' | 'work') => {
    if (!address.trim()) {
      toast({
        title: 'Błąd',
        description: 'Wprowadź adres do walidacji.',
        variant: 'destructive',
      });
      return null;
    }

    const setValidating = type === 'home' ? setValidatingHome : setValidatingWork;
    setValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-address', {
        body: { address }
      });

      if (error) throw error;

      if (data.success) {
        if (type === 'home') {
          setHomeAddress(data.formatted_address);
          setHomeAddressValidated(true);
          setHomeLocation(data.location);
        } else {
          setWorkAddress(data.formatted_address);
          setWorkAddressValidated(true);
          setWorkLocation(data.location);
        }
        toast({
          title: 'Adres zweryfikowany',
          description: data.formatted_address,
        });
        return { address: data.formatted_address, location: data.location };
      } else {
        toast({
          title: 'Nie znaleziono adresu',
          description: data.error || 'Sprawdź poprawność danych.',
          variant: 'destructive',
        });
        return null;
      }
    } catch (error) {
      console.error('Error validating address:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zweryfikować adresu.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setValidating(false);
    }
  };

  const handleGetCurrentLocation = async (type: 'home' | 'work') => {
    setGettingCurrentLocation(type);
    
    if (!navigator.geolocation) {
      toast({
        title: 'Błąd',
        description: 'Geolokalizacja nie jest obsługiwana przez tę przeglądarkę.',
        variant: 'destructive',
      });
      setGettingCurrentLocation(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (type === 'home') {
          setHomeLocation({ lat, lng });
          setHomeAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setHomeAddressValidated(true);
        } else {
          setWorkLocation({ lat, lng });
          setWorkAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setWorkAddressValidated(true);
        }
        
        toast({
          title: 'Lokalizacja pobrana',
          description: `Współrzędne: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
        
        setGettingCurrentLocation(null);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: 'Błąd',
          description: 'Nie udało się pobrać lokalizacji. Sprawdź uprawnienia przeglądarki.',
          variant: 'destructive',
        });
        setGettingCurrentLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleMapLocationSelect = (type: 'home' | 'work', lat: number, lng: number) => {
    if (type === 'home') {
      setHomeLocation({ lat, lng });
      setHomeAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setHomeAddressValidated(true);
    } else {
      setWorkLocation({ lat, lng });
      setWorkAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setWorkAddressValidated(true);
    }
    
    toast({
      title: 'Lokalizacja wybrana',
      description: `Współrzędne: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    });
  };

  const handleSaveAddresses = async () => {
    if (!user) return;
    setSavingAddresses(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          home_address: homeAddress,
          work_address: workAddress,
          home_lat: homeLocation?.lat || null,
          home_lng: homeLocation?.lng || null,
          work_lat: workLocation?.lat || null,
          work_lng: workLocation?.lng || null,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({
        title: 'Zapisano!',
        description: 'Adresy zostały zapisane.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać adresów.',
        variant: 'destructive',
      });
    } finally {
      setSavingAddresses(false);
    }
  };

  // Auto-save schedule when changed
  const saveScheduleItem = useCallback(async (dayId: string, field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('commute_schedule')
        .update({ [field]: value })
        .eq('id', dayId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać harmonogramu.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const updateSchedule = (dayIndex: number, field: keyof CommuteSchedule, value: string) => {
    const day = schedule.find(d => d.day_of_week === dayIndex);
    if (day) {
      setSchedule(prev => prev.map(d => 
        d.day_of_week === dayIndex ? { ...d, [field]: value } : d
      ));
      // Auto-save to database
      saveScheduleItem(day.id, field, value);
    }
  };

  // Get travel time for a specific slot and day of week
  const getTravelTimeForSlot = (direction: 'to_work' | 'from_work', time: string, dayOfWeek: number): number | null => {
    const match = travelTimes.find(
      t => t.direction === direction && 
           t.departure_time.substring(0, 5) === time &&
           t.day_of_week === dayOfWeek
    );
    return match ? match.travel_duration_minutes : null;
  };

  // Generate travel time data for display for a specific day
  const getDisplayTravelTimes = (startTime: string, endTime: string, direction: 'to_work' | 'from_work', dayOfWeek: number) => {
    const slots = generateTimeSlots(startTime, endTime);
    return slots.map(time => ({
      time,
      minutes: getTravelTimeForSlot(direction, time, dayOfWeek),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border p-3 sm:p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">eJedzie.pl</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-2 text-sm"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Wyloguj</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Title */}
        <div className="text-center py-4 sm:py-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground px-2">Prywatny asystent dojazdu do pracy</h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base break-all px-2">
            Zalogowany jako: {user?.email}
          </p>
        </div>

        {/* Address Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Moje adresy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="home-address" className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                Mój adres wyjazdu
              </Label>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Input
                  id="home-address"
                  type="text"
                  placeholder="np. ul. Przykładowa 10, Wrocław"
                  value={homeAddress}
                  onChange={(e) => {
                    setHomeAddress(e.target.value);
                    setHomeAddressValidated(false);
                    setHomeLocation(null);
                  }}
                  className={`min-w-0 flex-1 text-sm ${homeAddressValidated ? 'border-green-500' : ''}`}
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => validateAddress(homeAddress, 'home')}
                    disabled={validatingHome}
                    className="shrink-0"
                    size="icon"
                    title="Szukaj adresu"
                  >
                    {validatingHome ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : homeAddressValidated ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGetCurrentLocation('home')}
                    disabled={gettingCurrentLocation === 'home'}
                    className="shrink-0"
                    size="icon"
                    title="Użyj aktualnej lokalizacji"
                  >
                    {gettingCurrentLocation === 'home' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crosshair className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowHomeMapPicker(true)}
                    className="shrink-0"
                    size="icon"
                    title="Wybierz na mapie"
                  >
                    <Map className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {homeAddressValidated && (
                <p className="text-xs sm:text-sm text-green-600 flex flex-wrap items-center gap-1">
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  <span>Lokalizacja ustawiona</span>
                  {homeLocation && <span className="text-xs text-muted-foreground">({homeLocation.lat.toFixed(4)}, {homeLocation.lng.toFixed(4)})</span>}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-address" className="flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                Adres mojej pracy
              </Label>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Input
                  id="work-address"
                  type="text"
                  placeholder="np. ul. Firmowa 5, Wrocław"
                  value={workAddress}
                  onChange={(e) => {
                    setWorkAddress(e.target.value);
                    setWorkAddressValidated(false);
                    setWorkLocation(null);
                  }}
                  className={`min-w-0 flex-1 text-sm ${workAddressValidated ? 'border-green-500' : ''}`}
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => validateAddress(workAddress, 'work')}
                    disabled={validatingWork}
                    className="shrink-0"
                    size="icon"
                    title="Szukaj adresu"
                  >
                    {validatingWork ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : workAddressValidated ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGetCurrentLocation('work')}
                    disabled={gettingCurrentLocation === 'work'}
                    className="shrink-0"
                    size="icon"
                    title="Użyj aktualnej lokalizacji"
                  >
                    {gettingCurrentLocation === 'work' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crosshair className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWorkMapPicker(true)}
                    className="shrink-0"
                    size="icon"
                    title="Wybierz na mapie"
                  >
                    <Map className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {workAddressValidated && (
                <p className="text-xs sm:text-sm text-green-600 flex flex-wrap items-center gap-1">
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  <span>Lokalizacja ustawiona</span>
                  {workLocation && <span className="text-xs text-muted-foreground">({workLocation.lat.toFixed(4)}, {workLocation.lng.toFixed(4)})</span>}
                </p>
              )}
            </div>

            <Button onClick={handleSaveAddresses} disabled={savingAddresses} className="w-full text-sm">
              <Save className="w-4 h-4 mr-2" />
              {savingAddresses ? 'Zapisywanie...' : 'Zapisz adresy'}
            </Button>
          </CardContent>
        </Card>

        {/* Schedule Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-5 h-5 shrink-0 text-primary" />
              Harmonogram tygodniowy
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Określ przedziały czasowe, kiedy planujesz dojazd do pracy i powrót
            </p>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="space-y-3">
              {schedule.map((day) => {
                const isWeekend = day.day_of_week === 0 || day.day_of_week === 6;
                return (
                  <div 
                    key={day.id} 
                    className={`border rounded-xl p-4 transition-all ${
                      isWeekend 
                        ? 'border-border/50 bg-muted/30 opacity-75' 
                        : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Day name */}
                      <div className="flex items-center gap-3 sm:w-32">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isWeekend ? 'bg-muted' : 'bg-primary/10'
                        }`}>
                          <span className={`text-sm font-bold ${isWeekend ? 'text-muted-foreground' : 'text-primary'}`}>
                            {DAYS_PL[day.day_of_week].substring(0, 2)}
                          </span>
                        </div>
                        <span className={`font-medium text-sm ${isWeekend ? 'text-muted-foreground' : ''}`}>
                          {DAYS_PL[day.day_of_week]}
                        </span>
                      </div>
                      
                      {/* Time inputs */}
                      <div className="flex flex-1 flex-col sm:flex-row gap-4">
                        {/* To work */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Sun className="w-3.5 h-3.5" />
                            <span>Do pracy</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={day.to_work_start}
                              onChange={(e) => updateSchedule(day.day_of_week, 'to_work_start', e.target.value)}
                              className="flex-1 text-sm h-9 text-center"
                            />
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Input
                              type="time"
                              value={day.to_work_end}
                              onChange={(e) => updateSchedule(day.day_of_week, 'to_work_end', e.target.value)}
                              className="flex-1 text-sm h-9 text-center"
                            />
                          </div>
                        </div>
                        
                        {/* From work */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Moon className="w-3.5 h-3.5" />
                            <span>Z pracy</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={day.from_work_start}
                              onChange={(e) => updateSchedule(day.day_of_week, 'from_work_start', e.target.value)}
                              className="flex-1 text-sm h-9 text-center"
                            />
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Input
                              type="time"
                              value={day.from_work_end}
                              onChange={(e) => updateSchedule(day.day_of_week, 'from_work_end', e.target.value)}
                              className="flex-1 text-sm h-9 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Zmiany zapisują się automatycznie
            </p>
          </CardContent>
        </Card>

        {/* Traffic API Settings Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="w-5 h-5 shrink-0 text-primary" />
              Ustawienia API ruchu
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Wybierz źródło danych o ruchu drogowym
            </p>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="space-y-3">
              <Label htmlFor="traffic-api" className="text-sm font-medium">
                Rodzaj API / model ruchu
              </Label>
              <Select 
                value={trafficApiPreference} 
                onValueChange={handleTrafficApiChange}
                disabled={savingApiPreference}
              >
                <SelectTrigger id="traffic-api" className="w-full">
                  <SelectValue placeholder="Wybierz API" />
                </SelectTrigger>
                <SelectContent>
                  {TRAFFIC_API_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TRAFFIC_API_OPTIONS.find(o => o.value === trafficApiPreference)?.description}
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p><strong>Pesymistyczny</strong> - najdłuższy czas, zakłada maksymalne korki. Zalecany dla godzin 7-10 i 14-18.</p>
                <p><strong>Uśredniony</strong> - średni czas na podstawie danych historycznych.</p>
                <p><strong>Optymistyczny</strong> - najkrótszy czas, zakłada pusty ruch.</p>
                <p><strong>Routes API</strong> - najnowsze API Google z danymi w czasie rzeczywistym.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Travel Times Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Car className="w-5 h-5 shrink-0 text-primary" />
                  Przewidywany czas dojazdu
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Najkrótszy czas podświetlony na zielono • {TRAFFIC_API_OPTIONS.find(o => o.value === trafficApiPreference)?.label}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshTravelTimes}
                disabled={refreshingTimes || !homeAddressValidated || !workAddressValidated}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingTimes ? 'animate-spin' : ''}`} />
                Oblicz czasy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {!homeAddressValidated || !workAddressValidated ? (
              <div className="text-center py-8 sm:py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <MapPin className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-sm px-4">
                  Najpierw zweryfikuj i zapisz adresy domu i pracy, aby zobaczyć czasy dojazdu.
                </p>
              </div>
            ) : travelTimes.length === 0 ? (
              <div className="text-center py-8 sm:py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-muted-foreground text-sm px-4">
                  Kliknij "Oblicz czasy" aby zobaczyć przewidywane czasy dojazdu
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedule.map((day) => {
                  const toWorkTimes = getDisplayTravelTimes(day.to_work_start, day.to_work_end, 'to_work', day.day_of_week);
                  const fromWorkTimes = getDisplayTravelTimes(day.from_work_start, day.from_work_end, 'from_work', day.day_of_week);
                  const toWorkMin = getMinTime(toWorkTimes);
                  const fromWorkMin = getMinTime(fromWorkTimes);
                  const hasToWorkData = toWorkTimes.some(t => t.minutes !== null);
                  const hasFromWorkData = fromWorkTimes.some(t => t.minutes !== null);

                  return (
                    <div key={day.id} className="border border-border rounded-xl overflow-hidden">
                      {/* Day header */}
                      <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {DAYS_PL[day.day_of_week].substring(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-sm">{DAYS_PL[day.day_of_week]}</span>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {/* To Work */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium">Do pracy</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {day.to_work_start} - {day.to_work_end}
                            </span>
                          </div>
                          {hasToWorkData ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                              {toWorkTimes.filter(t => t.minutes !== null).map((slot, idx) => {
                                const isMin = slot.minutes === toWorkMin;
                                return (
                                  <div 
                                    key={idx}
                                    className={`relative rounded-lg p-2 text-center transition-all ${
                                      isMin 
                                        ? 'bg-green-500/15 ring-2 ring-green-500/30' 
                                        : 'bg-muted/50 hover:bg-muted'
                                    }`}
                                  >
                                    {isMin && (
                                      <TrendingDown className="absolute -top-1 -right-1 w-4 h-4 text-green-600 bg-background rounded-full" />
                                    )}
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">{slot.time}</p>
                                    <p className={`text-sm sm:text-base font-bold ${isMin ? 'text-green-600' : ''}`}>
                                      {slot.minutes}
                                      <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-0.5">min</span>
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Brak danych - kliknij "Oblicz czasy"</p>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-dashed border-border" />

                        {/* From Work */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <Home className="w-3.5 h-3.5 text-orange-600" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium">Z pracy</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {day.from_work_start} - {day.from_work_end}
                            </span>
                          </div>
                          {hasFromWorkData ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                              {fromWorkTimes.filter(t => t.minutes !== null).map((slot, idx) => {
                                const isMin = slot.minutes === fromWorkMin;
                                return (
                                  <div 
                                    key={idx}
                                    className={`relative rounded-lg p-2 text-center transition-all ${
                                      isMin 
                                        ? 'bg-green-500/15 ring-2 ring-green-500/30' 
                                        : 'bg-muted/50 hover:bg-muted'
                                    }`}
                                  >
                                    {isMin && (
                                      <TrendingDown className="absolute -top-1 -right-1 w-4 h-4 text-green-600 bg-background rounded-full" />
                                    )}
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">{slot.time}</p>
                                    <p className={`text-sm sm:text-base font-bold ${isMin ? 'text-green-600' : ''}`}>
                                      {slot.minutes}
                                      <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-0.5">min</span>
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Brak danych - kliknij "Oblicz czasy"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto p-3 sm:p-4 mt-6 sm:mt-8 text-center text-xs sm:text-sm text-muted-foreground">
        <p>© 2024 eJedzie.pl - Prywatny asystent dojazdu do pracy</p>
      </footer>

      {/* Map Location Pickers */}
      <MapLocationPicker
        open={showHomeMapPicker}
        onClose={() => setShowHomeMapPicker(false)}
        onSelectLocation={(lat, lng) => handleMapLocationSelect('home', lat, lng)}
        initialLat={homeLocation?.lat}
        initialLng={homeLocation?.lng}
        title="Wybierz adres wyjazdu na mapie"
      />
      <MapLocationPicker
        open={showWorkMapPicker}
        onClose={() => setShowWorkMapPicker(false)}
        onSelectLocation={(lat, lng) => handleMapLocationSelect('work', lat, lng)}
        initialLat={workLocation?.lat}
        initialLng={workLocation?.lng}
        title="Wybierz adres pracy na mapie"
      />
    </div>
  );
};

export default Konto;
