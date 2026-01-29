import { useState, useMemo } from 'react';
import { Plus, Package, Filter } from 'lucide-react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ContainerCard } from '@/components/ContainerCard';
import { ContainerDetail } from '@/components/ContainerDetail';
import { AddContainerModal } from '@/components/AddContainerModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockContainers } from '@/data/mockContainers';
import { Container } from '@/types/container';

const Dashboard = () => {
  const [containers, setContainers] = useState<Container[]>(mockContainers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Get unique locations
  const locations = useMemo(() => {
    return [...new Set(containers.map(c => c.location))];
  }, [containers]);

  // Filter containers
  const filteredContainers = useMemo(() => {
    return containers.filter(container => {
      // Location filter
      if (selectedLocation && container.location !== selectedLocation) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = container.name.toLowerCase().includes(query);
        const matchesLocation = container.location.toLowerCase().includes(query);
        const matchesShortId = container.shortId.toLowerCase().includes(query);
        const matchesItem = container.items.some(item => 
          item.name.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query)
        );
        return matchesName || matchesLocation || matchesShortId || matchesItem;
      }
      
      return true;
    });
  }, [containers, searchQuery, selectedLocation]);

  const handleAddContainer = (newContainer: Partial<Container>) => {
    const container: Container = {
      id: Math.random().toString(36).substr(2, 9),
      shortId: `${String(containers.length + 1).padStart(2, '0')}-${newContainer.location?.charAt(0) || 'A'}`,
      name: newContainer.name || '',
      location: newContainer.location || '',
      items: newContainer.items || [],
      isPasswordProtected: newContainer.isPasswordProtected || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      color: newContainer.color || 'teal',
    };
    setContainers([container, ...containers]);
  };

  if (selectedContainer) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <ContainerDetail
            container={selectedContainer}
            onBack={() => setSelectedContainer(null)}
            onEdit={() => {/* TODO: Open edit modal */}}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
              My Containers
            </h1>
            <p className="text-muted-foreground">
              {containers.length} containers · {containers.reduce((acc, c) => acc + c.items.length, 0)} items
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Container
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-8">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Badge 
              variant={selectedLocation === null ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setSelectedLocation(null)}
            >
              All Locations
            </Badge>
            {locations.map(location => (
              <Badge 
                key={location}
                variant={selectedLocation === location ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => setSelectedLocation(location)}
              >
                {location}
              </Badge>
            ))}
          </div>
        </div>

        {/* Containers Grid */}
        {filteredContainers.length > 0 ? (
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
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Container
              </Button>
            )}
          </div>
        )}
      </main>

      <AddContainerModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddContainer}
      />
    </div>
  );
};

export default Dashboard;
