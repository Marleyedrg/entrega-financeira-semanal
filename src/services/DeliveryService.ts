
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Delivery } from '@/types';
import { toast } from '@/hooks/use-toast';

export class DeliveryService {
  private static instance: DeliveryService;
  
  private constructor() {}
  
  public static getInstance(): DeliveryService {
    if (!DeliveryService.instance) {
      DeliveryService.instance = new DeliveryService();
    }
    return DeliveryService.instance;
  }

  public getDeliveriesFromStorage(): Delivery[] {
    const saved = localStorage.getItem('deliveries');
    return saved ? JSON.parse(saved) : [];
  }
  
  public saveDeliveriesToStorage(deliveries: Delivery[]): void {
    localStorage.setItem('deliveries', JSON.stringify(deliveries));
  }
  
  public addOrUpdateDelivery(newDelivery: Omit<Delivery, 'id'>, editingDelivery: Delivery | null): Delivery {
    if (editingDelivery) {
      return { ...newDelivery, id: editingDelivery.id };
    } else {
      return { ...newDelivery, id: uuidv4() };
    }
  }
  
  public importDeliveriesFromCSV(file: File): Promise<Delivery[]> {
    return new Promise((resolve, reject) => {
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
          
          toast({
            title: "Importação concluída",
            description: `${newDeliveries.length} entregas importadas com sucesso.`,
          });
          
          resolve(newDeliveries);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Erro na importação",
            description: "Formato do arquivo inválido. Certifique-se de usar um arquivo CSV válido.",
          });
          reject(error);
        }
      };
      
      reader.readAsText(file);
    });
  }
  
  public generateExportFileName(deliveries: Delivery[]): string {
    const currentDate = new Date();
    const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const month = monthNames[currentDate.getMonth()];
    
    const dayOfMonth = currentDate.getDate();
    const weekNumber = Math.ceil(dayOfMonth / 7);

    const numberSeed = deliveries.reduce((acc, delivery) => {
      const value = delivery.orderNumber.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const feeValue = delivery.fee ? Math.floor(delivery.fee * 100) : 0;
      return acc + value + feeValue;
    }, 0);
    
    const fourDigitNumber = (numberSeed % 9000 + 1000).toString();
    
    return `${month}semana${weekNumber}_${fourDigitNumber}`;
  }
  
  public generateCSVContent(deliveries: Delivery[]): string {
    const headers = ['Data', 'Número do Pedido', 'Taxa', 'Status'];
    const csvContent = deliveries.map(d => [
      format(new Date(d.date), 'dd/MM/yyyy'),
      d.orderNumber,
      d.fee?.toFixed(2) || '-',
      d.isPending ? 'Taxa Pendente' : 'Taxa Registrada'
    ]);

    return [
      headers.join(','),
      ...csvContent.map(row => row.join(','))
    ].join('\n');
  }
  
  public exportToCSV(deliveries: Delivery[]): void {
    const csvString = this.generateCSVContent(deliveries);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.generateExportFileName(deliveries)}.csv`;
    link.click();
  }
}

export const deliveryService = DeliveryService.getInstance();
