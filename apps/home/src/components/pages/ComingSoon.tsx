import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ComingSoon() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-foreground mb-4">Coming Soon</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Learn Move — resources and tutorials for the Move language. Your starting point for building on Sui.
      </p>
      <Button asChild size="lg">
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  );
}
