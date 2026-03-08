/**
 * Seed script — creates demo org, user, ad account, campaigns, and metrics.
 * Run: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding BScale database...");

  // ── User + Org ─────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where:  { email: "demo@bscale.io" },
    update: {},
    create: {
      email:        "demo@bscale.io",
      name:         "Demo User",
      passwordHash: crypto.createHash("sha256").update("demo1234").digest("hex"),
    },
  });

  const org = await prisma.organization.upsert({
    where:  { slug: "demo-org" },
    update: {},
    create: { name: "Demo Store", slug: "demo-org", plan: "PRO" },
  });

  await prisma.orgMember.upsert({
    where:  { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: { userId: user.id, orgId: org.id, role: "OWNER" },
  });

  // ── Ad Account ─────────────────────────────────────────────────────────────
  const adAccount = await prisma.adAccount.upsert({
    where:  { orgId_platform_externalId: { orgId: org.id, platform: "GOOGLE", externalId: "123-456-7890" } },
    update: {},
    create: {
      orgId:      org.id,
      platform:   "GOOGLE",
      externalId: "123-456-7890",
      name:       "Demo Google Ads",
      currency:   "ILS",
      isActive:   true,
    },
  });

  // ── Campaigns ──────────────────────────────────────────────────────────────
  const campaigns = await Promise.all([
    prisma.campaign.upsert({
      where:  { adAccountId_externalId: { adAccountId: adAccount.id, externalId: "c001" } },
      update: {},
      create: {
        adAccountId:  adAccount.id,
        externalId:   "c001",
        name:         "Brand - Israel Search",
        status:       "ACTIVE",
        type:         "SEARCH",
        budgetAmount: 150,
      },
    }),
    prisma.campaign.upsert({
      where:  { adAccountId_externalId: { adAccountId: adAccount.id, externalId: "c002" } },
      update: {},
      create: {
        adAccountId:  adAccount.id,
        externalId:   "c002",
        name:         "Non-Brand - Competitor KW",
        status:       "ACTIVE",
        type:         "SEARCH",
        budgetAmount: 300,
      },
    }),
    prisma.campaign.upsert({
      where:  { adAccountId_externalId: { adAccountId: adAccount.id, externalId: "c003" } },
      update: {},
      create: {
        adAccountId:  adAccount.id,
        externalId:   "c003",
        name:         "Shopping - All Products",
        status:       "ACTIVE",
        type:         "SHOPPING",
        budgetAmount: 500,
      },
    }),
  ]);

  // ── Daily Metrics (last 30 days) ───────────────────────────────────────────
  const today = new Date();
  for (const campaign of campaigns) {
    for (let d = 0; d < 30; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      date.setHours(0, 0, 0, 0);

      const spend     = rand(80, 200);
      const roas      = rand(1.5, 5.5);
      const revenue   = spend * roas;
      const clicks    = Math.round(rand(50, 400));
      const impr      = Math.round(clicks * rand(20, 80));
      const conv      = rand(1, 8);

      await prisma.dailyMetric.upsert({
        where:  { campaignId_date: { campaignId: campaign.id, date } },
        update: {},
        create: {
          campaignId:     campaign.id,
          adAccountId:    adAccount.id,
          date,
          impressions:    impr,
          clicks,
          cost:           spend,
          conversions:    conv,
          conversionValue: revenue,
          revenue,
          ctr:            clicks / impr,
          cpc:            spend / clicks,
          cpa:            conv > 0 ? spend / conv : null,
          roas,
          grossProfit:    revenue - spend,
          netProfit:      revenue - spend - spend * 0.3,
          profitMargin:   (revenue - spend - spend * 0.3) / revenue,
        },
      });
    }
  }

  // ── Search Terms ───────────────────────────────────────────────────────────
  const demoTerms = [
    { query: "buy running shoes online", intent: "BUYER",      cost: 45.2,  conversions: 3, clicks: 28 },
    { query: "free running shoes",       intent: "IRRELEVANT",  cost: 18.5,  conversions: 0, clicks: 12 },
    { query: "how to choose running shoes", intent: "RESEARCH", cost: 22.1, conversions: 0, clicks: 31 },
    { query: "nike running shoes review", intent: "RESEARCH",   cost: 15.3,  conversions: 1, clicks: 19 },
    { query: "running shoes repair",     intent: "IRRELEVANT",  cost: 11.8,  conversions: 0, clicks: 8  },
    { query: "adidas running shoes",     intent: "COMPETITOR",  cost: 67.4,  conversions: 2, clicks: 44 },
    { query: "cheap running shoes",      intent: "LOW_INTENT",  cost: 33.6,  conversions: 1, clicks: 55 },
    { query: "running shoes size 44",    intent: "BUYER",       cost: 28.9,  conversions: 4, clicks: 22 },
    { query: "running shoes jobs",       intent: "IRRELEVANT",  cost: 9.1,   conversions: 0, clicks: 6  },
    { query: "best running shoes 2024",  intent: "RESEARCH",    cost: 41.2,  conversions: 1, clicks: 38 },
  ];

  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 30);

  for (const term of demoTerms) {
    await prisma.searchTerm.upsert({
      where: { id: `demo:${campaigns[0].id}:${term.query}` },
      update: {},
      create: {
        id:          `demo:${campaigns[0].id}:${term.query}`,
        campaignId:  campaigns[0].id,
        query:       term.query,
        intent:      term.intent as any,
        intentScore: term.intent === "IRRELEVANT" ? 0.95 : term.intent === "BUYER" ? 0.88 : 0.75,
        clicks:      term.clicks,
        cost:        term.cost,
        conversions: term.conversions,
        conversionValue: term.conversions * 89.9,
        ctr:         term.clicks / (term.clicks * rand(15, 40)),
        cpc:         term.clicks > 0 ? term.cost / term.clicks : null,
        cpa:         term.conversions > 0 ? term.cost / term.conversions : null,
        roas:        term.cost > 0 ? (term.conversions * 89.9) / term.cost : null,
        dateFrom:    fromDate,
        dateTo:      today,
        classifiedAt: new Date(),
      },
    });
  }

  // ── Demo Recommendations ───────────────────────────────────────────────────
  await prisma.aiRecommendation.upsert({
    where: { id: "demo-rec-001" },
    update: {},
    create: {
      id:             "demo-rec-001",
      campaignId:     campaigns[1].id,
      type:           "ADD_NEGATIVE_KEYWORD",
      title:          'Add 3 negative keywords to "Non-Brand - Competitor KW"',
      reason:         "Found 3 irrelevant queries (free, repair, jobs) spending ₪39.4 with 0 conversions.",
      confidence:     0.93,
      severity:       "HIGH",
      expectedImpact: "Save ≈₪39/month in wasted spend",
      payload:        {
        suggestions: [
          { query: "free running shoes",   suggestion: "free",   matchType: "BROAD", wasteAmount: 18.5 },
          { query: "running shoes repair", suggestion: "repair", matchType: "BROAD", wasteAmount: 11.8 },
          { query: "running shoes jobs",   suggestion: "jobs",   matchType: "BROAD", wasteAmount:  9.1 },
        ],
      },
      status: "PENDING",
    },
  });

  await prisma.aiRecommendation.upsert({
    where: { id: "demo-rec-002" },
    update: {},
    create: {
      id:             "demo-rec-002",
      campaignId:     campaigns[2].id,
      type:           "RAISE_BUDGET",
      title:          'Increase budget for "Shopping - All Products"',
      reason:         "Campaign hitting daily budget limit with ROAS 4.2x over last 7 days. Missing volume.",
      confidence:     0.88,
      severity:       "MEDIUM",
      expectedImpact: "Budget: ₪500 → ₪600 (+20%) — Est. +₪340 revenue/day",
      payload:        { currentBudget: 500, recommendedBudget: 600 },
      status:         "PENDING",
    },
  });

  // ── Approval Request for demo ──────────────────────────────────────────────
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);

  await prisma.approvalRequest.upsert({
    where: { id: "demo-appr-001" },
    update: {},
    create: {
      id:              "demo-appr-001",
      riskLevel:       "MEDIUM",
      title:           'Increase budget for "Shopping - All Products"',
      description:     "Campaign hitting daily budget limit with ROAS 4.2x. Increasing from ₪500 → ₪600.",
      payload:         { currentBudget: 500, recommendedBudget: 600 },
      status:          "PENDING",
      expiresAt:       expiry,
      recommendationId: "demo-rec-002",
    },
  });

  // ── Settings ───────────────────────────────────────────────────────────────
  await prisma.setting.upsert({
    where:  { orgId_key: { orgId: org.id, key: "exec_mode" } },
    update: {},
    create: { orgId: org.id, key: "exec_mode", value: "SUGGEST" },
  });

  await prisma.setting.upsert({
    where:  { orgId_key: { orgId: org.id, key: "currency" } },
    update: {},
    create: { orgId: org.id, key: "currency", value: "ILS" },
  });

  console.log("✅ Seed complete!");
  console.log("   User:  demo@bscale.io / demo1234");
  console.log(`   Org:   ${org.name} (${org.slug})`);
  console.log(`   Tables: 28 | Campaigns: ${campaigns.length} | Search Terms: ${demoTerms.length}`);
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
