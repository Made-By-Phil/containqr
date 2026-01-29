export interface ContainerItem {
  id: string;
  name: string;
  quantity?: number;
  notes?: string;
}

export interface Container {
  id: string;
  shortId: string; // e.g., "01-A", "02-B"
  name: string;
  location: string;
  items: ContainerItem[];
  isPasswordProtected: boolean;
  createdAt: Date;
  updatedAt: Date;
  color: string;
}

export type ContainerColor = 
  | 'teal'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'emerald'
  | 'sky';

export const containerColors: Record<ContainerColor, string> = {
  teal: 'hsl(174 60% 40%)',
  amber: 'hsl(35 90% 55%)',
  rose: 'hsl(350 70% 55%)',
  violet: 'hsl(270 60% 55%)',
  emerald: 'hsl(155 60% 45%)',
  sky: 'hsl(200 80% 50%)',
};
