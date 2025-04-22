
import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Delivery } from '@/types/Delivery';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [date, setDate] = useState<Date | undefined>(new Date());
  const isMobile = useIsMobile();

  // Update form when editing a delivery
  useEffect(() => {
    if (editingDelivery) {
      setOrderNumber(editingDelivery.orderNumber);
      setFee(editingDelivery.fee ? String(editingDelivery.fee) : '');
      setImageUrl(editingDelivery.imageUrl);
      setDate(new Date(editingDelivery.date));
    } else {
      resetForm();
    }
  }, [editingDelivery]);

  const resetForm = () => {
    setOrderNumber('');
    setFee('');
    setImage(null);
    setImageUrl(undefined);
    setDate(new Date());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newDelivery = {
      date: date ? date.toISOString() : new Date().toISOString(),
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
      <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-3'} gap-4`}>
        <Input
          placeholder="Número do Pedido"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          required
          autoFocus
          className="text-base md:text-sm"
        />
        <Input
          type="number"
          step="0.01"
          placeholder="Taxa de Entrega (opcional)"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="text-base md:text-sm"
        />
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          className="text-base md:text-sm"
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal text-base md:text-sm",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Selecione a data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
        <Button 
          type="submit" 
          className={`${isMobile ? 'text-base' : 'text-sm'} bg-green-600 hover:bg-green-700 ${isMobile ? 'w-full' : 'flex-1'}`}
        >
          {editingDelivery ? 'Atualizar Pedido' : 'Registrar Pedido'}
        </Button>
        {editingDelivery && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancelEdit}
            className={`${isMobile ? 'text-base' : 'text-sm'} ${isMobile ? 'w-full' : 'flex-1'}`}
          >
            Cancelar Edição
          </Button>
        )}
      </div>
    </form>
  );
};

export default DeliveryForm;
