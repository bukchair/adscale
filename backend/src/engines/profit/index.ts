// ============================================================
// Profit Optimization Engine
// Real profit = Revenue - AdSpend - COGS - Shipping - Fees
// ============================================================

export interface ProductCostInput {
  productId: string;
  productName: string;
  revenue: number;
  adSpend: number;
  cogsCost: number;
  shippingCost: number;
  platformFee: number;  // Shopify/WC fee
  otherCost: number;
  refundAmount: number;
  quantity: number;
}

export interface CampaignProfitInput {
  campaignId: string;
  campaignName: string;
  adSpend: number;
  revenue: number;
  conversions: number;
  impressions: number;
  clicks: number;
  products: ProductCostInput[];
}

export interface ProductProfitResult {
  productId: string;
  productName: string;
  revenue: number;
  adSpend: number;
  cogsCost: number;
  shippingCost: number;
  platformFee: number;
  otherCost: number;
  refundAmount: number;
  totalCost: number;
  grossProfit: number;      // revenue - COGS
  netProfit: number;        // gross - all costs
  profitMargin: number;     // %
  roas: number;
  poas: number;             // Profit on Ad Spend
  profitScore: number;      // 0-100
  isUnprofitable: boolean;
  recommendation: string;
}

export interface CampaignProfitResult {
  campaignId: string;
  campaignName: string;
  adSpend: number;
  revenue: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  roas: number;
  poas: number;
  profitScore: number;
  cpa: number;
  profitPerConversion: number;
  isUnprofitable: boolean;
  recommendation: string;
  productBreakdown: ProductProfitResult[];
}

export interface ProfitSummary {
  totalAdSpend: number;
  totalRevenue: number;
  totalCost: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  overallMargin: number;
  overallRoas: number;
  overallPoas: number;
  profitableCampaigns: number;
  unprofitableCampaigns: number;
  campaigns: CampaignProfitResult[];
}

export class ProfitEngine {
  calculateProductProfit(p: ProductCostInput): ProductProfitResult {
    const netRevenue = p.revenue - p.refundAmount;
    const totalCost = p.adSpend + p.cogsCost + p.shippingCost + p.platformFee + p.otherCost;
    const grossProfit = netRevenue - p.cogsCost;
    const netProfit = netRevenue - totalCost;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
    const roas = p.adSpend > 0 ? netRevenue / p.adSpend : 0;
    const poas = p.adSpend > 0 ? netProfit / p.adSpend : 0;

    // Score: combines margin, roas, poas
    const marginScore = Math.min(100, Math.max(0, profitMargin + 50)); // 0% margin = 50 score
    const roasScore = Math.min(100, roas * 20); // ROAS 5x = 100
    const poasScore = poas > 0 ? Math.min(100, poas * 50 + 50) : Math.max(0, 50 + poas * 50);
    const profitScore = Math.round((marginScore * 0.4 + roasScore * 0.3 + poasScore * 0.3));

    const isUnprofitable = netProfit < 0;
    const recommendation = this.getProductRecommendation(profitMargin, roas, poas, isUnprofitable);

    return {
      productId: p.productId,
      productName: p.productName,
      revenue: netRevenue,
      adSpend: p.adSpend,
      cogsCost: p.cogsCost,
      shippingCost: p.shippingCost,
      platformFee: p.platformFee,
      otherCost: p.otherCost,
      refundAmount: p.refundAmount,
      totalCost,
      grossProfit,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      roas: Math.round(roas * 100) / 100,
      poas: Math.round(poas * 100) / 100,
      profitScore,
      isUnprofitable,
      recommendation,
    };
  }

  calculateCampaignProfit(c: CampaignProfitInput): CampaignProfitResult {
    const productBreakdown = c.products.map((p) => this.calculateProductProfit(p));

    const totalCost = c.adSpend + productBreakdown.reduce((sum, p) => sum + p.cogsCost + p.shippingCost + p.platformFee + p.otherCost, 0);
    const grossProfit = productBreakdown.reduce((sum, p) => sum + p.grossProfit, 0);
    const netProfit = c.revenue - totalCost;
    const profitMargin = c.revenue > 0 ? (netProfit / c.revenue) * 100 : 0;
    const roas = c.adSpend > 0 ? c.revenue / c.adSpend : 0;
    const poas = c.adSpend > 0 ? netProfit / c.adSpend : 0;
    const cpa = c.conversions > 0 ? c.adSpend / c.conversions : 0;
    const profitPerConversion = c.conversions > 0 ? netProfit / c.conversions : 0;

    const marginScore = Math.min(100, Math.max(0, profitMargin + 50));
    const roasScore = Math.min(100, roas * 20);
    const poasScore = poas > 0 ? Math.min(100, poas * 50 + 50) : Math.max(0, 50 + poas * 50);
    const profitScore = Math.round(marginScore * 0.4 + roasScore * 0.3 + poasScore * 0.3);

    const isUnprofitable = netProfit < 0;
    const recommendation = this.getCampaignRecommendation(profitMargin, roas, poas, isUnprofitable, c.adSpend);

    return {
      campaignId: c.campaignId,
      campaignName: c.campaignName,
      adSpend: c.adSpend,
      revenue: c.revenue,
      totalCost: Math.round(totalCost * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      roas: Math.round(roas * 100) / 100,
      poas: Math.round(poas * 100) / 100,
      profitScore,
      cpa: Math.round(cpa * 100) / 100,
      profitPerConversion: Math.round(profitPerConversion * 100) / 100,
      isUnprofitable,
      recommendation,
      productBreakdown,
    };
  }

  calculateSummary(campaigns: CampaignProfitInput[]): ProfitSummary {
    const results = campaigns.map((c) => this.calculateCampaignProfit(c));

    const totalAdSpend = results.reduce((s, c) => s + c.adSpend, 0);
    const totalRevenue = results.reduce((s, c) => s + c.revenue, 0);
    const totalCost = results.reduce((s, c) => s + c.totalCost, 0);
    const totalGrossProfit = results.reduce((s, c) => s + c.grossProfit, 0);
    const totalNetProfit = results.reduce((s, c) => s + c.netProfit, 0);

    return {
      totalAdSpend: Math.round(totalAdSpend * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
      totalNetProfit: Math.round(totalNetProfit * 100) / 100,
      overallMargin: totalRevenue > 0 ? Math.round((totalNetProfit / totalRevenue) * 10000) / 100 : 0,
      overallRoas: totalAdSpend > 0 ? Math.round((totalRevenue / totalAdSpend) * 100) / 100 : 0,
      overallPoas: totalAdSpend > 0 ? Math.round((totalNetProfit / totalAdSpend) * 100) / 100 : 0,
      profitableCampaigns: results.filter((c) => !c.isUnprofitable).length,
      unprofitableCampaigns: results.filter((c) => c.isUnprofitable).length,
      campaigns: results,
    };
  }

  private getProductRecommendation(margin: number, roas: number, poas: number, unprofitable: boolean): string {
    if (unprofitable) return "⚠️ Unprofitable — review cost structure or pause ads for this product";
    if (margin > 40 && roas > 5) return "🚀 Top performer — increase budget allocation";
    if (margin > 20 && roas > 3) return "✅ Healthy — maintain current strategy";
    if (margin > 0 && roas > 2) return "📊 Marginal — optimize bids and targeting";
    return "⚠️ Low margin — reduce spend or improve AOV";
  }

  private getCampaignRecommendation(margin: number, roas: number, poas: number, unprofitable: boolean, spend: number): string {
    if (unprofitable && spend > 500) return "🚫 Critical: Unprofitable with high spend — pause immediately and investigate";
    if (unprofitable) return "⚠️ Unprofitable — optimize or pause";
    if (poas > 1) return "🚀 High profit on ad spend — scale this campaign";
    if (roas > 4 && margin > 25) return "✅ Strong campaign — consider budget increase";
    if (roas > 2) return "📊 Decent ROAS but check true profitability";
    return "⚠️ Low profitability — restructure targeting or creative";
  }
}
