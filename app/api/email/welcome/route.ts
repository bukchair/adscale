import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const USERS_LOG = path.join(process.cwd(), ".data", "registered-users.json");

const WELCOME_MESSAGES: Record<string, { subject: string; body: string }> = {
  he: {
    subject: "ברוכים הבאים ל-BScale — מערכת ניהול הפרסום שלך",
    body: `שלום {{name}},

ברוכים הבאים ל-BScale!

המערכת שלנו מאפשרת לך לנהל את כל ערוצי הפרסום שלך במקום אחד:
• Google Ads, Meta Ads ו-TikTok Ads
• ניתוח SEO מתקדם ועם AI
• דוחות רווחיות וניתוח פיננסי
• יצירת מודעות אוטומטית עם Gemini AI

התחבר ל: {{systemUrl}}

בהצלחה,
צוות BScale`,
  },
  en: {
    subject: "Welcome to BScale — Your Advertising Management System",
    body: `Hi {{name}},

Welcome to BScale!

Our platform lets you manage all your advertising channels in one place:
• Google Ads, Meta Ads and TikTok Ads
• Advanced AI-powered SEO analysis
• Profitability reports and financial analytics
• Automatic ad creation with Gemini AI

Log in at: {{systemUrl}}

Best regards,
The BScale Team`,
  },
  es: {
    subject: "Bienvenido a BScale — Tu sistema de gestión publicitaria",
    body: `Hola {{name}},

¡Bienvenido a BScale!

Nuestra plataforma te permite gestionar todos tus canales publicitarios en un solo lugar:
• Google Ads, Meta Ads y TikTok Ads
• Análisis SEO avanzado con IA
• Informes de rentabilidad y análisis financiero
• Creación automática de anuncios con Gemini AI

Inicia sesión en: {{systemUrl}}

Saludos,
El equipo de BScale`,
  },
  de: {
    subject: "Willkommen bei BScale — Ihr Werbemanagementsystem",
    body: `Hallo {{name}},

Willkommen bei BScale!

Unsere Plattform ermöglicht es Ihnen, alle Ihre Werbekanäle an einem Ort zu verwalten:
• Google Ads, Meta Ads und TikTok Ads
• Erweiterte KI-gestützte SEO-Analyse
• Rentabilitätsberichte und Finanzanalysen
• Automatische Anzeigenerstellung mit Gemini AI

Anmelden unter: {{systemUrl}}

Mit freundlichen Grüßen,
Das BScale-Team`,
  },
  fr: {
    subject: "Bienvenue sur BScale — Votre système de gestion publicitaire",
    body: `Bonjour {{name}},

Bienvenue sur BScale !

Notre plateforme vous permet de gérer tous vos canaux publicitaires en un seul endroit :
• Google Ads, Meta Ads et TikTok Ads
• Analyse SEO avancée avec IA
• Rapports de rentabilité et analyses financières
• Création automatique d'annonces avec Gemini AI

Connectez-vous sur : {{systemUrl}}

Cordialement,
L'équipe BScale`,
  },
  pt: {
    subject: "Bem-vindo ao BScale — Seu sistema de gerenciamento de publicidade",
    body: `Olá {{name}},

Bem-vindo ao BScale!

Nossa plataforma permite que você gerencie todos os seus canais de publicidade em um só lugar:
• Google Ads, Meta Ads e TikTok Ads
• Análise de SEO avançada com IA
• Relatórios de lucratividade e análises financeiras
• Criação automática de anúncios com Gemini AI

Faça login em: {{systemUrl}}

Atenciosamente,
A equipe BScale`,
  },
};

async function logRegisteredUser(email: string, name: string, lang: string) {
  try {
    await fs.mkdir(path.dirname(USERS_LOG), { recursive: true });
    let users: any[] = [];
    try { users = JSON.parse(await fs.readFile(USERS_LOG, "utf-8")); } catch {}
    if (!users.find((u: any) => u.email === email)) {
      users.push({ email, name, lang, createdAt: new Date().toISOString() });
      await fs.writeFile(USERS_LOG, JSON.stringify(users, null, 2), "utf-8");
    }
  } catch { /* silent */ }
}

export async function POST(req: NextRequest) {
  const { email, name, lang = "en", systemUrl = "" } = await req.json();
  if (!email || !name) {
    return NextResponse.json({ error: "email and name are required" }, { status: 400 });
  }

  // Log user registration
  await logRegisteredUser(email, name, lang);

  const template = WELCOME_MESSAGES[lang] || WELCOME_MESSAGES.en;
  const subject = template.subject;
  const body = template.body
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{systemUrl\}\}/g, systemUrl || "your BScale dashboard");

  // In production: send via Gmail API or nodemailer
  // Log the email for now
  const emailLog = path.join(process.cwd(), ".data", "welcome-emails.json");
  let log: any[] = [];
  try { log = JSON.parse(await fs.readFile(emailLog, "utf-8")); } catch {}
  log.push({ email, name, lang, subject, sentAt: new Date().toISOString() });
  await fs.mkdir(path.dirname(emailLog), { recursive: true });
  await fs.writeFile(emailLog, JSON.stringify(log, null, 2), "utf-8");

  return NextResponse.json({ ok: true, subject, preview: body.slice(0, 200) + "..." });
}
