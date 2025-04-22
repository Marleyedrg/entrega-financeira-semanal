
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Delivery } from '@/types/Delivery';

interface DeliveryFormProps {
  onSubmit: (delivery: Omit<Delivery, 'id'>) => void;
}

const DeliveryForm: React.FC<DeliveryFormProps> = ({ onSubmit }) => {
  const [date, setDate] = useState<Date>(new Date());
  const [orderNumber, setOrderNumber] = useState('');
  const [fee, setFee] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [image, setImage] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const imageUrl = image ? URL.createObjectURL(image) : undefined;
    
    onSubmit({
      date: date.toISOString(),
      orderNumber,
      fee: parseFloat(fee),
      isPending,
      imageUrl
    });

    setOrderNumber('');
    setFee('');
    setIsPending(false);
    setImage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data do Pedido</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Número do Pedido</Label>
          <Input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Valor da Taxa</Label>
          <Input
            type="number"
            step="0.01"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Anexar Foto</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={isPending}
            onCheckedChange={setIsPending}
          />
          <Label>Taxa Pendente</Label>
        </div>
      </div>

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
        Registrar Entrega
      </Button>
    </form>
  );
};

export default DeliveryForm;
