import { useMemo, useEffect, useRef } from "react";
import { format, startOfDay } from "date-fns";
import { pl } from "date-fns/locale";
import { CircleDot } from "lucide-react";

interface Report {
  status: string;
  reported_at: string;
}

interface GreenWaveProps {
  reports: Report[];
}

interface TimeRange {
  start: string;
  end: string;
  durationMinutes: number;
  status: 'stoi' | 'toczy_sie' | 'jedzie';
}

export const GreenWave = ({ reports }: GreenWaveProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const greenWaveRanges = useMemo(() => {
    if (!reports || reports.length === 0) {
      return [];
    }

    // Filter reports to only today and past 7 days
    const today = startOfDay(new Date());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const relevantReports = reports.filter((r) => {
      const reportDate = new Date(r.reported_at);
      return reportDate >= weekAgo && reportDate <= new Date();
    });

    // Use 10-minute intervals (144 intervals per day: 24 hours * 6)
    interface IntervalStatus {
      time: string;
      averageStatus: 'stoi' | 'toczy_sie' | 'jedzie';
    }
    
    const resultStatusList: IntervalStatus[] = [];

    // Process each 10-minute interval
    for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += 10) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const endMinutes = totalMinutes + 10;

      // Count statuses in this 10-minute window
      let countStatusStoi = 0;
      let countStatusToczySie = 0;
      let countStatusJedzie = 0;

      relevantReports.forEach((r) => {
        const reportDate = new Date(r.reported_at);
        const reportTotalMinutes = reportDate.getHours() * 60 + reportDate.getMinutes();
        
        if (reportTotalMinutes >= totalMinutes && reportTotalMinutes < endMinutes) {
          if (r.status === "stoi") {
            countStatusStoi++;
          } else if (r.status === "toczy_sie") {
            countStatusToczySie++;
          } else if (r.status === "jedzie") {
            countStatusJedzie++;
          }
        }
      });

      // Determine average status (highest count, default to jedzie if all zero)
      let averageStatus: 'stoi' | 'toczy_sie' | 'jedzie' = 'jedzie';
      
      if (countStatusStoi === 0 && countStatusToczySie === 0 && countStatusJedzie === 0) {
        averageStatus = 'jedzie';
      } else if (countStatusStoi >= countStatusToczySie && countStatusStoi >= countStatusJedzie) {
        averageStatus = 'stoi';
      } else if (countStatusToczySie >= countStatusStoi && countStatusToczySie >= countStatusJedzie) {
        averageStatus = 'toczy_sie';
      } else {
        averageStatus = 'jedzie';
      }

      resultStatusList.push({
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        averageStatus,
      });
    }

    // Group consecutive periods of the same status
    const ranges: TimeRange[] = [];
    let rangeStart: string | null = null;
    let rangeStartMinutes = 0;
    let currentStatus: 'stoi' | 'toczy_sie' | 'jedzie' | null = null;

    resultStatusList.forEach((item, index) => {
      if (rangeStart === null) {
        // Start a new range
        rangeStart = item.time;
        rangeStartMinutes = index * 10;
        currentStatus = item.averageStatus;
      } else if (item.averageStatus !== currentStatus) {
        // Status changed, close current range and start new one
        const endMinutes = index * 10;
        const durationMinutes = endMinutes - rangeStartMinutes;
        
        ranges.push({
          start: rangeStart,
          end: item.time,
          durationMinutes,
          status: currentStatus!,
        });
        
        rangeStart = item.time;
        rangeStartMinutes = index * 10;
        currentStatus = item.averageStatus;
      }
    });

    // Handle the last range that extends to end of day
    if (rangeStart !== null && currentStatus !== null) {
      const endMinutes = 24 * 60;
      const durationMinutes = endMinutes - rangeStartMinutes;
      
      ranges.push({
        start: rangeStart,
        end: '24:00',
        durationMinutes,
        status: currentStatus,
      });
    }

    // Filter ranges to only show 5:00 - 22:00
    const filteredRanges = ranges.filter(range => {
      // Convert time string to minutes (e.g., "05:00" -> 300)
      const [startHour, startMin] = range.start.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      
      const [endHour, endMin] = range.end.split(':').map(Number);
      const endMinutes = endHour * 60 + endMin;
      
      // Only include ranges that overlap with 5:00 (300 min) to 22:00 (1320 min)
      const displayStart = 5 * 60; // 5:00 AM in minutes
      const displayEnd = 22 * 60;  // 22:00 in minutes
      
      // Check if range overlaps with display window
      return endMinutes > displayStart && startMinutes < displayEnd;
    }).map(range => {
      // Truncate ranges that extend beyond display window
      const [startHour, startMin] = range.start.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      
      const [endHour, endMin] = range.end.split(':').map(Number);
      const endMinutes = endHour * 60 + endMin;
      
      const displayStart = 5 * 60;
      const displayEnd = 22 * 60;
      
      const adjustedStart = Math.max(startMinutes, displayStart);
      const adjustedEnd = Math.min(endMinutes, displayEnd);
      
      const adjustedStartHour = Math.floor(adjustedStart / 60);
      const adjustedStartMin = adjustedStart % 60;
      const adjustedEndHour = Math.floor(adjustedEnd / 60);
      const adjustedEndMin = adjustedEnd % 60;
      
      return {
        ...range,
        start: `${String(adjustedStartHour).padStart(2, '0')}:${String(adjustedStartMin).padStart(2, '0')}`,
        end: `${String(adjustedEndHour).padStart(2, '0')}:${String(adjustedEndMin).padStart(2, '0')}`,
        durationMinutes: adjustedEnd - adjustedStart,
      };
    });

    return filteredRanges;
  }, [reports]);

  // Scroll to current time on mount (only once per session)
  useEffect(() => {
    if (greenWaveRanges.length === 0 || !containerRef.current) return;

    // Check if we've already scrolled in this session
    const hasScrolled = sessionStorage.getItem('greenWaveScrolled');
    if (hasScrolled) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Find the index of the time range that contains the current time
    const currentIndex = greenWaveRanges.findIndex((range) => {
      const [startHour, startMin] = range.start.split(':').map(Number);
      const [endHour, endMin] = range.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      return currentTotalMinutes >= startMinutes && currentTotalMinutes < endMinutes;
    });

    // If we found a matching range, scroll to it within the container only
    if (currentIndex !== -1 && itemRefs.current[currentIndex] && containerRef.current) {
      setTimeout(() => {
        const container = containerRef.current;
        const element = itemRefs.current[currentIndex];
        
        if (container && element) {
          // Calculate scroll position to center the element in the container
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const scrollTop = element.offsetTop - container.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);
          
          // Scroll the container, not the page
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
          });
          
          // Mark as scrolled in this session
          sessionStorage.setItem('greenWaveScrolled', 'true');
        }
      }, 100);
    }
  }, [greenWaveRanges]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minut`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 godzina' : `${hours} godziny`;
    }
    
    return `${hours} ${hours === 1 ? 'godzina' : 'godziny'} ${remainingMinutes} minut`;
  };

  if (greenWaveRanges.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Zielona fala
          <CircleDot className="h-5 w-5 text-green-500 fill-green-500" />
        </h2>
        <p className="text-sm text-muted-foreground">
          Brak danych o płynnym ruchu w ciągu ostatniego tygodnia
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        Zielona fala
        <CircleDot className="h-5 w-5 text-green-500 fill-green-500" />
      </h2>
      <p className="text-sm text-muted-foreground">
        Korzystaj z zielonej fali i wyjeżdżaj z domu w czasie mniejszego ruchu. Szybciej zajedziesz i odciążysz korki. Informuj jak wygląda ruch na Twojej ulicy a Zielona Fala będzie się aktualizować
      </p>
      <p className="text-sm text-muted-foreground">
        Zielona fala analizuje dane z Naszych zgłoszeń. Im więcej prawidłowych zgłoszeń, tym będzie dokładniejsza.
      </p>
      <p className="text-sm font-semibold">
        Wyjedź, kiedy masz zielony slot:
      </p>
      
      <div ref={containerRef} className="space-y-2 h-[45vh] overflow-y-auto pr-2">
        {greenWaveRanges.map((range, index) => {
          const bgColor = range.status === 'jedzie' 
            ? 'bg-traffic-jedzie/10 border-traffic-jedzie/20' 
            : range.status === 'stoi'
            ? 'bg-traffic-stoi/10 border-traffic-stoi/20'
            : 'bg-traffic-toczy/10 border-traffic-toczy/20';
          
          return (
            <div 
              key={index}
              ref={(el) => (itemRefs.current[index] = el)}
              className={`flex items-center justify-between p-3 rounded-lg border ${bgColor}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {range.start}
                </span>
                <span className="text-muted-foreground">do</span>
                <span className="text-sm font-medium">
                  {range.end}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDuration(range.durationMinutes)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
