import { getApiMode } from "./config";
import { mockCartService } from "./mock/mockCartService";
import { realCartService } from "./real/realCartService";
import type { CartService } from "./serviceTypes";

export const cartApi: CartService = getApiMode() === "real" ? realCartService : mockCartService;
