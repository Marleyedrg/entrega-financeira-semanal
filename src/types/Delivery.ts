
export interface Delivery {
  id: string;
  orderNumber: string;
  date: string;
  fee: number;
  isPending: boolean;
  imageUrl?: string;
}
