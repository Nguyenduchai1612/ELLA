import { getApiMode } from "./config";
import { mockOrdersService } from "./mock/mockOrdersService";
import { realOrdersService } from "./real/realOrdersService";
import type { OrdersService } from "./serviceTypes";

export const ordersApi: OrdersService =
  getApiMode() === "real" ? realOrdersService : mockOrdersService;
