import { Coffee, Pizza, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SupportCard = () => (
  <div id="jak-korzystac" className="mb-6 space-y-4 rounded-lg border border-border bg-card p-6">
    <h3 className="text-lg font-semibold text-foreground">
      Nie chcę tracić życia w korkach, dlatego
    </h3>
    <div className="flex items-center justify-center gap-6 py-4">
      <ThumbsUp className="h-12 w-12 text-primary" />
      <Coffee className="h-12 w-12 text-primary" />
      <Pizza className="h-12 w-12 text-primary" />
    </div>
    <Button
      onClick={() => window.open('https://suppi.pl/ejedzie', '_blank', 'noopener,noreferrer')}
      className="h-14 w-full text-lg font-bold"
      size="lg"
    >
      Wspieram rozwój strony
    </Button>
  </div>
);

export default SupportCard;
