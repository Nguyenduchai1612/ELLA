import { getApiMode } from "./config";
import { mockProductService } from "./mock/mockProductService";
import { realProductService } from "./real/realProductService";
import type { ProductService } from "./serviceTypes";

/**
 * Section 43: the ONLY place that decides mock vs real. Components and
 * pages import `productsApi` and never know which implementation backs it.
 */
export const productsApi: ProductService =
  getApiMode() === "real" ? realProductService : mockProductService;
