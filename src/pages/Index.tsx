
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);

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

  const totalFees = deliveries.reduce((sum, delivery) => sum + (delivery.fee || 0), 0);

  const handleAddDelivery = (newDelivery: Omit<Delivery, 'id'>) => {
    if (editingDelivery) {
      // Update existing delivery
      setDeliveries(prev =>
        prev.map(d => d.id === editingDelivery.id 
          ? { ...newDelivery, id: editingDelivery.id } 
          : d
        )
      );
      setEditingDelivery(null);
    } else {
      // Add new delivery
      const deliveryWithId = { ...newDelivery, id: uuidv4() };
      setDeliveries(prev => [deliveryWithId, ...prev]);
    }
  };

  const handleEditDelivery = (delivery: Delivery) => {
    setEditingDelivery(delivery);
  };

  const handleCancelEdit = () => {
    setEditingDelivery(null);
  };

  const handleDeleteDelivery = (id: string) => {
    setDeliveries(prev => prev.filter(d => d.id !== id));
  };

  const generateFileName = () => {
    const currentDate = new Date();
    const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const month = monthNames[currentDate.getMonth()];
    
    // Calculate week number (1-4) within the month
    const dayOfMonth = currentDate.getDate();
    const weekNumber = Math.ceil(dayOfMonth / 7);
    
    // Generate random 3-digit ID
    const randomId = Math.floor(Math.random() * 900) + 100;
    
    return `${month}semana${weekNumber}_${randomId}`;
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Número do Pedido', 'Taxa', 'Status'];
    const csvContent = deliveries.map(d => [
      format(new Date(d.date), 'dd/MM/yyyy'),
      d.orderNumber,
      d.fee?.toFixed(2) || '-',
      d.isPending ? 'Taxa Pendente' : 'Taxa Registrada'
    ]);

    const csvString = [
      headers.join(','),
      ...csvContent.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${generateFileName()}.csv`;
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

        <DeliveryForm 
          onSubmit={handleAddDelivery} 
          editingDelivery={editingDelivery}
          onCancelEdit={handleCancelEdit}
        />

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

        <DeliveryList 
          deliveries={filteredDeliveries}
          onDelete={handleDeleteDelivery}
          onEdit={handleEditDelivery}
        />
      </div>
    </div>
  );
};

export default Index;
