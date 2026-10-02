// Client-side cart state. Runs only in the browser (imported from <script>
// tags in CartDrawer.astro / ProductForm islands) — the cart itself lives in
// Shopify (Storefront API `Cart` object), this module just tracks which cart
// ID belongs to this browser and broadcasts updates so the header badge and
// the drawer stay in sync without a framework.
import { cartCreate, cartGet, cartLinesAdd, cartLinesRemove, cartLinesUpdate, type ShopifyCart } from "./shopify";

const STORAGE_KEY = "chai-wallahs-cart-id";

function getStoredCartId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredCartId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private browsing / storage disabled — cart just won't persist across reloads.
  }
}

function broadcast(cart: ShopifyCart | null) {
  window.dispatchEvent(new CustomEvent<ShopifyCart | null>("cart:updated", { detail: cart }));
}

let current: ShopifyCart | null = null;

export async function loadCart(): Promise<ShopifyCart | null> {
  const id = getStoredCartId();
  if (!id) {
    broadcast(null);
    return null;
  }
  // A cart can age out on Shopify's side (abandoned carts expire) — treat a
  // missing cart the same as no cart rather than surfacing an error.
  current = await cartGet(id).catch(() => null);
  broadcast(current);
  return current;
}

export function getCurrentCart(): ShopifyCart | null {
  return current;
}

export async function addToCart(merchandiseId: string, quantity = 1): Promise<ShopifyCart> {
  const id = getStoredCartId();
  current = id ? await cartLinesAdd(id, merchandiseId, quantity) : await cartCreate(merchandiseId, quantity);
  setStoredCartId(current.id);
  broadcast(current);
  return current;
}

export async function updateLineQuantity(lineId: string, quantity: number): Promise<ShopifyCart> {
  const id = getStoredCartId();
  if (!id) throw new Error("No cart to update");
  current = quantity > 0 ? await cartLinesUpdate(id, lineId, quantity) : await cartLinesRemove(id, lineId);
  broadcast(current);
  return current;
}

export async function removeLine(lineId: string): Promise<ShopifyCart> {
  const id = getStoredCartId();
  if (!id) throw new Error("No cart to update");
  current = await cartLinesRemove(id, lineId);
  broadcast(current);
  return current;
}
