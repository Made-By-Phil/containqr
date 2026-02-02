import { Package, MapPin, ChevronRight, List, FileText, Image } from 'lucide-react';
import { Container, containerColors } from '@/types/container';
import { Badge } from '@/components/ui/badge';

interface ContainerCardProps {
  container: Container;
  onClick: () => void;
}

export function ContainerCard({ container, onClick }: ContainerCardProps) {
  const colorValue = containerColors[container.color] || containerColors.blue;

  return (
    <button
      onClick={onClick}
      className="container-card w-full p-5 text-left group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div className="flex items-start gap-4">
        {/* Color indicator & icon */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${colorValue}20` }}
        >
          <Package
            className="w-6 h-6"
            style={{ color: colorValue }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-foreground truncate">
              {container.name}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <MapPin className="w-3.5 h-3.5" />
            <span>{container.location}</span>
            <span className="text-border">•</span>
            <span className="font-mono font-medium">{container.readable_id}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5 items-center">
              {container.items.length > 0 ? (
                <>
                  <List className="w-3.5 h-3.5 text-muted-foreground" />
                  {container.items.slice(0, 3).map((item) => (
                    <Badge key={item.id} variant="secondary" className="text-xs">
                      {item.name}
                    </Badge>
                  ))}
                  {container.items.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{container.items.length - 3} more
                    </Badge>
                  )}
                </>
              ) : container.texts?.length > 0 ? (
                <>
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {container.texts[0].text}
                  </span>
                </>
              ) : container.photos?.length > 0 ? (
                <>
                  <Image className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {container.photos.length} photo{container.photos.length !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No contents</span>
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        </div>
      </div>
    </button>
  );
}
