import { useState, useEffect } from 'react';
import { Plus, Trash2, Camera, List, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Container, ContainerColor, containerColors } from '@/types/container';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface ContainerModalProps {
  open: boolean;
  onClose: () => void;
  container?: Container | null;
}

const locations = ['None', 'Attic', 'Basement', 'Garage', 'Closet', 'Shed', 'Storage Unit', 'Other'];

const saveContainer = async ({ containerData, token, containerId }: { containerData: any, token: string, containerId?: number }) => {
  const formData = new FormData();
  Object.keys(containerData).forEach(key => {
    if (key === 'items') {
      formData.append(key, JSON.stringify(containerData[key]));
    } else {
      formData.append(key, containerData[key]);
    }
  });

  const url = containerId ? `/api/containers/${containerId}/` : '/api/containers/';
  const method = containerId ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Token ${token}`
    },
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export function ContainerModal({ open, onClose, container }: ContainerModalProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('None');
  const [otherLocation, setOtherLocation] = useState('');
  const [color, setColor] = useState<ContainerColor>('blue');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [contentType, setContentType] = useState<'photo' | 'list' | 'text' | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [items, setItems] = useState<{ name: string; quantity: string; notes: string }[]>([
    { name: '', quantity: '1', notes: '' }
  ]);
  const [text, setText] = useState('');

  const isEditing = !!container;

  // Populate form when editing
  useEffect(() => {
    if (container && open) {
      setName(container.name);
      // Check if location is in the predefined list
      if (!container.location) {
        setLocation('None');
        setOtherLocation('');
      } else if (locations.includes(container.location)) {
        setLocation(container.location);
        setOtherLocation('');
      } else {
        setLocation('Other');
        setOtherLocation(container.location);
      }
      setColor(container.color);
      setIsPasswordProtected(container.is_password_protected || false);

      // Set content type and data based on what exists
      if (container.items.length > 0) {
        setContentType('list');
        setItems(container.items.map(item => ({
          name: item.name,
          quantity: String(item.quantity),
          notes: ''
        })));
      } else if (container.texts.length > 0) {
        setContentType('text');
        setText(container.texts[0].text);
      } else if (container.photos.length > 0) {
        setContentType('photo');
      } else {
        setContentType(null);
      }
    }
  }, [container, open]);

  const mutation = useMutation({
    mutationFn: saveContainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      resetAndClose();
    },
  });

  const resetForm = () => {
    setName('');
    setLocation('None');
    setOtherLocation('');
    setColor('blue');
    setIsPasswordProtected(false);
    setContentType(null);
    setPhoto(null);
    setItems([{ name: '', quantity: '1', notes: '' }]);
    setText('');
  };

  const resetAndClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const locationValue = location === 'None' ? '' : (location === 'Other' ? otherLocation : location);
    const containerData: any = {
      name,
      location: locationValue,
      color,
      is_password_protected: isPasswordProtected,
    };
    if (contentType === 'photo' && photo) {
      containerData.photo = photo;
    }
    if (contentType === 'list') {
      containerData.items = items.filter(item => item.name.trim()).map((item) => ({
        name: item.name,
        quantity: parseInt(item.quantity) || 1,
      }));
    }
    if (contentType === 'text') {
      containerData.text = text;
    }
    mutation.mutate({ containerData, token: token || '', containerId: container?.id });
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? 'Edit Container' : 'Add New Container'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">Container Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Holiday Decorations" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (<SelectItem key={loc} value={loc}>{loc}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {location === 'Other' && (
              <div className="space-y-2">
                <Label>Other Location</Label>
                <Input value={otherLocation} onChange={(e) => setOtherLocation(e.target.value)} placeholder="e.g., John's room" required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 pt-1">
                {(Object.keys(containerColors) as ContainerColor[]).map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: containerColors[c] }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Password Protection</Label>
              <p className="text-sm text-muted-foreground">Require password to view contents</p>
            </div>
            <Switch checked={isPasswordProtected} onCheckedChange={setIsPasswordProtected} />
          </div>

          {/* Content Type Selection */}
          <div className="space-y-2">
            <Label>Contents (optional)</Label>
            <div className="grid grid-cols-3 gap-4">
              <Button type="button" variant={contentType === 'photo' ? 'default' : 'outline'} onClick={() => setContentType(contentType === 'photo' ? null : 'photo')} className="h-20 flex-col"><Camera className="w-5 h-5 mb-1" />Photo</Button>
              <Button type="button" variant={contentType === 'list' ? 'default' : 'outline'} onClick={() => setContentType(contentType === 'list' ? null : 'list')} className="h-20 flex-col"><List className="w-5 h-5 mb-1" />List</Button>
              <Button type="button" variant={contentType === 'text' ? 'default' : 'outline'} onClick={() => setContentType(contentType === 'text' ? null : 'text')} className="h-20 flex-col"><FileText className="w-5 h-5 mb-1" />Text</Button>
            </div>
          </div>

          {/* Content Entry */}
          {contentType === 'photo' && (
            <div className="space-y-2">
              <Label htmlFor="photo">Upload Photo</Label>
              <Input id="photo" type="file" onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)} accept="image/*" />
            </div>
          )}
          {contentType === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setItems([...items, { name: '', quantity: '1', notes: '' }])}><Plus className="w-4 h-4 mr-1" />Add Item</Button>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input value={item.name} onChange={(e) => { const newItems = [...items]; newItems[index].name = e.target.value; setItems(newItems); }} placeholder="Item name" />
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => { const newItems = [...items]; newItems[index].quantity = e.target.value; setItems(newItems); }} className="w-20" placeholder="Qty" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {contentType === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="text">Content Description</Label>
              <Textarea id="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g., All of the Christmas decorations, including the tree stand, lights, and ornaments." />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending
              ? (isEditing ? 'Saving...' : 'Creating...')
              : (isEditing ? 'Save Changes' : 'Create Container')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Alias for backwards compatibility
export const AddContainerModal = ContainerModal;
