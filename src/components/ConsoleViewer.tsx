import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface LogEntry {
  timestamp: string;
  type: "log" | "error" | "warn" | "info";
  message: string;
}

export const ConsoleViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (type: LogEntry["type"], args: any[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");

      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type,
          message,
        },
      ]);
    };

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      addLog("log", args);
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      addLog("error", args);
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addLog("warn", args);
    };

    console.info = (...args: any[]) => {
      originalInfo.apply(console, args);
      addLog("info", args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "error":
        return "text-red-500";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card className="p-4 bg-muted/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Console Logs</h3>
        <Button
          onClick={clearLogs}
          variant="ghost"
          size="sm"
          className="h-8"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>
      <div className="bg-black/90 rounded p-3 h-64 overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">No logs yet...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500">[{log.timestamp}]</span>{" "}
              <span className={getLogColor(log.type)}>[{log.type.toUpperCase()}]</span>{" "}
              <span className="text-gray-300 whitespace-pre-wrap break-all">
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </Card>
  );
};
