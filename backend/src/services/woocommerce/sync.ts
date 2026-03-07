/**
 * WooCommerce Sync Service
 * Ingests products and orders with pagination and retry.
 */
import { prisma } from "../../db/client.js";
import { logger } from "../../logger/index.js";
import type { StoreIntegration } from "@prisma/client";

const PAGE_SIZE   = 100;
const RETRY_LIMIT = 4;

async function wcFetch(
  store: StoreIntegration,
  path: string,
  params: Record<string, string | number> = {}
): Promise<any[]> {
  const base = store.storeUrl.replace(/\/$/, "");
  const url  = new URL(`${base}/wp-json/wc/v3/${path}`);

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const headers = {
    Authorization:
      "Basic " +
      Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString("base64"),
    "Content-Type": "application/json",
  };

  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        throw new Error(`WC API ${res.status}: ${await res.text()}`);
      }
      return res.json();
    } catch (err: any) {
      attempt++;
      if (attempt >= RETRY_LIMIT) throw err;
      const delay = 1_000 * Math.pow(2, attempt - 1);
      logger.warn({ attempt, delay }, "WooCommerce fetch failed — retrying");
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncProducts(store: StoreIntegration): Promise<number> {
  let page = 1;
  let total = 0;

  while (true) {
    const products = await wcFetch(store, "products", {
      per_page: PAGE_SIZE,
      page,
      status:   "publish",
    });
    if (!products.length) break;

    for (const p of products) {
      await prisma.product.upsert({
        where:  { storeId_externalId: { storeId: store.id, externalId: String(p.id) } },
        create: {
          storeId:      store.id,
          externalId:   String(p.id),
          sku:          p.sku || null,
          name:         p.name,
          description:  p.description?.replace(/<[^>]+>/g, "") || null,
          price:        parseFloat(p.price) || 0,
          salePrice:    p.sale_price ? parseFloat(p.sale_price) : null,
          category:     p.categories?.[0]?.name || null,
          tags:         p.tags?.map((t: any) => t.name) ?? [],
          imageUrl:     p.images?.[0]?.src || null,
          isActive:     p.status === "publish",
          stock:        p.stock_quantity ?? null,
        },
        update: {
          name:      p.name,
          price:     parseFloat(p.price) || 0,
          salePrice: p.sale_price ? parseFloat(p.sale_price) : null,
          isActive:  p.status === "publish",
          stock:     p.stock_quantity ?? null,
        },
      });
      total++;
    }

    if (products.length < PAGE_SIZE) break;
    page++;
  }
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncOrders(
  store: StoreIntegration,
  afterDate?: string   // ISO date string
): Promise<number> {
  let page = 1;
  let total = 0;

  while (true) {
    const params: Record<string, string | number> = {
      per_page: PAGE_SIZE,
      page,
      orderby:  "date",
      order:    "asc",
    };
    if (afterDate) params.after = afterDate;

    const orders = await wcFetch(store, "orders", params);
    if (!orders.length) break;

    for (const o of orders) {
      const orderData = {
        storeId:     store.id,
        externalId:  String(o.id),
        status:      mapOrderStatus(o.status),
        total:       parseFloat(o.total) || 0,
        subtotal:    parseFloat(o.subtotal) || 0,
        shipping:    parseFloat(o.shipping_total) || 0,
        tax:         parseFloat(o.total_tax) || 0,
        discount:    parseFloat(o.discount_total) || 0,
        refundTotal: 0,
        currency:    o.currency || "ILS",
        source:      o.meta_data?.find((m: any) => m.key === "_utm_source")?.value || null,
        medium:      o.meta_data?.find((m: any) => m.key === "_utm_medium")?.value || null,
        campaign:    o.meta_data?.find((m: any) => m.key === "_utm_campaign")?.value || null,
        gclid:       o.meta_data?.find((m: any) => m.key === "_gclid")?.value || null,
        fbclid:      o.meta_data?.find((m: any) => m.key === "_fbclid")?.value || null,
        orderedAt:   new Date(o.date_created),
      };

      const order = await prisma.order.upsert({
        where:  { storeId_externalId: { storeId: store.id, externalId: String(o.id) } },
        create: orderData,
        update: { status: orderData.status, refundTotal: orderData.refundTotal },
      });

      // Upsert line items
      for (const item of o.line_items ?? []) {
        const product = await prisma.product.findFirst({
          where: { storeId: store.id, externalId: String(item.product_id) },
        });
        if (!product) continue;

        await prisma.orderItem.upsert({
          where: { id: `${order.id}:${item.id}` },
          create: {
            id:        `${order.id}:${item.id}`,
            orderId:   order.id,
            productId: product.id,
            quantity:  item.quantity,
            price:     parseFloat(item.price) || 0,
            total:     parseFloat(item.total) || 0,
          },
          update: {
            quantity: item.quantity,
            total:    parseFloat(item.total) || 0,
          },
        });
      }
      total++;
    }

    if (orders.length < PAGE_SIZE) break;
    page++;
  }
  return total;
}

function mapOrderStatus(s: string): "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "REFUNDED" {
  const m: Record<string, any> = {
    pending:    "PENDING",
    processing: "PROCESSING",
    completed:  "COMPLETED",
    cancelled:  "CANCELLED",
    refunded:   "REFUNDED",
    failed:     "CANCELLED",
    "on-hold":  "PENDING",
  };
  return m[s] ?? "PROCESSING";
}
