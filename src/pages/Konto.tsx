import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Save, MapPin, Briefcase, Clock, Search, CheckCircle, Loader2, RefreshCw, Map, Crosshair, Car } from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';
import MapLocationPicker from '@/components/MapLocationPicker';
import Seo from "@/components/Seo";
import { Slider } from '@/components/ui/slider';
import { getBestTravelTimes, type CommuteTravelTimeRecord } from '@/utils/commuteTravelTimes';
import SupportCard from '@/components/SupportCard';

interface CommuteSchedule {
  id: string;
  day_of_week: number;
  is_commute_day: boolean;
  work_hours: number;
  to_work_start: string;
  to_work_end: string;
  from_work_start: string;
  from_work_end: string;
}

interface AddressLocation {
  lat: number;
  lng: number;
}

interface TravelTime extends CommuteTravelTimeRecord {
  travel_date: string;
  calculated_at: string;
}

const DAYS_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const WEEKDAYS_FIRST = [
  { day: 1, label: 'Pon' },
  { day: 2, label: 'Wt' },
  { day: 3, label: 'Śr' },
  { day: 4, label: 'Czw' },
  { day: 5, label: 'Pt' },
  { day: 6, label: 'Sob' },
  { day: 0, label: 'Ndz' },
];

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
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [travelTimes, setTravelTimes] = useState<TravelTime[]>([]);
  const [refreshingTimes, setRefreshingTimes] = useState(false);
  const [showHomeMapPicker, setShowHomeMapPicker] = useState(false);
  const [showWorkMapPicker, setShowWorkMapPicker] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState<'home' | 'work' | null>(null);
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
      // Refresh only the current slot inside the configured commute window.
      // Always use the TomTom traffic provider.
      const { data, error } = await supabase.functions.invoke('calculate-commute-times', {
        body: { force: true, refreshCurrentSlot: true, trafficApi: 'tomtom' }
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
      
      if (data?.noCommuteToday) {
        toast({
          title: 'Brak dojazdu w dzisiejszym harmonogramie',
          description: 'Wyniki dla tego dnia pochodzą z wcześniejszych odczytów. Nowe pojawią się w wybrane dni.',
        });
      } else if (data?.outsideScheduleWindow) {
        toast({
          title: 'Poza ustawionym przedziałem',
          description: 'Nowe czasy są mierzone na bieżąco w ustawionych godzinach wyjazdu i powrotu. Spróbuj ponownie w tym przedziale.',
        });
      } else if (data?.errors?.length && !data?.processed) {
        toast({
          title: 'Nie udało się odświeżyć czasów',
          description: 'TomTom nie zwrócił aktualnego czasu przejazdu. Spróbuj ponownie za chwilę.',
          variant: 'destructive',
        });
      } else {
        const slotsInfo = data?.slots?.length > 0
          ? `Zaktualizowano ${data.processed} odczytów (TomTom Traffic): ${data.slots.join(', ')}.`
          : `Zaktualizowano ${data?.processed || 0} odczytów (TomTom Traffic).`;

        toast({
          title: 'Czasy odświeżone',
          description: slotsInfo,
        });
      }
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

  const saveSchedule = async (nextSchedule: CommuteSchedule[]) => {
    if (!user) return;
    setSavingSchedule(true);
    try {
      const { error } = await supabase
        .from('commute_schedule')
        .upsert(nextSchedule.map(day => ({
          ...day,
          user_id: user.id,
        })), { onConflict: 'user_id,day_of_week' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać harmonogramu.',
        variant: 'destructive',
      });
      await loadUserData(user.id);
    } finally {
      setSavingSchedule(false);
    }
  };

  const updateWorkdays = (dayIndex: number) => {
    const nextSchedule = schedule.map(day => day.day_of_week === dayIndex
      ? { ...day, is_commute_day: !day.is_commute_day }
      : day);
    setSchedule(nextSchedule);
    void saveSchedule(nextSchedule);
  };

  const updateSharedSchedule = (change: { to_work_start?: string; to_work_end?: string; work_hours?: number }, persist = true) => {
    if (schedule.length === 0) return;
    const current = schedule.find(day => day.day_of_week === 1) ?? schedule[0];
    let toWorkStart = change.to_work_start ?? current.to_work_start.slice(0, 5);
    let toWorkEnd = change.to_work_end ?? current.to_work_end.slice(0, 5);
    const workHours = change.work_hours ?? current.work_hours ?? 8;

    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    if (toMinutes(toWorkStart) > toMinutes(toWorkEnd)) {
      if (change.to_work_start) toWorkEnd = toWorkStart;
      else toWorkStart = toWorkEnd;
    }
    const formatTime = (minutes: number) => {
      const clampedMinutes = Math.min(minutes, 23 * 60 + 59);
      return `${Math.floor(clampedMinutes / 60).toString().padStart(2, '0')}:${(clampedMinutes % 60).toString().padStart(2, '0')}`;
    };
    const fromWorkStart = formatTime(toMinutes(toWorkStart) + (workHours - 1) * 60);
    const fromWorkEnd = formatTime(toMinutes(toWorkEnd) + (workHours + 1) * 60);
    const nextSchedule = schedule.map(day => ({
      ...day,
      to_work_start: toWorkStart,
      to_work_end: toWorkEnd,
      from_work_start: fromWorkStart,
      from_work_end: fromWorkEnd,
      work_hours: workHours,
    }));
    setSchedule(nextSchedule);
    if (persist) void saveSchedule(nextSchedule);
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
      <Seo title="Moje konto — eJedzie.pl" description="Panel użytkownika eJedzie.pl." noindex />
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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground px-2">Znajdź najlepszą godzinę wyjazdu do pracy</h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base px-2">Oszczędzaj czas, paliwo i nerwy</p>
        </div>

        {/* Address Card */}
        <Card>
          <CardContent className="space-y-4 pt-5 sm:pt-6">
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

        {/* Shared weekly schedule */}
        <Card>
          <CardContent className="space-y-5 px-4 pt-5 sm:px-6 sm:pt-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">W jakie dni jeździsz do pracy:</p>
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAYS_FIRST.map(({ day, label }) => {
                  const daySchedule = schedule.find(item => item.day_of_week === day);
                  const selected = daySchedule?.is_commute_day ?? (day >= 1 && day <= 5);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${DAYS_PL[day]}${selected ? ', wybrany' : ', niewybrany'}`}
                      disabled={savingSchedule || !daySchedule}
                      onClick={() => updateWorkdays(day)}
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-semibold transition-colors sm:h-11 sm:w-11 sm:text-xs ${
                        selected
                          ? 'bg-black text-white shadow-sm dark:bg-white dark:text-black'
                          : 'border border-gray-300 bg-white text-black hover:bg-gray-50 dark:border-gray-600 dark:bg-black dark:text-white dark:hover:bg-gray-900'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {schedule.length > 0 && (() => {
              const settings = schedule.find(day => day.day_of_week === 1) ?? schedule[0];
              const start = settings.to_work_start.slice(0, 5);
              const end = settings.to_work_end.slice(0, 5);
              const workHours = settings.work_hours || 8;
              return (
                <>
                  <div className="space-y-2">
                    <Label>Przedział wyjazdu do pracy</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        aria-label="Wyjazd do pracy od"
                        type="time"
                        value={start}
                        disabled={savingSchedule}
                        onChange={(event) => updateSharedSchedule({ to_work_start: event.target.value })}
                        className="h-10 text-center"
                      />
                      <span className="text-sm text-muted-foreground">do</span>
                      <Input
                        aria-label="Wyjazd do pracy do"
                        type="time"
                        value={end}
                        disabled={savingSchedule}
                        onChange={(event) => updateSharedSchedule({ to_work_end: event.target.value })}
                        className="h-10 text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="work-hours-slider">Ile godzin spędzasz w pracy?</Label>
                      <span className="min-w-16 rounded-full bg-primary/10 px-3 py-1 text-center text-sm font-semibold text-primary">
                        {workHours} godz.
                      </span>
                    </div>
                    <Slider
                      id="work-hours-slider"
                      min={1}
                      max={12}
                      step={1}
                      value={[workHours]}
                      disabled={savingSchedule}
                      aria-label="Liczba godzin w pracy"
                      onValueChange={([value]) => updateSharedSchedule({ work_hours: value }, false)}
                      onValueCommit={([value]) => updateSharedSchedule({ work_hours: value })}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 godz.</span>
                      <span>12 godz.</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Zakres powrotu: {settings.from_work_start.slice(0, 5)}–{settings.from_work_end.slice(0, 5)}
                      {' '}(od {Math.max(0, workHours - 1)} do {workHours + 1} godz. po wyjeździe)
                    </p>
                  </div>
                </>
              );
            })()}

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
              {savingSchedule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
              {savingSchedule ? 'Zapisywanie…' : 'Zmiany zapisują się automatycznie'}
            </p>
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
                  Najlepsze odnotowane godziny wyjazdu według dnia
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
                {refreshingTimes ? 'Odświeżanie…' : 'Odśwież czasy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {!homeAddressValidated || !workAddressValidated ? (
              <div className="text-center py-5 space-y-2">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <MapPin className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-sm px-4">
                  Najpierw zweryfikuj i zapisz adresy domu i pracy, aby zobaczyć czasy dojazdu.
                </p>
              </div>
            ) : travelTimes.length === 0 ? (
              <div className="text-center py-5 space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-muted-foreground text-sm px-4">
                  Kliknij „Oblicz czasy”, aby rozpocząć zbieranie danych dla każdego dnia.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-[64px_1fr_1fr] items-center gap-2 pb-2 text-[11px] font-medium text-muted-foreground sm:grid-cols-[100px_1fr_1fr] sm:text-xs">
                  <span>Dzień</span>
                  <span>Do pracy · godz. / min</span>
                  <span>Z pracy · godz. / min</span>
                </div>
                {schedule
                  .filter(day => day.is_commute_day || travelTimes.some(time => time.day_of_week === day.day_of_week))
                  .sort((a, b) => WEEKDAYS_FIRST.findIndex(item => item.day === a.day_of_week) - WEEKDAYS_FIRST.findIndex(item => item.day === b.day_of_week))
                  .map(day => {
                    const toWork = getBestTravelTimes(
                      'to_work',
                      day.day_of_week,
                      day.to_work_start,
                      day.to_work_end,
                    );
                    const fromWork = getBestTravelTimes(
                      'from_work',
                      day.day_of_week,
                      day.from_work_start,
                      day.from_work_end,
                    );
                    const renderTimes = (times: TravelTime[], direction: 'to_work' | 'from_work') => (
                      <div className={`min-w-0 rounded-lg px-2 py-2 sm:px-3 ${direction === 'to_work' ? 'bg-blue-500/5' : 'bg-orange-500/5'}`}>
                        {times.length ? (
                          <ol className="space-y-1">
                            {times.map((time, index) => (
                              <li key={`${time.departure_time}-${time.travel_duration_minutes}`} className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-xs sm:text-sm ${index === 0 ? 'bg-green-600/10 font-semibold text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                                <span>{time.departure_time.slice(0, 5)}</span>
                                <span className="whitespace-nowrap text-[10px] font-normal text-muted-foreground sm:text-xs">{time.travel_duration_minutes} min</span>
                              </li>
                            ))}
                          </ol>
                        ) : <span className="text-sm text-muted-foreground">—</span>}
                      </div>
                    );
                    return (
                      <div key={day.id} className="grid grid-cols-[64px_1fr_1fr] items-center gap-2 py-2.5 sm:grid-cols-[100px_1fr_1fr]">
                        <span className="text-xs font-semibold sm:text-sm">{DAYS_PL[day.day_of_week]}</span>
                        {renderTimes(toWork, 'to_work')}
                        {renderTimes(fromWork, 'from_work')}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <SupportCard />
      </div>

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
