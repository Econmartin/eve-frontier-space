import { useSearchParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export function ViewPage() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url') ?? '';

  return (
    <div className="fixed inset-0 flex flex-col">
      <Link
        to="/directory"
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white/90 text-sm hover:bg-black/90 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>
      <iframe
        src={url}
        className="flex-1 w-full border-0"
        title="App viewer"
        allow="fullscreen"
      />
    </div>
  );
}
