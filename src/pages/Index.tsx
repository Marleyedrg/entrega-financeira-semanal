
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryForm from '@/components/DeliveryForm';
import DeliveryList from '@/components/DeliveryList';
import DeliveryAnalytics from '@/components/DeliveryAnalytics';
import SearchDeliveries from '@/components/SearchDeliveries';
import FileOperations from '@/components/FileOperations';
import { useDeliveries } from '@/hooks/useDeliveries';
import { Delivery } from '@/types/Delivery';

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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
          <h1 className="text-2xl font-bold">Registro de Entregas</h1>
          <div className="text-xl font-semibold text-green-600">
            Total: R$ {totalFees.toFixed(2)}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-white border border-gray-200 p-1">
            <TabsTrigger value="registros" className="flex-1">Registros de Entregas</TabsTrigger>
            <TabsTrigger value="analise" className="flex-1">Análise de Dados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="registros" className="space-y-6">
            <DeliveryForm 
              onSubmit={handleAddDelivery} 
              editingDelivery={editingDelivery}
              onCancelEdit={() => setEditingDelivery(null)}
            />

            <div className="flex gap-4 flex-col md:flex-row">
              <SearchDeliveries 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
              <FileOperations 
                deliveries={deliveries}
                onImport={importDeliveriesFromCSV}
                onFinishWeek={clearDeliveries}
              />
            </div>

            <DeliveryList 
              deliveries={filteredDeliveries}
              onDelete={deleteDelivery}
              onEdit={handleEditDelivery}
            />
          </TabsContent>
          
          <TabsContent value="analise" className="bg-white rounded-lg shadow p-4">
            <DeliveryAnalytics deliveries={deliveries} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
