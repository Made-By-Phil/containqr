import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContainerColor, containerColors } from '@/types/container';

interface AddContainerModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (container: any) => void;
}

const locations = ['Attic', 'Basement', 'Garage', 'Closet', 'Shed', 'Storage Unit'];

export function AddContainerModal({ open, onClose, onSave }: AddContainerModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState<ContainerColor>('teal');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [items, setItems] = useState<{ name: string; quantity: string; notes: string }[]>([
    { name: '', quantity: '1', notes: '' }
  ]);

  const addItem = () => {
    setItems([...items, { name: '', quantity: '1', notes: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      location,
      color,
      isPasswordProtected,
      items: items.filter(item => item.name.trim()).map((item, i) => ({
        id: `new-${i}`,
        name: item.name,
        quantity: parseInt(item.quantity) || 1,
        notes: item.notes || undefined,
      })),
    });
    // Reset form
    setName('');
    setLocation('');
    setColor('teal');
    setIsPasswordProtected(false);
    setItems([{ name: '', quantity: '1', notes: '' }]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add New Container</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Container Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Container Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Holiday Decorations"
              required
            />
          </div>

          {/* Location & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={location} onValueChange={setLocation} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 pt-1">
                {(Object.keys(containerColors) as ContainerColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: containerColors[c] }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Password Protection */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Password Protection</Label>
              <p className="text-sm text-muted-foreground">Require password to view contents</p>
            </div>
            <Switch
              checked={isPasswordProtected}
              onCheckedChange={setIsPasswordProtected}
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      placeholder="Notes (optional)"
                    />
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Container
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
