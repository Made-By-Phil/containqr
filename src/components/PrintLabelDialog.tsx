import { useState, useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PrintLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeUrl: string;
  readableId: string;
}

type SizeOption = 'letter' | 'a4' | '50' | '25' | 'custom';

// Paper widths in CSS pixels (at 96 DPI)
const PAPER_WIDTHS = {
  letter: 816, // 8.5 inches * 96 DPI
  a4: 794,     // 210mm ≈ 8.27 inches * 96 DPI
};

export function PrintLabelDialog({
  open,
  onOpenChange,
  qrCodeUrl,
  readableId
}: PrintLabelDialogProps) {
  const [sizeOption, setSizeOption] = useState<SizeOption>('letter');
  const [customPercent, setCustomPercent] = useState('75');
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const handlePrint = () => {
    // Calculate the label width based on selection
    let labelWidth: number;
    let paperType: 'letter' | 'a4' = 'letter';

    switch (sizeOption) {
      case 'letter':
        labelWidth = PAPER_WIDTHS.letter;
        paperType = 'letter';
        break;
      case 'a4':
        labelWidth = PAPER_WIDTHS.a4;
        paperType = 'a4';
        break;
      case '50':
        labelWidth = PAPER_WIDTHS.letter * 0.5;
        break;
      case '25':
        labelWidth = PAPER_WIDTHS.letter * 0.25;
        break;
      case 'custom':
        const percent = Math.min(100, Math.max(1, parseInt(customPercent) || 50));
        labelWidth = PAPER_WIDTHS.letter * (percent / 100);
        break;
      default:
        labelWidth = PAPER_WIDTHS.letter;
    }

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Container Label - ${readableId}</title>
          <style>
            @page {
              size: ${paperType};
              margin: 0.5in;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              padding-top: 0.5in;
            }
            .label-container {
              width: ${labelWidth}px;
              text-align: center;
            }
            .qr-code {
              width: 100%;
              height: auto;
              display: block;
            }
            .readable-id {
              font-size: ${Math.max(24, labelWidth * 0.08)}px;
              font-weight: bold;
              margin-top: ${labelWidth * 0.03}px;
              letter-spacing: 0.05em;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <img class="qr-code" src="${window.location.origin}${qrCodeUrl}" alt="QR Code" />
            <div class="readable-id">${readableId}</div>
          </div>
        </body>
      </html>
    `;

    // Create a hidden iframe for printing
    let printFrame = printFrameRef.current;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.style.left = '-9999px';
      document.body.appendChild(printFrame);
      printFrameRef.current = printFrame;
    }

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(printContent);
      frameDoc.close();

      // Wait for the image to load before printing
      const img = frameDoc.querySelector('img');
      if (img) {
        if (img.complete) {
          printFrame.contentWindow?.print();
          onOpenChange(false);
        } else {
          img.onload = () => {
            printFrame?.contentWindow?.print();
            onOpenChange(false);
          };
          img.onerror = () => {
            // Print anyway even if image fails
            printFrame?.contentWindow?.print();
            onOpenChange(false);
          };
        }
      } else {
        printFrame.contentWindow?.print();
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Label</DialogTitle>
          <DialogDescription>
            Choose the size for your container label
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={sizeOption}
            onValueChange={(value) => setSizeOption(value as SizeOption)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="letter" id="letter" />
              <Label htmlFor="letter" className="font-normal cursor-pointer">
                Letter size (8.5" x 11") - Full width
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="a4" id="a4" />
              <Label htmlFor="a4" className="font-normal cursor-pointer">
                A4 size (210mm x 297mm) - Full width
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="50" id="50" />
              <Label htmlFor="50" className="font-normal cursor-pointer">
                50% width
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="25" id="25" />
              <Label htmlFor="25" className="font-normal cursor-pointer">
                25% width
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="font-normal cursor-pointer">
                Custom
              </Label>
              {sizeOption === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={customPercent}
                    onChange={(e) => setCustomPercent(e.target.value)}
                    className="w-20 h-8"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
