import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings, Settings } from "@/app/lib/settings";

const MASK = "••••••••";
const m = (val: string | undefined) => (val ? MASK : "");

export async function GET() {
  const s = readSettings();
  return NextResponse.json({
    woocommerce: {
      url: s.woocommerce?.url || process.env.WOOCOMMERCE_URL || "",
    },
    googleAds: {
      clientId: m(s.googleAds?.clientId || process.env.GOOGLE_CLIENT_ID),
      clientSecret: m(s.googleAds?.clientSecret || process.env.GOOGLE_CLIENT_SECRET),
      refreshToken: m(s.googleAds?.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN),
      customerId: s.googleAds?.customerId || process.env.GOOGLE_ADS_CUSTOMER_ID || "",
      developerToken: m(s.googleAds?.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
      managerId: s.googleAds?.managerId || process.env.GOOGLE_ADS_MANAGER_ID || "2913379431",
    },
    meta: {
      accessToken: m(s.meta?.accessToken || process.env.META_ACCESS_TOKEN),
      adAccountId: s.meta?.adAccountId || process.env.META_AD_ACCOUNT_ID || "",
    },
    tiktok: {
      advertiserId: s.tiktok?.advertiserId || process.env.TIKTOK_ADVERTISER_ID || "",
      accessToken: m(s.tiktok?.accessToken || process.env.TIKTOK_ACCESS_TOKEN),
    },
    ga4: {
      propertyId: s.ga4?.propertyId || process.env.GA4_PROPERTY_ID || "",
      clientEmail: s.ga4?.clientEmail || process.env.GA4_CLIENT_EMAIL || "",
      privateKey: m(s.ga4?.privateKey || process.env.GA4_PRIVATE_KEY),
    },
    gmc: {
      merchantId: s.gmc?.merchantId || process.env.GMC_MERCHANT_ID || "",
    },
    gsc: {
      siteUrl: s.gsc?.siteUrl || process.env.GSC_SITE_URL || "",
    },
    status: {
      woocommerce: !!(s.woocommerce?.url || process.env.WOOCOMMERCE_URL),
      googleAds: !!(
        (s.googleAds?.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN) &&
        (s.googleAds?.customerId || process.env.GOOGLE_ADS_CUSTOMER_ID) &&
        (s.googleAds?.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN)
      ),
      meta: !!(
        (s.meta?.accessToken || process.env.META_ACCESS_TOKEN) &&
        (s.meta?.adAccountId || process.env.META_AD_ACCOUNT_ID)
      ),
      tiktok: !!(
        (s.tiktok?.advertiserId || process.env.TIKTOK_ADVERTISER_ID) &&
        (s.tiktok?.accessToken || process.env.TIKTOK_ACCESS_TOKEN)
      ),
      ga4: !!(
        (s.ga4?.propertyId || process.env.GA4_PROPERTY_ID) &&
        (s.ga4?.clientEmail || process.env.GA4_CLIENT_EMAIL) &&
        (s.ga4?.privateKey || process.env.GA4_PRIVATE_KEY)
      ),
      gmc: !!(s.gmc?.merchantId || process.env.GMC_MERCHANT_ID),
      gsc: !!(s.gsc?.siteUrl || process.env.GSC_SITE_URL),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const current = readSettings();
  const pick = (newVal: string | undefined, oldVal: string | undefined) =>
    (newVal && newVal !== MASK) ? newVal : (oldVal || "");

  const updated: Settings = {
    woocommerce: { url: pick(body.woocommerce?.url, current.woocommerce?.url) },
    googleAds: {
      clientId: pick(body.googleAds?.clientId, current.googleAds?.clientId),
      clientSecret: pick(body.googleAds?.clientSecret, current.googleAds?.clientSecret),
      refreshToken: pick(body.googleAds?.refreshToken, current.googleAds?.refreshToken),
      customerId: pick(body.googleAds?.customerId, current.googleAds?.customerId),
      developerToken: pick(body.googleAds?.developerToken, current.googleAds?.developerToken),
      managerId: pick(body.googleAds?.managerId, current.googleAds?.managerId) || "2913379431",
    },
    meta: {
      accessToken: pick(body.meta?.accessToken, current.meta?.accessToken),
      adAccountId: pick(body.meta?.adAccountId, current.meta?.adAccountId),
    },
    tiktok: {
      advertiserId: pick(body.tiktok?.advertiserId, current.tiktok?.advertiserId),
      accessToken: pick(body.tiktok?.accessToken, current.tiktok?.accessToken),
    },
    ga4: {
      propertyId: pick(body.ga4?.propertyId, current.ga4?.propertyId),
      clientEmail: pick(body.ga4?.clientEmail, current.ga4?.clientEmail),
      privateKey: pick(body.ga4?.privateKey, current.ga4?.privateKey),
    },
    gmc: { merchantId: pick(body.gmc?.merchantId, current.gmc?.merchantId) },
    gsc: { siteUrl: pick(body.gsc?.siteUrl, current.gsc?.siteUrl) },
  };

  writeSettings(updated);
  return NextResponse.json({ success: true });
}
