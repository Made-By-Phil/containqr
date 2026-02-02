import { QrCode, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRCodeDisplayProps {
  readableId: string;
  containerId: string;
  containerName: string;
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
}

const sizeMap = {
  sm: 80,
  md: 120,
  lg: 180,
};

export function QRCodeDisplay({
  readableId,
  containerId,
  containerName,
  size = 'md',
  showActions = true
}: QRCodeDisplayProps) {
  const qrSize = sizeMap[size];
  
  // Generate a simple QR code pattern (in real app, use a QR library)
  const generateQRPattern = () => {
    const pattern = [];
    const gridSize = 7;
    for (let i = 0; i < gridSize * gridSize; i++) {
      // Create a deterministic pattern based on containerId
      const hash = containerId.charCodeAt(i % containerId.length) + i;
      pattern.push(hash % 3 !== 0);
    }
    return pattern;
  };

  const pattern = generateQRPattern();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="qr-container flex flex-col items-center gap-3">
        {/* QR Code Placeholder */}
        <div 
          className="bg-card rounded-lg p-3 border border-border"
          style={{ width: qrSize + 24, height: qrSize + 24 }}
        >
          <div 
            className="grid gap-0.5"
            style={{ 
              width: qrSize, 
              height: qrSize,
              gridTemplateColumns: `repeat(7, 1fr)`,
            }}
          >
            {pattern.map((filled, i) => (
              <div 
                key={i} 
                className={`rounded-sm ${filled ? 'bg-foreground' : 'bg-transparent'}`}
              />
            ))}
          </div>
        </div>
        
        {/* Readable ID Badge */}
        <div className="font-display text-xl font-bold text-foreground tracking-wider">
          {readableId}
        </div>
        
        <p className="text-sm text-muted-foreground text-center max-w-[200px] truncate">
          {containerName}
        </p>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
