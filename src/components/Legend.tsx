export const Legend = () => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Legenda kolorów ruchu</h3>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-traffic-stoi" />
          <span className="text-sm">Stoi</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-traffic-toczy" />
          <span className="text-sm">Toczy się</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-traffic-jedzie" />
          <span className="text-sm">Jedzie</span>
        </div>
      </div>
    </div>
  );
};