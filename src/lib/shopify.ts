// Shopify Storefront API client. Used both at build time (product listing —
// see src/pages/shop/) and in the browser (cart — see src/lib/cart.ts),
// which is why it only touches import.meta.env.PUBLIC_* vars: those are the
// ones Astro inlines into client bundles, so the same client works in both
// places without a separate server-only config.
const STORE_DOMAIN = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = "2025-01";

export class ShopifyNotConfiguredError extends Error {
  constructor() {
    super(
      "Shopify isn't configured yet — set PUBLIC_SHOPIFY_STORE_DOMAIN and PUBLIC_SHOPIFY_STOREFRONT_TOKEN (see .env.example).",
    );
    this.name = "ShopifyNotConfiguredError";
  }
}

export function isShopifyConfigured(): boolean {
  return Boolean(STORE_DOMAIN && STOREFRONT_TOKEN);
}

export async function shopifyFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!isShopifyConfigured()) throw new ShopifyNotConfiguredError();

  const res = await fetch(`https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Shopify Storefront API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify Storefront API error: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable: number | null;
  price: ShopifyMoney;
  selectedOptions: { name: string; value: string }[];
  image: ShopifyImage | null;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  tags: string[];
  priceRange: { minVariantPrice: ShopifyMoney };
  featuredImage: ShopifyImage | null;
  images: ShopifyImage[];
  options: { name: string; values: string[] }[];
  variants: ShopifyVariant[];
}

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    availableForSale
    tags
    priceRange {
      minVariantPrice { amount currencyCode }
    }
    featuredImage { url altText width height }
    images(first: 10) {
      nodes { url altText width height }
    }
    options {
      name
      values
    }
    variants(first: 100) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable
        price { amount currencyCode }
        selectedOptions { name value }
        image { url altText width height }
      }
    }
  }
`;

function normalizeProduct(raw: any): ShopifyProduct {
  return {
    ...raw,
    images: raw.images.nodes,
    variants: raw.variants.nodes,
  };
}

export async function getAllProducts(): Promise<ShopifyProduct[]> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query AllProducts {
      products(first: 100, sortKey: TITLE) {
        nodes { ...ProductFields }
      }
    }
  `;
  const data = await shopifyFetch<{ products: { nodes: any[] } }>(query);
  return data.products.nodes.map(normalizeProduct);
}

export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query ProductByHandle($handle: String!) {
      product(handle: $handle) { ...ProductFields }
    }
  `;
  const data = await shopifyFetch<{ product: any | null }>(query, { handle });
  return data.product ? normalizeProduct(data.product) : null;
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    image: ShopifyImage | null;
    price: ShopifyMoney;
    product: { title: string; handle: string };
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { totalAmount: ShopifyMoney; subtotalAmount: ShopifyMoney };
  lines: ShopifyCartLine[];
}

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      totalAmount { amount currencyCode }
      subtotalAmount { amount currencyCode }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            image { url altText width height }
            price { amount currencyCode }
            product { title handle }
          }
        }
      }
    }
  }
`;

function normalizeCart(raw: any): ShopifyCart {
  return { ...raw, lines: raw.lines.nodes };
}

export async function cartCreate(merchandiseId: string, quantity = 1): Promise<ShopifyCart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart { ...CartFields }
        userErrors { message }
      }
    }
  `;
  const data = await shopifyFetch<{ cartCreate: { cart: any; userErrors: { message: string }[] } }>(query, {
    lines: [{ merchandiseId, quantity }],
  });
  if (data.cartCreate.userErrors.length) throw new Error(data.cartCreate.userErrors[0].message);
  return normalizeCart(data.cartCreate.cart);
}

export async function cartGet(cartId: string): Promise<ShopifyCart | null> {
  const query = `
    ${CART_FRAGMENT}
    query CartGet($cartId: ID!) {
      cart(id: $cartId) { ...CartFields }
    }
  `;
  const data = await shopifyFetch<{ cart: any | null }>(query, { cartId });
  return data.cart ? normalizeCart(data.cart) : null;
}

export async function cartLinesAdd(cartId: string, merchandiseId: string, quantity = 1): Promise<ShopifyCart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { message }
      }
    }
  `;
  const data = await shopifyFetch<{ cartLinesAdd: { cart: any; userErrors: { message: string }[] } }>(query, {
    cartId,
    lines: [{ merchandiseId, quantity }],
  });
  if (data.cartLinesAdd.userErrors.length) throw new Error(data.cartLinesAdd.userErrors[0].message);
  return normalizeCart(data.cartLinesAdd.cart);
}

export async function cartLinesUpdate(cartId: string, lineId: string, quantity: number): Promise<ShopifyCart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { message }
      }
    }
  `;
  const data = await shopifyFetch<{ cartLinesUpdate: { cart: any; userErrors: { message: string }[] } }>(query, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
  if (data.cartLinesUpdate.userErrors.length) throw new Error(data.cartLinesUpdate.userErrors[0].message);
  return normalizeCart(data.cartLinesUpdate.cart);
}

export async function cartLinesRemove(cartId: string, lineId: string): Promise<ShopifyCart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { message }
      }
    }
  `;
  const data = await shopifyFetch<{ cartLinesRemove: { cart: any; userErrors: { message: string }[] } }>(query, {
    cartId,
    lineIds: [lineId],
  });
  if (data.cartLinesRemove.userErrors.length) throw new Error(data.cartLinesRemove.userErrors[0].message);
  return normalizeCart(data.cartLinesRemove.cart);
}
