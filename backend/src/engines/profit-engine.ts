/**
 * Profit Optimization Engine
 * Calculates true net profit per campaign/product using real cost data.
 * Formula: Net Profit = Revenue - Ad Spend - COGS - Shipping - Fees - Refunds
 */
import { prisma } from "../db/client.js";

export interface CampaignProfit {
  campaignId:    string;
  campaignName:  string;
  dateFrom:      string;
  dateTo:        string;
  revenue:       number;
  adSpend:       number;
  cogs:          number;
  shipping:      number;
  fees:          number;
  refunds:       number;
  grossProfit:   number;   // revenue - adSpend
  netProfit:     number;   // revenue - adSpend - cogs - shipping - fees - refunds
  profitMargin:  number;   // netProfit / revenue
  roas:          number;
  profitScore:   number;   // 0-100
}

export interface ProductProfit {
  productId:   string;
  productName: string;
  unitsSold:   number;
  revenue:     number;
  cogs:        number;
  shipping:    number;
  grossProfit: number;
  netProfit:   number;
  margin:      number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN PROFIT
// ─────────────────────────────────────────────────────────────────────────────

export async function calcCampaignProfit(
  campaignId: string,
  dateFrom:   Date,
  dateTo:     Date
): Promise<CampaignProfit> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where:   { id: campaignId },
    include: { adAccount: true },
  });

  // Sum daily metrics for the period
  const metrics = await prisma.dailyMetric.aggregate({
    where:  { campaignId, date: { gte: dateFrom, lte: dateTo } },
    _sum:   { cost: true, revenue: true, conversions: true },
  });

  const adSpend = Number(metrics._sum.cost ?? 0);
  const revenue = Number(metrics._sum.revenue ?? 0);

  // Match orders via UTM/campaign attribution (simplified: use revenue from ad platform)
  // In production: join with orders table using gclid/fbclid matching
  const orders = await prisma.order.findMany({
    where: {
      store:     { orgId: campaign.adAccount.orgId },
      orderedAt: { gte: dateFrom, lte: dateTo },
      campaign:  campaign.name,
      status:    { in: ["COMPLETED", "PROCESSING"] },
    },
    include: {
      items: { include: { product: { include: { costs: { orderBy: { effectiveFrom: "desc" }, take: 1 } } } } },
    },
  });

  let cogs     = 0;
  let shipping = 0;
  let fees     = 0;
  let refunds  = 0;

  for (const order of orders) {
    refunds += Number(order.refundTotal);
    shipping += Number(order.shipping);
    for (const item of order.items) {
      const cost = item.product.costs[0];
      if (cost) {
        cogs     += Number(cost.cogs) * item.quantity;
        fees     += Number(cost.fees) * item.quantity;
      }
    }
  }

  const grossProfit = revenue - adSpend;
  const netProfit   = revenue - adSpend - cogs - shipping - fees - refunds;
  const margin      = revenue > 0 ? netProfit / revenue : 0;

  return {
    campaignId,
    campaignName:  campaign.name,
    dateFrom:      dateFrom.toISOString().slice(0, 10),
    dateTo:        dateTo.toISOString().slice(0, 10),
    revenue:       round2(revenue),
    adSpend:       round2(adSpend),
    cogs:          round2(cogs),
    shipping:      round2(shipping),
    fees:          round2(fees),
    refunds:       round2(refunds),
    grossProfit:   round2(grossProfit),
    netProfit:     round2(netProfit),
    profitMargin:  round4(margin),
    roas:          adSpend > 0 ? round2(revenue / adSpend) : 0,
    profitScore:   toProfitScore(netProfit, adSpend),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT PROFIT
// ─────────────────────────────────────────────────────────────────────────────

export async function calcProductProfit(
  storeId:  string,
  dateFrom: Date,
  dateTo:   Date
): Promise<ProductProfit[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        storeId,
        orderedAt: { gte: dateFrom, lte: dateTo },
        status:    { in: ["COMPLETED", "PROCESSING"] },
      },
    },
    include: {
      product: {
        include: { costs: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
      },
      order: true,
    },
  });

  const map = new Map<string, ProductProfit>();

  for (const item of items) {
    const p    = item.product;
    const cost = p.costs[0];
    const prev = map.get(p.id) ?? {
      productId:   p.id,
      productName: p.name,
      unitsSold:   0,
      revenue:     0,
      cogs:        0,
      shipping:    0,
      grossProfit: 0,
      netProfit:   0,
      margin:      0,
    };

    const revenue = Number(item.total) - Number(item.refunded);
    const cogs    = cost ? Number(cost.cogs) * item.quantity : 0;
    const ship    = cost ? Number(cost.shipping) * item.quantity : 0;
    const fees    = cost ? Number(cost.fees) * item.quantity : 0;

    prev.unitsSold += item.quantity;
    prev.revenue   += revenue;
    prev.cogs      += cogs;
    prev.shipping  += ship;

    map.set(p.id, prev);
  }

  return Array.from(map.values()).map((p) => {
    const netProfit = p.revenue - p.cogs - p.shipping;
    return {
      ...p,
      grossProfit: round2(p.revenue - p.cogs),
      netProfit:   round2(netProfit),
      margin:      round4(p.revenue > 0 ? netProfit / p.revenue : 0),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ORG-LEVEL PROFIT SUMMARY
// Rolls up all campaigns for a fast dashboard overview.
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgProfitSummary {
  orgId:        string;
  dateFrom:     string;
  dateTo:       string;
  totalRevenue: number;
  totalSpend:   number;
  totalCogs:    number;
  totalRefunds: number;
  grossProfit:  number;
  netProfit:    number;
  blendedRoas:  number;
  blendedMargin: number;
  campaignCount: number;
  profitableCampaigns: number;
  unprofitableCampaigns: number;
}

export async function calcOrgProfit(
  orgId:    string,
  dateFrom: Date,
  dateTo:   Date
): Promise<OrgProfitSummary> {
  const accounts = await prisma.adAccount.findMany({
    where:   { orgId, isActive: true },
    include: { campaigns: { where: { status: "ACTIVE" } } },
  });

  const allCampaignIds = accounts.flatMap((a) => a.campaigns.map((c) => c.id));

  const metricAgg = await prisma.dailyMetric.aggregate({
    where: { campaignId: { in: allCampaignIds }, date: { gte: dateFrom, lte: dateTo } },
    _sum:  { cost: true, revenue: true },
  });

  const totalSpend   = Number(metricAgg._sum.cost    ?? 0);
  const totalRevenue = Number(metricAgg._sum.revenue ?? 0);

  // Refunds + COGS from the store orders
  const stores = await prisma.storeIntegration.findMany({ where: { orgId, isActive: true } });
  const storeIds = stores.map((s) => s.id);

  const orderAgg = await prisma.order.aggregate({
    where: {
      storeId:   { in: storeIds },
      orderedAt: { gte: dateFrom, lte: dateTo },
      status:    { in: ["COMPLETED", "PROCESSING"] },
    },
    _sum: { refundTotal: true, shipping: true },
  });

  const totalRefunds  = Number(orderAgg._sum.refundTotal ?? 0);
  const totalShipping = Number(orderAgg._sum.shipping    ?? 0);

  // COGS: sum from product costs × quantities sold
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        storeId:   { in: storeIds },
        orderedAt: { gte: dateFrom, lte: dateTo },
        status:    { in: ["COMPLETED", "PROCESSING"] },
      },
    },
    include: {
      product: { include: { costs: { orderBy: { effectiveFrom: "desc" }, take: 1 } } },
    },
  });

  let totalCogs = 0;
  let totalFees = 0;
  for (const item of orderItems) {
    const cost = item.product.costs[0];
    if (cost) {
      totalCogs += Number(cost.cogs) * item.quantity;
      totalFees += Number(cost.fees) * item.quantity;
    }
  }

  const grossProfit = totalRevenue - totalSpend;
  const netProfit   = totalRevenue - totalSpend - totalCogs - totalShipping - totalFees - totalRefunds;

  // Per-campaign breakdown for profitability counts
  let profitable = 0;
  let unprofitable = 0;
  for (const account of accounts) {
    for (const campaign of account.campaigns) {
      const agg = await prisma.dailyMetric.aggregate({
        where: { campaignId: campaign.id, date: { gte: dateFrom, lte: dateTo } },
        _sum:  { cost: true, revenue: true },
      });
      const spend = Number(agg._sum.cost ?? 0);
      const rev   = Number(agg._sum.revenue ?? 0);
      if (rev > spend) profitable++;
      else if (spend > 0) unprofitable++;
    }
  }

  return {
    orgId,
    dateFrom:             dateFrom.toISOString().slice(0, 10),
    dateTo:               dateTo.toISOString().slice(0, 10),
    totalRevenue:         round2(totalRevenue),
    totalSpend:           round2(totalSpend),
    totalCogs:            round2(totalCogs),
    totalRefunds:         round2(totalRefunds),
    grossProfit:          round2(grossProfit),
    netProfit:            round2(netProfit),
    blendedRoas:          totalSpend > 0 ? round2(totalRevenue / totalSpend) : 0,
    blendedMargin:        totalRevenue > 0 ? round4(netProfit / totalRevenue) : 0,
    campaignCount:        allCampaignIds.length,
    profitableCampaigns:  profitable,
    unprofitableCampaigns: unprofitable,
  };
}

function toProfitScore(netProfit: number, adSpend: number): number {
  if (adSpend === 0) return 50;
  const roi = netProfit / adSpend;
  if (roi >= 2.0)  return 100;
  if (roi >= 1.0)  return 85;
  if (roi >= 0.5)  return 70;
  if (roi >= 0.0)  return 50;
  if (roi >= -0.5) return 25;
  return 0;
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round4(n: number) { return Math.round(n * 10000) / 10000; }
