import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productsApi, reviewsApi, isApiError } from "@/lib/api";
import { ProductDetailView } from "@/components/product/ProductDetailView";

interface ProductPageProps {
  params: { slug: string };
}

async function loadProduct(slug: string) {
  try {
    return await productsApi.getProductBySlug(slug);
  } catch (err) {
    if (isApiError(err) && err.code === "PRODUCT_NOT_FOUND") {
      return null;
    }
    throw err;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await loadProduct(params.slug);
  if (!product) return {};

  return {
    title: product.seo?.title ?? product.name,
    description: product.seo?.metaDescription ?? product.description.slice(0, 160),
    alternates: product.seo?.canonicalUrl ? { canonical: product.seo.canonicalUrl } : undefined,
    openGraph: {
      title: product.seo?.title ?? product.name,
      description: product.seo?.metaDescription ?? product.description.slice(0, 160),
      images: product.seo?.ogImageUrl
        ? [product.seo.ogImageUrl]
        : product.images[0]
          ? [product.images[0].url]
          : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await loadProduct(params.slug);
  if (!product) {
    notFound();
  }

  const reviews = await reviewsApi.listReviewsForProduct(product.productId).catch(() => []);

  return <ProductDetailView product={product} reviews={reviews} />;
}
