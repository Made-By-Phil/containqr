import { useState, useMemo, useEffect } from 'react';
import { Plus, Package, LayoutGrid, List, Edit2, Trash2, MapPin, ChevronDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SearchBar } from '@/components/SearchBar';
import { ContainerCard } from '@/components/ContainerCard';
import { ContainerDetail } from '@/components/ContainerDetail';
import { ContainerModal } from '@/components/AddContainerModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Container, containerColors } from '@/types/container';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const fetchContainers = async (searchQuery: string, token: string) => {
  const response = await fetch(`/api/containers/?search=${searchQuery}`, {
    headers: {
      'Authorization': `Token ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const fetchLocations = async (token: string) => {
  const response = await fetch('/api/locations/', {
    headers: {
      'Authorization': `Token ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const Dashboard = () => {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'location' | 'color' | 'created_at' | 'updated_at'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: containers = [], isLoading: isLoadingContainers } = useQuery<Container[]>({
    queryKey: ['containers', searchQuery, token],
    queryFn: () => fetchContainers(searchQuery, token || ''),
    enabled: !!token,
  });

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<any[]>({
    queryKey: ['locations', token],
    queryFn: () => fetchLocations(token || ''),
    enabled: !!token,
  });


  // Sync selectedContainer with latest data after edits
  useEffect(() => {
    if (selectedContainer) {
      const updated = containers.find(c => c.id === selectedContainer.id);
      if (updated && updated !== selectedContainer) {
        setSelectedContainer(updated);
      }
    }
  }, [containers, selectedContainer]);

  // Filter and sort containers
  const filteredContainers = useMemo(() => {
    let result = containers.filter(container => {
      // Location filter (multi-select)
      if (selectedLocations.length > 0 && !selectedLocations.includes(container.location)) {
        return false;
      }
      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'color':
          comparison = a.color.localeCompare(b.color);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [containers, selectedLocations, sortBy, sortDirection]);

  const toggleLocation = (locationName: string) => {
    setSelectedLocations(prev =>
      prev.includes(locationName)
        ? prev.filter(l => l !== locationName)
        : [...prev, locationName]
    );
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const sortLabels: Record<typeof sortBy, string> = {
    name: 'Alphabetical',
    location: 'Location',
    color: 'Color',
    created_at: 'Created Date',
    updated_at: 'Updated Date',
  };

  // Get content excerpt for list view
  const getContentExcerpt = (container: Container): string => {
    if (container.items.length > 0) {
      const itemNames = container.items.slice(0, 3).map(i => i.name).join(', ');
      return container.items.length > 3 ? `${itemNames}, +${container.items.length - 3} more` : itemNames;
    }
    if (container.texts?.length > 0) {
      const text = container.texts[0].text;
      return text.length > 60 ? text.substring(0, 60) + '...' : text;
    }
    if (container.photos?.length > 0) {
      return `${container.photos.length} photo${container.photos.length !== 1 ? 's' : ''}`;
    }
    return 'No contents';
  };

  if (selectedContainer) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1">
          <ContainerDetail
            container={selectedContainer}
            onBack={() => setSelectedContainer(null)}
            onEdit={() => {
              setEditingContainer(selectedContainer);
              setIsModalOpen(true);
            }}
          />
        </main>
        <Footer />
        <ContainerModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingContainer(null);
          }}
          container={editingContainer}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
              My Containers
            </h1>
            <p className="text-muted-foreground">
              {containers.length} container{containers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => { setEditingContainer(null); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Container
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-4">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2.5 ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Location Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  {selectedLocations.length === 0
                    ? 'All Locations'
                    : `${selectedLocations.length} Location${selectedLocations.length !== 1 ? 's' : ''}`}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {locations.map(location => (
                  <DropdownMenuCheckboxItem
                    key={location.id}
                    checked={selectedLocations.includes(location.name)}
                    onCheckedChange={() => toggleLocation(location.name)}
                  >
                    {location.name}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedLocations.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedLocations([])}>
                      <X className="w-4 h-4 mr-2" />
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  {sortLabels[sortBy]}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(Object.keys(sortLabels) as Array<typeof sortBy>).map(field => (
                  <DropdownMenuItem
                    key={field}
                    onClick={() => handleSort(field)}
                    className="gap-2"
                  >
                    {sortBy === field && (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )}
                    {sortBy !== field && <span className="w-4" />}
                    {sortLabels[field]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Selected location badges */}
            {selectedLocations.map(loc => (
              <Badge
                key={loc}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => toggleLocation(loc)}
              >
                {loc}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        </div>

        {/* Containers */}
        {isLoadingContainers ? (
          <p>Loading...</p>
        ) : filteredContainers.length > 0 ? (
          viewMode === 'cards' ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredContainers.map(container => (
                <ContainerCard
                  key={container.id}
                  container={container}
                  onClick={() => setSelectedContainer(container)}
                />
              ))}
            </div>
          ) : (
            <div className="container-card divide-y divide-border">
              {filteredContainers.map(container => {
                const colorValue = containerColors[container.color] || containerColors.blue;
                return (
                  <div
                    key={container.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedContainer(container)}
                  >
                    <div
                      className="w-3 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colorValue }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{container.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{container.readable_id}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {container.location}
                        </span>
                        <span className="truncate">{getContentExcerpt(container)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingContainer(container);
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">
              {searchQuery ? 'No matches found' : 'No containers yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? 'Try adjusting your search or filters'
                : 'Create your first container to get started'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => { setEditingContainer(null); setIsModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Container
              </Button>
            )}
          </div>
        )}
      </main>

      <Footer />

      <ContainerModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContainer(null);
          // Refresh selected container if we were editing it
          if (editingContainer && selectedContainer?.id === editingContainer.id) {
            setSelectedContainer(null);
          }
        }}
        container={editingContainer}
      />
    </div>
  );
};

export default Dashboard;
