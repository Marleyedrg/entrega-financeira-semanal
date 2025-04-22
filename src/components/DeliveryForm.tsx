
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Delivery } from '@/types/Delivery';

interface DeliveryFormProps {
  onSubmit: (delivery: Omit<Delivery, 'id'>) => void;
}

const DeliveryForm: React.FC<DeliveryFormProps> = ({ onSubmit }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [fee, setFee] = useState<string>('');
  const [image, setImage] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      date: new Date().toISOString(),
      orderNumber,
      fee: fee ? Number(fee) : null,
      isPending: !fee,
      imageUrl: image ? URL.createObjectURL(image) : undefined
    });

    // Reset form
    setOrderNumber('');
    setFee('');
    setImage(null);
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
      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
        Registrar Pedido
      </Button>
    </form>
  );
};

export default DeliveryForm;
