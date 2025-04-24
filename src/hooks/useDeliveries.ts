
import { useState, useEffect } from 'react';
import { Delivery } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { deliveryService } from '@/services/DeliveryService';

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    return deliveryService.getDeliveriesFromStorage();
  });
  
  const { toast } = useToast();

  useEffect(() => {
    deliveryService.saveDeliveriesToStorage(deliveries);
  }, [deliveries]);

  const addDelivery = (newDelivery: Omit<Delivery, 'id'>, editingDelivery: Delivery | null) => {
    if (editingDelivery) {
      setDeliveries(prev =>
        prev.map(d => d.id === editingDelivery.id 
          ? deliveryService.addOrUpdateDelivery(newDelivery, editingDelivery) 
          : d
        )
      );
    } else {
      const deliveryWithId = deliveryService.addOrUpdateDelivery(newDelivery, null);
      setDeliveries(prev => [deliveryWithId, ...prev]);
    }
  };

  const deleteDelivery = (id: string) => {
    setDeliveries(prev => prev.filter(d => d.id !== id));
  };

  const clearDeliveries = () => {
    setDeliveries([]);
  };

  const importDeliveriesFromCSV = async (file: File) => {
    try {
      const newDeliveries = await deliveryService.importDeliveriesFromCSV(file);
      setDeliveries(prev => [...newDeliveries, ...prev]);
    } catch (error) {
      // Error is already handled in the service with toast
    }
  };

  const exportDeliveriesToCSV = () => {
    deliveryService.exportToCSV(deliveries);
  };

  return {
    deliveries,
    addDelivery,
    deleteDelivery,
    clearDeliveries,
    importDeliveriesFromCSV,
    exportDeliveriesToCSV
  };
};
