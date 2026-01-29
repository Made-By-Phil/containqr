import { ArrowLeft, Edit2, Trash2, Lock, MapPin, Calendar, Package } from 'lucide-react';
import { Container, containerColors, ContainerColor } from '@/types/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeDisplay } from './QRCodeDisplay';

interface ContainerDetailProps {
  container: Container;
  onBack: () => void;
  onEdit: () => void;
}

export function ContainerDetail({ container, onBack, onEdit }: ContainerDetailProps) {
  const colorValue = containerColors[container.color as ContainerColor] || containerColors.teal;
  
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title Section */}
          <div className="container-card p-6">
            <div className="flex items-start gap-4 mb-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colorValue}20` }}
              >
                <Package 
                  className="w-7 h-7"
                  style={{ color: colorValue }}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {container.name}
                  </h1>
                  {container.isPasswordProtected && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="w-3 h-3" />
                      Protected
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>{container.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {container.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="container-card p-6">
            <h2 className="font-display text-lg font-semibold mb-4">
              Contents ({container.items.length} items)
            </h2>
            <div className="divide-y divide-border">
              {container.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                  {item.quantity && item.quantity > 1 && (
                    <Badge variant="secondary">×{item.quantity}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* QR Code Sidebar */}
        <div className="lg:col-span-1">
          <div className="container-card p-6 sticky top-6">
            <h2 className="font-display text-lg font-semibold mb-4 text-center">
              Container Label
            </h2>
            <QRCodeDisplay
              shortId={container.shortId}
              containerId={container.id}
              containerName={container.name}
              size="lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
