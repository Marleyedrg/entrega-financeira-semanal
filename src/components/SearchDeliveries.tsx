
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";

interface SearchDeliveriesProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const SearchDeliveries = ({ searchTerm, onSearchChange }: SearchDeliveriesProps) => {
  return (
    <div className="flex-1 relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
      <Input
        className="pl-9"
        placeholder="Buscar por número do pedido..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
};

export default SearchDeliveries;
