import { MenuItem, InventoryItem, ComidaItem, ComboItem } from "./types";

export const MENU_ITEMS: MenuItem[] = [];

export const CATEGORIES = [
  "Todos",
  "Ceviches",
  "Platos Fuertes",
  "Extras",
  "Bebidas",
] as const;

export const INVENTORY_ITEMS: InventoryItem[] = [];

export const INVENTORY_COMIDAS: ComidaItem[] = [];

export const INVENTORY_BEBIDAS: InventoryItem[] = [];

export const INVENTORY_COMBOS: ComboItem[] = [];

export const PROVIDERS: import("./types").Provider[] = [];
