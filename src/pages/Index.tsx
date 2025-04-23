import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search, Import } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
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

  const { toast } = useToast();

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

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // Skip header row and process data
        const newDeliveries = lines.slice(1).map((line) => {
          if (!line.trim()) return null; // Skip empty lines
          
          const [date, orderNumber, fee, status] = line.split(',');
          
          return {
            id: uuidv4(),
            date: format(new Date(date.split('/').reverse().join('-')), 'yyyy-MM-dd'),
            orderNumber: orderNumber.trim(),
            fee: fee.trim() !== '-' ? parseFloat(fee) : null,
            isPending: status.trim() === 'Taxa Pendente',
          };
        }).filter((delivery): delivery is Delivery => delivery !== null);

        setDeliveries(prev => [...newDeliveries, ...prev]);
        toast({
          title: "Importação concluída",
          description: `${newDeliveries.length} entregas importadas com sucesso.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro na importação",
          description: "Formato do arquivo inválido. Certifique-se de usar um arquivo CSV válido.",
        });
      }
    };

    reader.readAsText(file);
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById('csvInput')?.click()}
              className="flex items-center gap-2"
            >
              <Import className="h-4 w-4" />
              Importar CSV
            </Button>
            <input
              id="csvInput"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
            <Button
              onClick={handleFinishWeek}
              className="bg-green-600 hover:bg-green-700"
            >
              Finalizar Semana
            </Button>
          </div>
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
