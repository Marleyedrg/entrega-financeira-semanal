
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Delivery } from '@/types/Delivery';
import { useToast } from "@/components/ui/use-toast";

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('deliveries');
    return saved ? JSON.parse(saved) : [];
  });
  
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  const addDelivery = (newDelivery: Omit<Delivery, 'id'>, editingDelivery: Delivery | null) => {
    if (editingDelivery) {
      setDeliveries(prev =>
        prev.map(d => d.id === editingDelivery.id 
          ? { ...newDelivery, id: editingDelivery.id } 
          : d
        )
      );
    } else {
      const deliveryWithId = { ...newDelivery, id: uuidv4() };
      setDeliveries(prev => [deliveryWithId, ...prev]);
    }
  };

  const deleteDelivery = (id: string) => {
    setDeliveries(prev => prev.filter(d => d.id !== id));
  };

  const clearDeliveries = () => {
    setDeliveries([]);
  };

  const importDeliveriesFromCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        const newDeliveries = lines.slice(1).map((line) => {
          if (!line.trim()) return null;
          
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

  return {
    deliveries,
    addDelivery,
    deleteDelivery,
    clearDeliveries,
    importDeliveriesFromCSV
  };
};
