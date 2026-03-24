import { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, MapPin, Calendar, Package, List, FileText, Image, Link as LinkIcon, Printer, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container, containerColors } from '@/types/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PrintLabelDialog } from '@/components/PrintLabelDialog';

interface ContainerDetailProps {
  container: Container;
  onBack: () => void;
  onEdit: () => void;
}

export function ContainerDetail({ container, onBack, onEdit }: ContainerDetailProps) {
  const { user } = useAuth();
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const colorValue = containerColors[container.color] || containerColors.blue;
  const publicUrl = `/c/${container.uuid}`;
  const qrCodeUrl = `/api/qr-code/${container.uuid}/`;
  
  return (
    <div>
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
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {container.name}
                  </h1>
                  {container.is_password_protected && (
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"
                      style={{ background: 'rgba(212,130,10,0.12)' }}
                      title="Password protected"
                    >
                      <Lock className="w-3.5 h-3.5" style={{ color: '#D4820A' }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>{container.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {new Date(container.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contents */}
          <div className="container-card p-6">
            {container.items.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <List className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-display text-lg font-semibold">
                    Contents ({container.items.length} items)
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {container.items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.quantity > 1 && (
                        <Badge variant="secondary">×{item.quantity}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : container.texts.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-display text-lg font-semibold">
                    Contents
                  </h2>
                </div>
                <div className="space-y-4">
                  {container.texts.map((textItem) => (
                    <p key={textItem.id} className="text-foreground whitespace-pre-wrap">
                      {textItem.text}
                    </p>
                  ))}
                </div>
              </>
            ) : container.photos.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Image className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-display text-lg font-semibold">
                    Contents
                  </h2>
                </div>
                <div className="grid gap-4">
                  {container.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.image}
                      alt="Container contents"
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No contents added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Sidebar */}
        <div className="lg:col-span-1">
          <div className="container-card p-6 sticky top-6">
            <h2 className="font-display text-lg font-semibold mb-4 text-center">
              Container Label
            </h2>
            <img src={qrCodeUrl} alt={`QR code for ${container.name}`} />
            <p className="text-center font-bold text-lg mt-2">{container.readable_id}</p>
            <Link
              to={publicUrl}
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary mt-3"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="truncate">{window.location.origin}{publicUrl}</span>
            </Link>
            <Button
              variant="outline"
              className="w-full mt-4 gap-2"
              onClick={() => setPrintDialogOpen(true)}
            >
              <Printer className="w-4 h-4" />
              Print Label
            </Button>
          </div>
        </div>
      </div>

      <PrintLabelDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        qrCodeUrl={qrCodeUrl}
        readableId={container.readable_id}
      />
    </div>
  );
}
