
export interface Delivery {
  id: string;
  orderNumber: string;
  date: string;
  fee: number | null;
  isPending: boolean;  // true when fee is not set yet
  imageUrl?: string;
}
