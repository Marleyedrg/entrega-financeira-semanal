
import React from 'react';
import { format } from 'date-fns';
import { Delivery } from '@/types/Delivery';
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DeliveryListProps {
  deliveries: Delivery[];
}

const DeliveryList: React.FC<DeliveryListProps> = ({ deliveries }) => {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Nº Pedido</TableHead>
            <TableHead>Taxa (R$)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Foto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell>{format(new Date(delivery.date), 'dd/MM/yyyy')}</TableCell>
              <TableCell>{delivery.orderNumber}</TableCell>
              <TableCell>{delivery.fee.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={delivery.isPending ? "destructive" : "default"}>
                  {delivery.isPending ? 'Pendente' : 'Pago'}
                </Badge>
              </TableCell>
              <TableCell>
                {delivery.imageUrl && (
                  <img
                    src={delivery.imageUrl}
                    alt="Comprovante"
                    className="w-10 h-10 object-cover rounded"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DeliveryList;
