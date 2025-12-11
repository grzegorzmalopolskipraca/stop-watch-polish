import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Save, MapPin, Briefcase, Clock, Search, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';

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
      // Get today's date in Poland timezone
      const today = new Date().toISOString().split('T')[0];
      
      const { data: timesData, error } = await supabase
        .from('commute_travel_times')
        .select('*')
        .eq('user_id', userId)
        .eq('travel_date', today);

      if (error) {
        console.error('Error loading travel times:', error);
        return;
      }

      if (timesData) {
        setTravelTimes(timesData as TravelTime[]);
      }
    } catch (error) {
      console.error('Error loading travel times:', error);
    }
  };

  const handleRefreshTravelTimes = async () => {
    if (!user) return;
    setRefreshingTimes(true);
    
    try {
      // Call the edge function to calculate current time slot
      const { data, error } = await supabase.functions.invoke('calculate-commute-times');
      
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
      
      toast({
        title: 'Odświeżono',
        description: `Obliczono ${data?.processed || 0} czasów dojazdu.`,
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

  // Get travel time for a specific slot
  const getTravelTimeForSlot = (direction: 'to_work' | 'from_work', time: string): number | null => {
    const match = travelTimes.find(
      t => t.direction === direction && t.departure_time.substring(0, 5) === time
    );
    return match ? match.travel_duration_minutes : null;
  };

  // Generate travel time data for display
  const getDisplayTravelTimes = (startTime: string, endTime: string, direction: 'to_work' | 'from_work') => {
    const slots = generateTimeSlots(startTime, endTime);
    return slots.map(time => ({
      time,
      minutes: getTravelTimeForSlot(direction, time),
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">eJedzie.pl</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Wyloguj
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Title */}
        <div className="text-center py-6">
          <h2 className="text-3xl font-bold text-foreground">Prywatny asystent dojazdu do pracy</h2>
          <p className="text-muted-foreground mt-2">
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
              <Label htmlFor="home-address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Mój adres wyjazdu
              </Label>
              <div className="flex gap-2">
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
                  className={homeAddressValidated ? 'border-green-500' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => validateAddress(homeAddress, 'home')}
                  disabled={validatingHome}
                  className="shrink-0"
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
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Adres zweryfikowany
                  {homeLocation && <span className="text-xs text-muted-foreground ml-2">({homeLocation.lat.toFixed(4)}, {homeLocation.lng.toFixed(4)})</span>}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-address" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                Adres mojej pracy
              </Label>
              <div className="flex gap-2">
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
                  className={workAddressValidated ? 'border-green-500' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => validateAddress(workAddress, 'work')}
                  disabled={validatingWork}
                  className="shrink-0"
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
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Adres zweryfikowany
                  {workLocation && <span className="text-xs text-muted-foreground ml-2">({workLocation.lat.toFixed(4)}, {workLocation.lng.toFixed(4)})</span>}
                </p>
              )}
            </div>

            <Button onClick={handleSaveAddresses} disabled={savingAddresses} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {savingAddresses ? 'Zapisywanie...' : 'Zapisz adresy'}
            </Button>
          </CardContent>
        </Card>

        {/* Schedule Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Harmonogram tygodniowy
            </CardTitle>
            <p className="text-sm text-muted-foreground">Zmiany zapisują się automatycznie</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium">Dzień</th>
                    <th className="text-center p-2 font-medium" colSpan={2}>Do pracy</th>
                    <th className="text-center p-2 font-medium" colSpan={2}>Z pracy</th>
                  </tr>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    <th></th>
                    <th className="p-2">Od</th>
                    <th className="p-2">Do</th>
                    <th className="p-2">Od</th>
                    <th className="p-2">Do</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((day) => (
                    <tr key={day.id} className="border-b border-border">
                      <td className="p-2 font-medium">{DAYS_PL[day.day_of_week]}</td>
                      <td className="p-2">
                        <Input
                          type="time"
                          value={day.to_work_start}
                          onChange={(e) => updateSchedule(day.day_of_week, 'to_work_start', e.target.value)}
                          className="w-24"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="time"
                          value={day.to_work_end}
                          onChange={(e) => updateSchedule(day.day_of_week, 'to_work_end', e.target.value)}
                          className="w-24"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="time"
                          value={day.from_work_start}
                          onChange={(e) => updateSchedule(day.day_of_week, 'from_work_start', e.target.value)}
                          className="w-24"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="time"
                          value={day.from_work_end}
                          onChange={(e) => updateSchedule(day.day_of_week, 'from_work_end', e.target.value)}
                          className="w-24"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Travel Times Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Przewidywany czas dojazdu
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">W zależności od godziny wyjazdu</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshTravelTimes}
                disabled={refreshingTimes || !homeAddressValidated || !workAddressValidated}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingTimes ? 'animate-spin' : ''}`} />
                Odśwież teraz
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!homeAddressValidated || !workAddressValidated ? (
              <p className="text-center text-muted-foreground py-8">
                Najpierw zweryfikuj i zapisz adresy domu i pracy, aby zobaczyć czasy dojazdu.
              </p>
            ) : (
              <div className="space-y-6">
                {schedule.filter(day => day.day_of_week >= 1 && day.day_of_week <= 5).map((day) => {
                  const toWorkTimes = getDisplayTravelTimes(day.to_work_start, day.to_work_end, 'to_work');
                  const fromWorkTimes = getDisplayTravelTimes(day.from_work_start, day.from_work_end, 'from_work');
                  const toWorkMin = getMinTime(toWorkTimes);
                  const fromWorkMin = getMinTime(fromWorkTimes);

                  return (
                    <div key={day.id} className="border border-border rounded-lg p-4">
                      <h4 className="font-medium mb-3">{DAYS_PL[day.day_of_week]}</h4>
                      
                      <div className="space-y-4">
                        {/* To Work */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Do pracy ({day.to_work_start} - {day.to_work_end})</p>
                          <div className="flex flex-wrap gap-1">
                            {toWorkTimes.map((slot, idx) => (
                              <div 
                                key={idx}
                                className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                                  slot.minutes !== null && slot.minutes === toWorkMin 
                                    ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30' 
                                    : slot.minutes !== null 
                                      ? 'bg-secondary' 
                                      : 'bg-muted/50 text-muted-foreground'
                                }`}
                              >
                                {slot.time}: <span className="font-medium">{slot.minutes !== null ? `${slot.minutes}min` : '—'}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* From Work */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Z pracy ({day.from_work_start} - {day.from_work_end})</p>
                          <div className="flex flex-wrap gap-1">
                            {fromWorkTimes.map((slot, idx) => (
                              <div 
                                key={idx}
                                className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                                  slot.minutes !== null && slot.minutes === fromWorkMin 
                                    ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30' 
                                    : slot.minutes !== null 
                                      ? 'bg-secondary' 
                                      : 'bg-muted/50 text-muted-foreground'
                                }`}
                              >
                                {slot.time}: <span className="font-medium">{slot.minutes !== null ? `${slot.minutes}min` : '—'}</span>
                              </div>
                            ))}
                          </div>
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
      <footer className="max-w-4xl mx-auto p-4 mt-8 text-center text-sm text-muted-foreground">
        <p>© 2024 eJedzie.pl - Prywatny asystent dojazdu do pracy</p>
      </footer>
    </div>
  );
};

export default Konto;
