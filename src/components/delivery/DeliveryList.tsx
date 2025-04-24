
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Delivery } from '@/types';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ZoomIn } from 'lucide-react';
import ImageViewer from '../ui/ImageViewer';
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
  onDelete: (id: string) => void;
  onEdit: (delivery: Delivery) => void;
}

const DeliveryList: React.FC<DeliveryListProps> = ({ deliveries, onDelete, onEdit }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell>{format(new Date(delivery.date), 'dd/MM/yyyy')}</TableCell>
              <TableCell>{delivery.orderNumber}</TableCell>
              <TableCell>{delivery.fee?.toFixed(2) || '-'}</TableCell>
              <TableCell>
                <Badge variant={delivery.isPending ? "destructive" : "default"}>
                  {delivery.isPending ? 'Taxa Pendente' : 'Taxa Registrada'}
                </Badge>
              </TableCell>
              <TableCell>
                {delivery.imageUrl && (
                  <div className="relative group">
                    <img
                      src={delivery.imageUrl}
                      alt="Comprovante"
                      className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(delivery.imageUrl)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedImage(delivery.imageUrl)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(delivery)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(delivery.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedImage && (
        <ImageViewer
          imageUrl={selectedImage}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

export default DeliveryList;
