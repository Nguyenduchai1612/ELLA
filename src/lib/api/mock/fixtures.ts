import type { Product, Category, ProductType, ProductStyle, Cart, Address } from "@/types";

const necklaceType: ProductType = {
  productTypeId: "pt-necklace",
  name: "Necklace",
  slug: "necklace",
};

const sunglassesType: ProductType = {
  productTypeId: "pt-sunglasses",
  name: "Sunglasses",
  slug: "sunglasses",
};

const fourLeafStyle: ProductStyle = {
  productStyleId: "ps-four-leaf-clover",
  name: "Four Leaf Clover",
  slug: "four-leaf-clover",
};

const newArrivalsCategory: Category = {
  categoryId: "cat-new-arrivals",
  name: "New Arrivals",
  slug: "new-arrivals",
};

const jewelryCategory: Category = {
  categoryId: "cat-jewelry",
  name: "Jewelry",
  slug: "jewelry",
};

const eyewearCategory: Category = {
  categoryId: "cat-eyewear",
  name: "Eyewear",
  slug: "eyewear",
};

/** The exact worked example from the master spec (Section 2, Section 4). */
export const MOCK_PRODUCTS: Product[] = [
  {
    productId: "prod-eac-05",
    slug: "vong-co-co-4-la",
    name: "Vòng cổ cỏ 4 lá",
    description:
      "Vòng cổ mặt cỏ bốn lá tinh tế, chất liệu bạc/mạ vàng cao cấp, phù hợp đeo hằng ngày hoặc làm quà tặng.",
    brand: "ELLA",
    status: "ACTIVE",
    categories: [jewelryCategory, newArrivalsCategory],
    productType: necklaceType,
    productStyle: fourLeafStyle,
    images: [
      {
        imageId: "img-eac-05-common-1",
        url: "https://images.example.com/ella/eac-05/common-1.jpg",
        alt: "Vòng cổ cỏ 4 lá - ảnh chung",
        sortOrder: 0,
      },
    ],
    variants: [
      {
        skuId: "sku-eac-0510",
        sku: "EAC-0510",
        variantName: "Bạc 4 lá trắng",
        listPrice: 199000,
        salePrice: 89000,
        available: 12,
        images: [
          {
            imageId: "img-eac-0510-1",
            url: "https://images.example.com/ella/eac-0510/1.jpg",
            alt: "Vòng cổ cỏ 4 lá - Bạc 4 lá trắng",
            sortOrder: 0,
          },
        ],
      },
      {
        skuId: "sku-eac-0514",
        sku: "EAC-0514",
        variantName: "Vàng 4 lá đen",
        listPrice: 199000,
        salePrice: 99000,
        available: 0,
        // No SKU-specific images -> UI must fall back to Product common images (Section 5).
        images: [],
      },
    ],
    seo: {
      title: "Vòng cổ cỏ 4 lá | ELLA",
      metaDescription: "Vòng cổ mặt cỏ bốn lá — ELLA jewelry.",
    },
  },
  {
    productId: "prod-eyw-01",
    slug: "kinh-mat-cat-eye-vintage",
    name: "Kính mát Cat Eye Vintage",
    description: "Kính mát gọng cat eye phong cách vintage, tròng chống UV400.",
    brand: "ELLA",
    status: "ACTIVE",
    categories: [eyewearCategory],
    productType: sunglassesType,
    productStyle: { productStyleId: "ps-cat-eye", name: "Cat Eye", slug: "cat-eye" },
    images: [
      {
        imageId: "img-eyw-01-common-1",
        url: "https://images.example.com/ella/eyw-01/common-1.jpg",
        alt: "Kính mát Cat Eye Vintage - ảnh chung",
        sortOrder: 0,
      },
    ],
    variants: [
      {
        skuId: "sku-eyw-0101",
        sku: "EYW-0101",
        variantName: "Đen bóng",
        listPrice: 349000,
        salePrice: 249000,
        available: 5,
        images: [],
      },
    ],
  },
];

export const MOCK_EMPTY_CART: Cart = {
  cartId: "cart-guest-mock",
  items: [],
  subtotal: 0,
  discount: 0,
  shippingFee: 0,
  total: 0,
};

export const MOCK_ADDRESS: Address = {
  addressId: "addr-mock-1",
  fullName: "Nguyễn Thị A",
  phone: "0900000000",
  province: "TP. Hồ Chí Minh",
  district: "Quận 1",
  ward: "Phường Bến Nghé",
  addressLine: "123 Đường Đồng Khởi",
  isDefault: true,
};
