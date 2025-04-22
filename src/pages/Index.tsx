
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DeliveryForm from '@/components/DeliveryForm';
import DeliveryList from '@/components/DeliveryList';
import { Delivery } from '@/types/Delivery';

const Index = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('deliveries');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    localStorage.setItem('deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    setFilteredDeliveries(
      searchTerm
        ? deliveries.filter(d => d.orderNumber.includes(searchTerm))
        : deliveries
    );
  }, [searchTerm, deliveries]);

  const totalFees = deliveries.reduce((sum, delivery) => sum + delivery.fee, 0);

  const handleAddDelivery = (newDelivery: Omit<Delivery, 'id'>) => {
    const deliveryWithId = { ...newDelivery, id: uuidv4() };
    setDeliveries(prev => [...prev, deliveryWithId]);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Número do Pedido', 'Taxa', 'Status'];
    const csvContent = deliveries.map(d => [
      format(new Date(d.date), 'dd/MM/yyyy'),
      d.orderNumber,
      d.fee.toFixed(2),
      d.isPending ? 'Pendente' : 'Pago'
    ]);

    const csvString = [
      headers.join(','),
      ...csvContent.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entregas_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const handleFinishWeek = () => {
    handleExportCSV();
    setDeliveries([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
          <h1 className="text-2xl font-bold">Registro de Entregas</h1>
          <div className="text-xl font-semibold text-green-600">
            Total: R$ {totalFees.toFixed(2)}
          </div>
        </div>

        <DeliveryForm onSubmit={handleAddDelivery} />

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por número do pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={handleFinishWeek}
            className="bg-green-600 hover:bg-green-700"
          >
            Finalizar Semana
          </Button>
        </div>

        <DeliveryList deliveries={filteredDeliveries} />
      </div>
    </div>
  );
};

export default Index;
