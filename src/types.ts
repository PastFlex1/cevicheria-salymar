export interface Category {
  id: string;
  name: string;
  description?: string;
  status: "activo" | "inactivo";
  order?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string; // Used as categoryName in product module
  image: string;
  available: number;
  sold: number;
  // new product fields
  categoryId?: string;
  cost?: number;
  aplicaIva?: boolean;
  status?: "activo" | "inactivo";
  stock?: number;
  stockMinimo?: number;
  recipe?: RecipeIngredient[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  observation?: string; // e.g. "sin cebolla"
}

export type OrderType = "mesa" | "llevar" | "delivery" | "rapido";

export type OrderStatus =
  | "pending" // legacy
  | "paid" // legacy / cobrado
  | "anulada"
  | "pendiente"
  | "en_preparacion"
  | "listo"
  | "entregado"
  | "por_cobrar"
  | "cobrado";

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  date: string;
  customerName?: string;
  tableNumber?: string;
  orderType?: OrderType;
  status: OrderStatus;
  documentType?: "nota" | "factura";
  clientId?: string;
  ruc?: string;
  businessName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  paymentMethod?: "Efectivo" | "Transferencia" | "Tarjeta" | "Crédito" | "Mixto" | "Otro";
  payments?: { method: string; amount: number }[];
  cashReceived?: number;
  changeReturned?: number;
  transactionNumber?: string;
  observation?: string;
  createdBy?: string;
  cancelReason?: string;
  relatedOrderId?: string;
  sriAuth?: {
    authDate: string;
    authNumber: string;
    estado: string;
  };
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category:
    | "Servicios"
    | "Arriendo"
    | "Nómina"
    | "Mantenimiento"
    | "Materia Prima"
    | "Otros";
  date: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  category: string;
  price?: number;
  unitCost?: number;
}

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export interface ComidaItem {
  id: string;
  name: string;
  category: string;
  ingredients: RecipeIngredient[];
  price?: number;
}

export interface ComboItem {
  id: string;
  name: string;
  category: string;
  items: RecipeIngredient[];
  price?: number;
}

export interface Provider {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  category: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  documentType: "Cédula" | "RUC" | "Pasaporte" | "Consumidor Final";
  documentNumber: string;
  phone?: string;
  email?: string;
  address?: string;
  status: "activo" | "inactivo";
  totalPurchases?: number;
  numberOfPurchases?: number;
  lastPurchaseDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}
