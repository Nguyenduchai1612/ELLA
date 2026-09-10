import { getApiMode } from "./config";
import { mockCustomersService } from "./mock/mockCustomersService";
import { realCustomersService } from "./real/realCustomersService";
import type { CustomersService } from "./serviceTypes";

export const customersApi: CustomersService =
  getApiMode() === "real" ? realCustomersService : mockCustomersService;
