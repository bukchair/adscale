-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GOOGLE', 'META', 'TIKTOK');

-- CreateEnum
CREATE TYPE "StorePlatform" AS ENUM ('WOOCOMMERCE', 'SHOPIFY');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REMOVED', 'DRAFT');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('SEARCH', 'DISPLAY', 'SHOPPING', 'VIDEO', 'PMAX');

-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('DAILY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('RSA', 'DSA');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('EXACT', 'PHRASE', 'BROAD');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SearchIntent" AS ENUM ('BUYER', 'RESEARCH', 'COMPETITOR', 'SUPPORT', 'IRRELEVANT', 'LOW_INTENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('RAISE_BUDGET', 'LOWER_BUDGET', 'PAUSE_CAMPAIGN', 'PAUSE_KEYWORD', 'ADD_NEGATIVE_KEYWORD', 'SUGGEST_CREATIVE', 'PROMOTE_PRODUCT', 'FLAG_ISSUE', 'INCREASE_BID', 'DECREASE_BID');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('BUDGET_CHANGE', 'BID_CHANGE', 'STATUS_CHANGE', 'NEGATIVE_KW_ADD', 'CREATIVE_UPDATE');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'EXECUTING', 'DONE', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('DRY_RUN', 'SUGGEST', 'APPROVAL_REQUIRED', 'AUTOMATED');

-- CreateEnum
CREATE TYPE "NegKwLevel" AS ENUM ('CAMPAIGN', 'AD_GROUP', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "NegKwSource" AS ENUM ('MANUAL', 'AI_SUGGESTED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('GOOGLE_ADS_CAMPAIGNS', 'GOOGLE_ADS_SEARCH_TERMS', 'META_CAMPAIGNS', 'WOOCOMMERCE_PRODUCTS', 'WOOCOMMERCE_ORDERS', 'SHOPIFY_PRODUCTS', 'SHOPIFY_ORDERS');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('BUDGET_DEPLETED', 'HIGH_CPA', 'ZERO_CONVERSIONS', 'ANOMALY', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "OrgPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'VIEWER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreIntegration" (
    "id" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "storeUrl" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "accessToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "StoreIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "type" "CampaignType" NOT NULL DEFAULT 'SEARCH',
    "budgetAmount" DECIMAL(12,2) NOT NULL,
    "budgetType" "BudgetType" NOT NULL DEFAULT 'DAILY',
    "bidStrategy" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adAccountId" TEXT NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdGroup" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "bidAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "AdGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" "AdType" NOT NULL DEFAULT 'RSA',
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "headlines" TEXT[],
    "descriptions" TEXT[],
    "finalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adGroupId" TEXT NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "text" TEXT NOT NULL,
    "matchType" "MatchType" NOT NULL DEFAULT 'BROAD',
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "bidAmount" DECIMAL(12,2),
    "qualityScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adGroupId" TEXT NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchTerm" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "intent" "SearchIntent" NOT NULL DEFAULT 'UNKNOWN',
    "intentScore" DOUBLE PRECISION,
    "intentReason" TEXT,
    "queryScore" INTEGER,
    "riskLevel" "RiskLevel",
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "cpc" DECIMAL(12,2),
    "cpa" DECIMAL(12,2),
    "roas" DOUBLE PRECISION,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "classifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "SearchTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "shippingCost" DECIMAL(12,2),
    "category" TEXT,
    "tags" TEXT[],
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCost" (
    "id" TEXT NOT NULL,
    "cogs" DECIMAL(12,2) NOT NULL,
    "shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PROCESSING',
    "total" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "refunded" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "platform" "Platform" NOT NULL,
    "conversionType" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "gclid" TEXT,
    "fbclid" TEXT,
    "convertedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "cpc" DECIMAL(12,2),
    "cpa" DECIMAL(12,2),
    "roas" DOUBLE PRECISION,
    "grossProfit" DECIMAL(12,2),
    "netProfit" DECIMAL(12,2),
    "profitMargin" DOUBLE PRECISION,
    "adAccountId" TEXT,
    "campaignId" TEXT,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyMetric" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "HourlyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegativeKeyword" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "matchType" "MatchType" NOT NULL DEFAULT 'BROAD',
    "level" "NegKwLevel" NOT NULL DEFAULT 'CAMPAIGN',
    "externalId" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,
    "source" "NegKwSource" NOT NULL DEFAULT 'MANUAL',
    "campaignId" TEXT,
    "adGroupId" TEXT,

    CONSTRAINT "NegativeKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegativeKeywordSuggestion" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "matchType" "MatchType" NOT NULL DEFAULT 'BROAD',
    "confidence" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "reason" TEXT NOT NULL,
    "wasteAmount" DECIMAL(12,2),
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchTermId" TEXT NOT NULL,

    CONSTRAINT "NegativeKeywordSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "expectedImpact" TEXT,
    "payload" JSONB NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeVariant" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "headline1" TEXT NOT NULL,
    "headline2" TEXT,
    "headline3" TEXT,
    "description1" TEXT NOT NULL,
    "description2" TEXT,
    "cta" TEXT,
    "angle" TEXT,
    "tone" TEXT,
    "score" DOUBLE PRECISION,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adId" TEXT,

    CONSTRAINT "CreativeVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationAction" (
    "id" TEXT NOT NULL,
    "type" "ActionType" NOT NULL,
    "mode" "ExecutionMode" NOT NULL DEFAULT 'DRY_RUN',
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "errorMsg" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT,

    CONSTRAINT "OptimizationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "recommendationId" TEXT,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "type" "SyncType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "recordsIn" INTEGER NOT NULL DEFAULT 0,
    "recordsOut" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "storeId" TEXT,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "meta" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "actionId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrgMember_orgId_idx" ON "OrgMember"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_userId_orgId_key" ON "OrgMember"("userId", "orgId");

-- CreateIndex
CREATE INDEX "AdAccount_orgId_platform_idx" ON "AdAccount"("orgId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdAccount_orgId_platform_externalId_key" ON "AdAccount"("orgId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "StoreIntegration_orgId_idx" ON "StoreIntegration"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreIntegration_orgId_platform_storeUrl_key" ON "StoreIntegration"("orgId", "platform", "storeUrl");

-- CreateIndex
CREATE INDEX "Campaign_adAccountId_status_idx" ON "Campaign"("adAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_adAccountId_externalId_key" ON "Campaign"("adAccountId", "externalId");

-- CreateIndex
CREATE INDEX "AdGroup_campaignId_idx" ON "AdGroup"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AdGroup_campaignId_externalId_key" ON "AdGroup"("campaignId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Ad_adGroupId_externalId_key" ON "Ad"("adGroupId", "externalId");

-- CreateIndex
CREATE INDEX "Keyword_adGroupId_idx" ON "Keyword"("adGroupId");

-- CreateIndex
CREATE INDEX "Keyword_text_idx" ON "Keyword"("text");

-- CreateIndex
CREATE INDEX "SearchTerm_campaignId_dateFrom_idx" ON "SearchTerm"("campaignId", "dateFrom");

-- CreateIndex
CREATE INDEX "SearchTerm_query_idx" ON "SearchTerm"("query");

-- CreateIndex
CREATE INDEX "SearchTerm_intent_idx" ON "SearchTerm"("intent");

-- CreateIndex
CREATE INDEX "SearchTerm_queryScore_idx" ON "SearchTerm"("queryScore");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_externalId_key" ON "Product"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "ProductCost_productId_effectiveFrom_idx" ON "ProductCost"("productId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Order_storeId_orderedAt_idx" ON "Order"("storeId", "orderedAt");

-- CreateIndex
CREATE INDEX "Order_gclid_idx" ON "Order"("gclid");

-- CreateIndex
CREATE INDEX "Order_fbclid_idx" ON "Order"("fbclid");

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_externalId_key" ON "Order"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Conversion_platform_convertedAt_idx" ON "Conversion"("platform", "convertedAt");

-- CreateIndex
CREATE INDEX "Conversion_gclid_idx" ON "Conversion"("gclid");

-- CreateIndex
CREATE INDEX "DailyMetric_adAccountId_date_idx" ON "DailyMetric"("adAccountId", "date");

-- CreateIndex
CREATE INDEX "DailyMetric_campaignId_date_idx" ON "DailyMetric"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_campaignId_date_key" ON "DailyMetric"("campaignId", "date");

-- CreateIndex
CREATE INDEX "HourlyMetric_campaignId_date_idx" ON "HourlyMetric"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyMetric_campaignId_date_hour_key" ON "HourlyMetric"("campaignId", "date", "hour");

-- CreateIndex
CREATE INDEX "NegativeKeyword_campaignId_idx" ON "NegativeKeyword"("campaignId");

-- CreateIndex
CREATE INDEX "NegativeKeyword_text_idx" ON "NegativeKeyword"("text");

-- CreateIndex
CREATE INDEX "NegativeKeywordSuggestion_searchTermId_idx" ON "NegativeKeywordSuggestion"("searchTermId");

-- CreateIndex
CREATE INDEX "NegativeKeywordSuggestion_status_idx" ON "NegativeKeywordSuggestion"("status");

-- CreateIndex
CREATE INDEX "NegativeKeywordSuggestion_confidence_idx" ON "NegativeKeywordSuggestion"("confidence");

-- CreateIndex
CREATE INDEX "AiRecommendation_campaignId_status_idx" ON "AiRecommendation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "AiRecommendation_type_status_idx" ON "AiRecommendation"("type", "status");

-- CreateIndex
CREATE INDEX "AiRecommendation_severity_status_idx" ON "AiRecommendation"("severity", "status");

-- CreateIndex
CREATE INDEX "CreativeVariant_platform_approved_idx" ON "CreativeVariant"("platform", "approved");

-- CreateIndex
CREATE INDEX "OptimizationAction_status_createdAt_idx" ON "OptimizationAction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OptimizationAction_type_idx" ON "OptimizationAction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_recommendationId_key" ON "ApprovalRequest"("recommendationId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_riskLevel_status_idx" ON "ApprovalRequest"("riskLevel", "status");

-- CreateIndex
CREATE INDEX "SyncJob_orgId_type_status_idx" ON "SyncJob"("orgId", "type", "status");

-- CreateIndex
CREATE INDEX "SyncJob_status_createdAt_idx" ON "SyncJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_orgId_key_key" ON "FeatureFlag"("orgId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_orgId_key_key" ON "Setting"("orgId", "key");

-- CreateIndex
CREATE INDEX "Alert_orgId_read_idx" ON "Alert"("orgId", "read");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreIntegration" ADD CONSTRAINT "StoreIntegration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdGroup" ADD CONSTRAINT "AdGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "AdGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "AdGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchTerm" ADD CONSTRAINT "SearchTerm_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "StoreIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCost" ADD CONSTRAINT "ProductCost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "StoreIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyMetric" ADD CONSTRAINT "HourlyMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegativeKeywordSuggestion" ADD CONSTRAINT "NegativeKeywordSuggestion_searchTermId_fkey" FOREIGN KEY ("searchTermId") REFERENCES "SearchTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeVariant" ADD CONSTRAINT "CreativeVariant_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAction" ADD CONSTRAINT "OptimizationAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "AiRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "StoreIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "OptimizationAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
