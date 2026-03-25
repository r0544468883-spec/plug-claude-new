import { AspectRatio } from '@/components/ui/aspect-ratio';

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <AspectRatio ratio={16 / 9} className="rounded-lg overflow-hidden bg-muted mb-3">
      <video
        src={src}
        poster={poster}
        controls
        preload="metadata"
        className="w-full h-full object-cover"
        controlsList="nodownload"
      />
    </AspectRatio>
  );
}
