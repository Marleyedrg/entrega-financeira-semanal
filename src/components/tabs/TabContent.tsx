
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import DeliveryForm from '@/components/DeliveryForm';
import DeliveryList from '@/components/DeliveryList';
import DeliveryAnalytics from '@/components/DeliveryAnalytics';
import SearchDeliveries from '@/components/SearchDeliveries';
import FileOperations from '@/components/FileOperations';
import { Delivery } from '@/types/Delivery';

interface TabContentProps {
  deliveries: Delivery[];
  filteredDeliveries: Delivery[];
  editingDelivery: Delivery | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAddDelivery: (newDelivery: Omit<Delivery, 'id'>) => void;
  onDeleteDelivery: (id: string) => void;
  onEditDelivery: (delivery: Delivery) => void;
  onCancelEdit: () => void;
  onImport: (file: File) => void;
  onFinishWeek: () => void;
}

const TabContent = ({
  deliveries,
  filteredDeliveries,
  editingDelivery,
  searchTerm,
  onSearchChange,
  onAddDelivery,
  onDeleteDelivery,
  onEditDelivery,
  onCancelEdit,
  onImport,
  onFinishWeek,
}: TabContentProps) => {
  return (
    <>
      <TabsContent value="registros" className="space-y-6">
        <DeliveryForm 
          onSubmit={onAddDelivery} 
          editingDelivery={editingDelivery}
          onCancelEdit={onCancelEdit}
        />

        <div className="flex gap-4 flex-col md:flex-row">
          <SearchDeliveries 
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
          />
          <FileOperations 
            deliveries={deliveries}
            onImport={onImport}
            onFinishWeek={onFinishWeek}
          />
        </div>

        <DeliveryList 
          deliveries={filteredDeliveries}
          onDelete={onDeleteDelivery}
          onEdit={onEditDelivery}
        />
      </TabsContent>
      
      <TabsContent value="analise" className="bg-white rounded-lg shadow p-4">
        <DeliveryAnalytics deliveries={deliveries} />
      </TabsContent>
    </>
  );
};

export default TabContent;
