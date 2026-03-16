'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const VIDEOS = [
  { id: 'zvymdH7MUWs', title: 'Blockchain & Sui basics' },
  { id: 'EkaHy6OZtgs', title: 'Sui stack' },
  { id: '7_O2P6VYasA', title: 'Tying Sui to Move' },
  { id: 'ggSNWXwBOHU', title: 'Move objects' },
] as const;

export function VideoGallerySection() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  return (
    <section className="my-16">
      <h2 className="text-4xl md:text-5xl font-bold text-center leading-tight">
        Watch & Learn
      </h2>
      <p className="text-muted-foreground text-center max-w-2xl mx-auto mt-4 mb-10">
        Tutorials, gameplay, and community highlights. Click to play.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {VIDEOS.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setSelectedVideoId(video.id)}
            className="group relative rounded-2xl overflow-hidden min-h-[180px] md:min-h-[220px] flex flex-col justify-end text-left w-full"
          >
            <img
              src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
              alt={video.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-white/90 p-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-white">
                <Play className="size-8 text-foreground fill-foreground ml-0.5" />
              </div>
            </div>
            <div className="relative z-10 p-5">
              <h3 className="text-white text-lg font-bold leading-snug">{video.title}</h3>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!selectedVideoId} onOpenChange={(open) => !open && setSelectedVideoId(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogTitle className="sr-only">
            {VIDEOS.find((v) => v.id === selectedVideoId)?.title ?? 'Video'}
          </DialogTitle>
          {selectedVideoId && (
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`}
                title={VIDEOS.find((v) => v.id === selectedVideoId)?.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
