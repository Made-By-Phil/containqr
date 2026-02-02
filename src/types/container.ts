export interface ContainerItem {
  id: number;
  name: string;
  quantity: number;
}

export interface ContainerPhoto {
  id: number;
  image: string;
}

export interface ContainerText {
  id: number;
  text: string;
}

export interface Container {
  id: number;
  readable_id: string;
  uuid: string;
  name: string;
  location: string;
  other_location?: string;
  items: ContainerItem[];
  photos: ContainerPhoto[];
  texts: ContainerText[];
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  color: ContainerColor;
}

export type ContainerColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'brown'
  | 'black';

export const containerColors: Record<ContainerColor, string> = {
  red: 'hsl(0 70% 50%)',
  orange: 'hsl(30 90% 55%)',
  yellow: 'hsl(50 90% 50%)',
  green: 'hsl(140 60% 45%)',
  blue: 'hsl(210 80% 50%)',
  purple: 'hsl(270 60% 55%)',
  brown: 'hsl(30 40% 35%)',
  black: 'hsl(0 0% 20%)',
};
