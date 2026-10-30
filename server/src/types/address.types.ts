export interface Address {
  id: number;
  recipientName: string;
  phone: string;
  provinceCode: number;
  province: string;
  wardCode: number;
  ward: string;
  detail: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
