import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Save, MapPin, Briefcase, Clock } from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';

interface CommuteSchedule {
  id: string;
  day_of_week: number;
  to_work_start: string;
  to_work_end: string;
  from_work_start: string;
  from_work_end: string;
}

const DAYS_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

// Generate mock travel times (will be replaced with real data later)
const generateMockTravelTimes = (startTime: string, endTime: string): { time: string; minutes: number }[] => {
  const times: { time: string; minutes: number }[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    times.push({
      time: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
      minutes: Math.floor(Math.random() * 20) + 15, // Random 15-35 minutes
    });
    currentMinutes += 10;
  }
  
  return times;
};

const Konto = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [schedule, setSchedule] = useState<CommuteSchedule[]>([]);
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
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          home_address: homeAddress,
          work_address: workAddress,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update schedule
      for (const day of schedule) {
        const { error: scheduleError } = await supabase
          .from('commute_schedule')
          .update({
            to_work_start: day.to_work_start,
            to_work_end: day.to_work_end,
            from_work_start: day.from_work_start,
            from_work_end: day.from_work_end,
          })
          .eq('id', day.id);

        if (scheduleError) throw scheduleError;
      }

      toast({
        title: 'Zapisano!',
        description: 'Twoje ustawienia zostały zapisane.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać ustawień.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (dayIndex: number, field: keyof CommuteSchedule, value: string) => {
    setSchedule(prev => prev.map(day => 
      day.day_of_week === dayIndex ? { ...day, [field]: value } : day
    ));
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
              <Input
                id="home-address"
                type="text"
                placeholder="np. ul. Przykładowa 10, Wrocław"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-address" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                Adres mojej pracy
              </Label>
              <Input
                id="work-address"
                type="text"
                placeholder="np. ul. Firmowa 5, Wrocław"
                value={workAddress}
                onChange={(e) => setWorkAddress(e.target.value)}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Zapisywanie...' : 'Zapisz'}
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

            <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </CardContent>
        </Card>

        {/* Travel Times Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Przewidywany czas dojazdu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {schedule.filter(day => day.day_of_week >= 1 && day.day_of_week <= 5).map((day) => (
                <div key={day.id} className="border border-border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{DAYS_PL[day.day_of_week]}</h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* To Work */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Do pracy ({day.to_work_start} - {day.to_work_end})</p>
                      <div className="flex flex-wrap gap-2">
                        {generateMockTravelTimes(day.to_work_start, day.to_work_end).map((slot, idx) => (
                          <div 
                            key={idx}
                            className="text-xs bg-secondary px-2 py-1 rounded"
                          >
                            {slot.time}: <span className="font-medium">{slot.minutes}min</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* From Work */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Z pracy ({day.from_work_start} - {day.from_work_end})</p>
                      <div className="flex flex-wrap gap-2">
                        {generateMockTravelTimes(day.from_work_start, day.from_work_end).map((slot, idx) => (
                          <div 
                            key={idx}
                            className="text-xs bg-secondary px-2 py-1 rounded"
                          >
                            {slot.time}: <span className="font-medium">{slot.minutes}min</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
