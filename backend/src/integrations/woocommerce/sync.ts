// ============================================================
// WooCommerce Sync Service
// Fetches products and orders via WC REST API v3
// ============================================================

import { db } from "../../db/client.js";
import { logger } from "../../utils/logger.js";

interface WooCreds {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export class WooCommerceSyncService {
  private creds: WooCreds;
  private baseUrl: string;

  constructor(creds: WooCreds) {
    this.creds = creds;
    this.baseUrl = `${creds.siteUrl}/wp-json/wc/v3`;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const auth = Buffer.from(`${this.creds.consumerKey}:${this.creds.consumerSecret}`).toString("base64");
    const qs = new URLSearchParams(params);
    const url = `${this.baseUrl}${endpoint}?${qs}`;

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WooCommerce API error ${res.status}: ${err}`);
    }

    const totalPages = Number(res.headers.get("x-wp-totalpages") || 1);
    const data = await res.json();
    return { data, totalPages } as any;
  }

  async syncProducts(storeId: string): Promise<number> {
    let page = 1;
    let totalSynced = 0;

    while (true) {
      const { data: products, totalPages } = await this.fetch<{ data: any[]; totalPages: number }>(
        "/products",
        { per_page: "100", page: String(page), status: "publish" }
      );

      for (const p of products) {
        await db.product.upsert({
          where: { storeId_externalId: { storeId, externalId: String(p.id) } },
          create: {
            storeId,
            externalId: String(p.id),
            sku: p.sku || null,
            name: p.name,
            status: p.status,
            price: Number(p.price || p.regular_price || 0),
            salePrice: p.sale_price ? Number(p.sale_price) : null,
            stockStatus: p.stock_status,
            categories: p.categories?.map((c: any) => c.name) || [],
            tags: p.tags?.map((t: any) => t.name) || [],
            imageUrl: p.images?.[0]?.src || null,
          },
          update: {
            name: p.name,
            price: Number(p.price || p.regular_price || 0),
            salePrice: p.sale_price ? Number(p.sale_price) : null,
            stockStatus: p.stock_status,
          },
        });
        totalSynced++;
      }

      if (page >= totalPages) break;
      page++;
      await new Promise((r) => setTimeout(r, 200)); // rate limit
    }

    logger.info({ totalSynced, storeId }, "WooCommerce products synced");
    return totalSynced;
  }

  async syncOrders(storeId: string, dateFrom: string, dateTo: string): Promise<number> {
    let page = 1;
    let totalSynced = 0;

    while (true) {
      const { data: orders, totalPages } = await this.fetch<{ data: any[]; totalPages: number }>(
        "/orders",
        {
          per_page: "100",
          page: String(page),
          after: new Date(dateFrom).toISOString(),
          before: new Date(dateTo + "T23:59:59").toISOString(),
          status: "completed,processing",
        }
      );

      for (const o of orders) {
        const order = await db.order.upsert({
          where: { storeId_externalId: { storeId, externalId: String(o.id) } },
          create: {
            storeId,
            externalId: String(o.id),
            status: o.status,
            currency: o.currency,
            subtotal: Number(o.subtotal || 0),
            shippingTotal: Number(o.shipping_total || 0),
            taxTotal: Number(o.total_tax || 0),
            discountTotal: Number(o.discount_total || 0),
            totalAmount: Number(o.total || 0),
            refundTotal: Number(o.refunds?.reduce((s: number, r: any) => s + Math.abs(Number(r.total || 0)), 0) || 0),
            customerEmail: o.billing?.email || null,
            placedAt: new Date(o.date_created),
          },
          update: {
            status: o.status,
            totalAmount: Number(o.total || 0),
          },
        });

        // Sync line items
        for (const item of (o.line_items || [])) {
          const product = item.sku
            ? await db.product.findFirst({ where: { storeId, sku: item.sku } })
            : null;

          await db.orderItem.upsert({
            where: {
              // Use a composite that's stable: orderId + externalId
              id: `${order.id}_${item.id}`,
            },
            create: {
              id: `${order.id}_${item.id}`,
              orderId: order.id,
              productId: product?.id || null,
              externalId: String(item.id),
              sku: item.sku || null,
              name: item.name,
              quantity: item.quantity,
              unitPrice: Number(item.price || 0),
              totalPrice: Number(item.total || 0),
            },
            update: {
              quantity: item.quantity,
              totalPrice: Number(item.total || 0),
            },
          });
        }

        totalSynced++;
      }

      if (page >= totalPages) break;
      page++;
      await new Promise((r) => setTimeout(r, 300));
    }

    logger.info({ totalSynced, storeId, dateFrom, dateTo }, "WooCommerce orders synced");
    return totalSynced;
  }
}
