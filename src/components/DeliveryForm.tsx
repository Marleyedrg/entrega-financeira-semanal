
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Delivery } from '@/types/Delivery';

interface DeliveryFormProps {
  onSubmit: (delivery: Omit<Delivery, 'id'>) => void;
  editingDelivery: Delivery | null;
  onCancelEdit: () => void;
}

const DeliveryForm: React.FC<DeliveryFormProps> = ({ 
  onSubmit, 
  editingDelivery, 
  onCancelEdit 
}) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [fee, setFee] = useState<string>('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  // Update form when editing a delivery
  useEffect(() => {
    if (editingDelivery) {
      setOrderNumber(editingDelivery.orderNumber);
      setFee(editingDelivery.fee ? String(editingDelivery.fee) : '');
      setImageUrl(editingDelivery.imageUrl);
    } else {
      resetForm();
    }
  }, [editingDelivery]);

  const resetForm = () => {
    setOrderNumber('');
    setFee('');
    setImage(null);
    setImageUrl(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newDelivery = {
      date: editingDelivery ? editingDelivery.date : new Date().toISOString(),
      orderNumber,
      fee: fee ? Number(fee) : null,
      isPending: !fee,
      imageUrl: image ? URL.createObjectURL(image) : imageUrl
    };
    
    onSubmit(newDelivery);
    resetForm();
    
    if (e.target instanceof HTMLFormElement) {
      e.target.reset();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="Número do Pedido"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          required
          autoFocus
        />
        <Input
          type="number"
          step="0.01"
          placeholder="Taxa de Entrega (opcional)"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
          {editingDelivery ? 'Atualizar Pedido' : 'Registrar Pedido'}
        </Button>
        {editingDelivery && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancelEdit}
            className="flex-1"
          >
            Cancelar Edição
          </Button>
        )}
      </div>
    </form>
  );
};

export default DeliveryForm;
