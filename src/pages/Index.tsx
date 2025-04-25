
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import TabNavigation from '@/components/tabs/TabNavigation';
import TabContent from '@/components/tabs/TabContent';
import { useDeliveries } from '@/hooks/useDeliveries';
import { Delivery } from '@/types';

const Index = () => {
  const { deliveries, addDelivery, deleteDelivery, clearDeliveries, importDeliveriesFromCSV } = useDeliveries();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [activeTab, setActiveTab] = useState("registros");

  useEffect(() => {
    setFilteredDeliveries(
      searchTerm
        ? deliveries.filter(d => d.orderNumber.includes(searchTerm))
        : deliveries
    );
  }, [searchTerm, deliveries]);

  const totalFees = deliveries.reduce((sum, delivery) => sum + (delivery.fee || 0), 0);

  const handleAddDelivery = (newDelivery: Omit<Delivery, 'id'>) => {
    addDelivery(newDelivery, editingDelivery);
    setEditingDelivery(null);
  };

  const handleEditDelivery = (delivery: Delivery) => {
    setEditingDelivery(delivery);
  };

  return (
    <MainLayout title="Registro de Entregas" totalAmount={totalFees}>
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      <TabContent 
        deliveries={deliveries}
        filteredDeliveries={filteredDeliveries}
        editingDelivery={editingDelivery}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddDelivery={handleAddDelivery}
        onDeleteDelivery={deleteDelivery}
        onEditDelivery={handleEditDelivery}
        onCancelEdit={() => setEditingDelivery(null)}
        onImport={importDeliveriesFromCSV}
        onFinishWeek={clearDeliveries}
      />
    </MainLayout>
  );
};

export default Index;
