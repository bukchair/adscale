// ============================================================
// i18n.ts — Multi-language support
// Languages: Hebrew, English, Spanish, German, French, Portuguese, Russian
// ============================================================

export type Lang = "he" | "en" | "es" | "de" | "fr" | "pt" | "ru";

export const LANG_META: Record<Lang, { flag: string; label: string; dir: "rtl" | "ltr"; locale: string }> = {
  he: { flag: "🇮🇱", label: "עברית",    dir: "rtl", locale: "he-IL" },
  en: { flag: "🇺🇸", label: "English",  dir: "ltr", locale: "en-US" },
  es: { flag: "🇪🇸", label: "Español",  dir: "ltr", locale: "es-ES" },
  de: { flag: "🇩🇪", label: "Deutsch",  dir: "ltr", locale: "de-DE" },
  fr: { flag: "🇫🇷", label: "Français", dir: "ltr", locale: "fr-FR" },
  pt: { flag: "🇧🇷", label: "Português",dir: "ltr", locale: "pt-BR" },
  ru: { flag: "🇷🇺", label: "Русский",  dir: "ltr", locale: "ru-RU" },
};

/** T6 now requires `he` and `en`; all other languages fall back to English if omitted. */
export type T6 = { he: string; en: string } & Partial<Record<Lang, string>>;

/** Translate a key to the given language, falling back to English */
export function tl(lang: Lang, texts: T6): string {
  return texts[lang] ?? texts.en;
}

/** Create a translate helper bound to a specific language.
 *  Backward-compatible: t(he, en) still works for 2-arg callers.
 *  Full: t({ he, en, es, de, fr, pt }) for rich translations.
 */
export function makeT(lang: Lang) {
  return (heOrObj: string | T6, en?: string): string => {
    if (typeof heOrObj === "object") return tl(lang, heOrObj);
    if (lang === "he") return heOrObj;
    return en ?? heOrObj;
  };
}

// ── Nav group labels ─────────────────────────────────────────
export const NAV_GROUP_LABELS: Record<string, T6> = {
  performance: { he: "ביצועים",       en: "Performance",  es: "Rendimiento",   de: "Leistung",      fr: "Performance",  pt: "Desempenho",    ru: "Эффективность"  },
  campaigns:   { he: "קמפיינים ו-AI", en: "Campaigns & AI",es: "Campañas & IA", de: "Kampagnen & KI", fr: "Campagnes & IA",pt: "Campanhas & IA", ru: "Кампании и ИИ" },
  growth:      { he: "צמיחה",         en: "Growth",        es: "Crecimiento",   de: "Wachstum",      fr: "Croissance",   pt: "Crescimento",   ru: "Рост"           },
  manage:      { he: "ניהול",          en: "Manage",        es: "Gestión",       de: "Verwaltung",    fr: "Gestion",      pt: "Gestão",        ru: "Управление"     },
};

// ── Date filter labels ────────────────────────────────────────
export const DATE_FILTER_LABELS: Record<string, T6> = {
  today:       { he: "היום",              en: "Today",          es: "Hoy",             de: "Heute",         fr: "Aujourd'hui",  pt: "Hoje",          ru: "Сегодня"         },
  last7days:   { he: "7 ימים אחרונים",    en: "Last 7 Days",    es: "Últimos 7 días",  de: "Letzte 7 Tage", fr: "7 derniers j.", pt: "Últimos 7 dias", ru: "Последние 7 дн." },
  last30days:  { he: "30 ימים אחרונים",   en: "Last 30 Days",   es: "Últimos 30 días", de: "Letzte 30 Tage",fr: "30 derniers j.",pt: "Últimos 30 dias",ru: "Последние 30 дн."},
  customRange: { he: "טווח מותאם",        en: "Custom Range",   es: "Rango personalizado", de: "Benutzerdef.", fr: "Plage perso.", pt: "Intervalo pers.",ru: "Свой диапазон"  },
  from:        { he: "מ-",                en: "From",           es: "Desde",           de: "Von",           fr: "Du",           pt: "De",             ru: "С"               },
  to:          { he: "עד",               en: "To",             es: "Hasta",           de: "Bis",           fr: "Au",           pt: "Até",            ru: "По"              },
};

// ── Module names ──────────────────────────────────────────────
export const MODULE_NAMES: Record<string, T6> = {
  overview:        { he: "סקירה כללית",              en: "Overview",                      es: "Resumen",               de: "Übersicht",          fr: "Aperçu",               pt: "Visão Geral",            ru: "Обзор"                       },
  profitability:   { he: "רווחיות / דוחות כספיים",   en: "Profitability / Financial",     es: "Rentabilidad / Finanzas",de: "Rentabilität / Finanzen",fr: "Rentabilité / Finances",pt: "Rentabilidade / Finanças",  ru: "Рентабельность / Финансы"    },
  budget:          { he: "ניהול תקציב",              en: "Budget Management",             es: "Gestión Presupuesto",   de: "Budgetverwaltung",   fr: "Gestion Budget",       pt: "Gestão Orçamento",       ru: "Управление бюджетом"         },
  recommendations: { he: "המלצות AI",               en: "AI Recommendations",            es: "Recomendaciones IA",    de: "KI-Empfehlungen",    fr: "Recommandations IA",   pt: "Recomendações IA",       ru: "Рекомендации ИИ"             },
  "search-terms":  { he: "ניתוח חיפושים",            en: "Search Analysis",               es: "Análisis de Búsqueda",  de: "Suchanalyse",        fr: "Analyse Recherche",    pt: "Análise de Busca",       ru: "Анализ поиска"               },
  seo:             { he: "מרכז SEO",                 en: "SEO Center",                    es: "Centro SEO",            de: "SEO Zentrum",        fr: "Centre SEO",           pt: "Centro SEO",             ru: "Центр SEO"                   },
  products:        { he: "מוצרים",                   en: "Products",                      es: "Productos",             de: "Produkte",           fr: "Produits",             pt: "Produtos",               ru: "Товары"                      },
  audiences:       { he: "קהלים",                    en: "Audiences",                     es: "Audiencias",            de: "Zielgruppen",        fr: "Audiences",            pt: "Públicos",               ru: "Аудитории"                   },
  "creative-lab":  { he: "מעבדת יצירה",              en: "Creative Lab",                  es: "Lab. Creativo",         de: "Kreativlabor",       fr: "Atelier Créatif",      pt: "Lab. Criativo",          ru: "Творческая лаборатория"      },
  approvals:       { he: "אישורים / אוטומציות",      en: "Approvals / Automations",       es: "Aprobaciones / Automatiz.",de: "Genehmig. / Automation",fr: "Approbations / Autom.", pt: "Aprovações / Automações", ru: "Согласования / Автоматизация"},
  "audit-log":     { he: "יומן פעולות",              en: "Activity Log",                  es: "Registro de Actividad", de: "Aktivitätslog",      fr: "Journal d'Activité",   pt: "Log de Atividade",       ru: "Журнал активности"           },
  integrations:    { he: "חיבורים",                  en: "Connections",                   es: "Conexiones",            de: "Verbindungen",       fr: "Connexions",           pt: "Conexões",               ru: "Подключения"                 },
  users:           { he: "משתמשים",                  en: "Users & Roles",                 es: "Usuarios y Roles",      de: "Benutzer & Rollen",  fr: "Utilisateurs & Rôles", pt: "Usuários e Funções",     ru: "Пользователи и роли"         },
};

// ── Module info descriptions ──────────────────────────────────
export const MODULE_INFO: Record<string, T6> = {
  overview:        { he: "תצוגת ביצועים כוללת — הכנסות, הוצאות, ROAS, תנועה מ-GA4, סטטוס SEO ופעולות מהירות חכמות.", en: "Complete performance overview — revenue, spend, ROAS, GA4 traffic, SEO status and smart quick actions from all platforms.", es: "Vista general — ingresos, gastos, ROAS, tráfico GA4, estado SEO y acciones rápidas.", de: "Vollständige Übersicht — Einnahmen, Ausgaben, ROAS, GA4-Traffic, SEO-Status und schnelle Aktionen.", fr: "Vue d'ensemble — revenus, dépenses, ROAS, trafic GA4, statut SEO et actions rapides.", pt: "Visão geral — receitas, gastos, ROAS, tráfego GA4, status SEO e ações rápidas." },
  profitability:   { he: "רווחיות אמיתית לכל קמפיין + דוחות כספיים מלאים — הכנסות, הוצאות, רווח. ניתוח Gemini AI.", en: "Real profit per campaign + full financial reports — revenue, spend, profit. Gemini AI analysis.", es: "Rentabilidad real + informes financieros — ingresos, gastos, ganancias. Análisis IA Gemini.", de: "Echter Gewinn + vollständige Finanzberichte — Einnahmen, Ausgaben. Gemini KI-Analyse.", fr: "Profit réel + rapports financiers — revenus, dépenses. Analyse IA Gemini.", pt: "Lucro real + relatórios financeiros — receitas, gastos. Análise IA Gemini." },
  budget:          { he: "ניתוח עלויות פרסום — CPA, ROAS, יעילות הוצאה. Gemini מנתח ומציע אופטימיזציה לתקציב.", en: "Ad cost analysis — CPA, ROAS, spend efficiency. Gemini analyzes and suggests budget optimization.", es: "Análisis de costos — CPA, ROAS, eficiencia. Gemini sugiere optimización de presupuesto.", de: "Kostenalyse — CPA, ROAS, Effizienz. Gemini schlägt Budgetoptimierung vor.", fr: "Analyse des coûts — CPA, ROAS, efficacité. Gemini suggère l'optimisation du budget.", pt: "Análise de custos — CPA, ROAS, eficiência. Gemini sugere otimização de orçamento." },
  recommendations: { he: "מרכז המלצות AI לפי קטגוריה: פרסום, SEO, תקציב, מוצרים, קהלים. כל המלצה מוסברת בבירור.", en: "AI recommendations hub by category: Advertising, SEO, Budget, Products, Audiences. Every recommendation is clearly explained.", es: "Centro IA por categoría: Publicidad, SEO, Presupuesto, Productos, Audiencias.", de: "KI-Empfehlungen nach Kategorie: Werbung, SEO, Budget, Produkte, Zielgruppen.", fr: "Hub IA par catégorie: Publicité, SEO, Budget, Produits, Audiences.", pt: "Hub de IA por categoria: Publicidade, SEO, Orçamento, Produtos, Públicos." },
  "search-terms":  { he: "ניתוח מגמות חיפוש + מילות מפתח חלשות + תנועה לא רלוונטית. יצירת מילות שלילי ברמת החשבון עם Gemini.", en: "Search trends, low-performing keywords, irrelevant traffic analysis. Generate account-level negative keywords with Gemini.", es: "Tendencias de búsqueda, palabras débiles, tráfico irrelevante. Genera negativos con Gemini.", de: "Suchtrends, schwache Keywords, irrelevanter Traffic. Negative Keywords mit Gemini generieren.", fr: "Tendances de recherche, mots-clés faibles, trafic non pertinent. Générer des négatifs avec Gemini.", pt: "Tendências de busca, palavras fracas, tráfego irrelevante. Gerar negativos com Gemini." },
  seo:             { he: "SEO מלא — כותרות, תיאורים, alt text, תמונות מוצרים. Gemini משפר ומייעל את החנות שלך.", en: "Full SEO — titles, descriptions, alt text, product images. Gemini improves and optimizes your store.", es: "SEO completo — títulos, descripciones, alt text, imágenes. Gemini optimiza tu tienda.", de: "Vollständiges SEO — Titel, Beschreibungen, Alt-Text, Bilder. Gemini optimiert Ihren Shop.", fr: "SEO complet — titres, descriptions, alt text, images. Gemini optimise votre boutique.", pt: "SEO completo — títulos, descrições, alt text, imagens. Gemini otimiza sua loja." },
  products:        { he: "כל המוצרים מ-WooCommerce — תמונות, תיאורים, וריאנטים, מחירים, SKU וביצועים.", en: "All products from WooCommerce — images, descriptions, variants, pricing, SKU and performance.", es: "Todos los productos de WooCommerce — imágenes, variantes, precios, SKU y rendimiento.", de: "Alle WooCommerce-Produkte — Bilder, Varianten, Preise, SKU und Leistung.", fr: "Tous les produits WooCommerce — images, variantes, prix, SKU et performances.", pt: "Todos os produtos WooCommerce — imagens, variantes, preços, SKU e desempenho." },
  audiences:       { he: "קהלים חכמים מ-Google Ads, Meta ו-TikTok. Gemini מייצר קהלים לפי נתוני רכישה, התנהגות ותחומי עניין.", en: "Smart audiences from Google Ads, Meta and TikTok. Gemini generates audiences based on purchase data, behavior and interests.", es: "Audiencias inteligentes de Google, Meta y TikTok. Gemini genera audiencias basadas en compras.", de: "Zielgruppen aus Google, Meta und TikTok. Gemini generiert Zielgruppen basierend auf Käufen.", fr: "Audiences intelligentes de Google, Meta et TikTok. Gemini génère des audiences.", pt: "Públicos inteligentes de Google, Meta e TikTok. Gemini gera públicos baseados em compras." },
  "creative-lab":  { he: "מייצר תמונות, טקסט וקריאייטיב למודעות עם Gemini. פרסום ישיר ל-Google Ads, Meta ו-TikTok.", en: "Generate images, text and ad creatives with Gemini. Publish directly to Google Ads, Meta and TikTok.", es: "Genera imágenes, texto y creatividades con Gemini. Publica en Google, Meta y TikTok.", de: "Bilder, Text und Kreatives mit Gemini. Direkt auf Google, Meta und TikTok veröffentlichen.", fr: "Générez images, texte et créatifs avec Gemini. Publiez sur Google, Meta et TikTok.", pt: "Gere imagens, texto e criativos com Gemini. Publique no Google, Meta e TikTok." },
  approvals:       { he: "כל פעולות ה-AI ממתינות לאישור — מילות שלילי, תקציבים, מודעות, SEO. אשר, דחה או הגדר כללי אוטו-אישור.", en: "All AI actions awaiting approval — negative keywords, budgets, ads, SEO updates. Approve, reject or set auto-apply rules.", es: "Acciones IA en espera — negativos, presupuestos, anuncios, SEO. Aprobar, rechazar o reglas automáticas.", de: "KI-Aktionen zur Genehmigung — Negative Keywords, Budgets, Anzeigen, SEO. Genehmigen, ablehnen oder Auto-Regeln.", fr: "Actions IA en attente — négatifs, budgets, annonces, SEO. Approuver, rejeter ou règles automatiques.", pt: "Ações IA aguardando aprovação — negativos, orçamentos, anúncios, SEO. Aprovar, rejeitar ou regras automáticas." },
  "audit-log":     { he: "יומן פעולות בסגנון לוח שנה — פעולות משתמש, AI, שינויי קמפיין, עדכוני מערכת. סינון לפי תאריך, משתמש, סוג.", en: "Calendar-style activity log — user actions, AI actions, campaign changes, system updates. Filter by date, user, type.", es: "Registro de actividad estilo calendario — acciones de usuario, IA, campañas. Filtrar por fecha, usuario.", de: "Kalender-Aktivitätsprotokoll — Benutzer-, KI-Aktionen, Kampagnenänderungen. Nach Datum filtern.", fr: "Journal d'activité calendrier — actions utilisateur, IA, campagnes. Filtrer par date, utilisateur.", pt: "Log de atividade calendário — ações de usuário, IA, campanhas. Filtrar por data, usuário." },
  integrations:    { he: "כל החיבורים — Google (Ads, Analytics, Search Console, Gmail), Meta, TikTok, WooCommerce, Shopify. ציון איכות חיבורים.", en: "All connections — Google (Ads, Analytics, Search Console, Gmail), Meta, TikTok, WooCommerce, Shopify. Connection quality score.", es: "Todas las conexiones — Google, Meta, TikTok, WooCommerce, Shopify. Puntuación de calidad.", de: "Alle Verbindungen — Google, Meta, TikTok, WooCommerce, Shopify. Verbindungsqualitätsbewertung.", fr: "Toutes les connexions — Google, Meta, TikTok, WooCommerce, Shopify. Score de qualité.", pt: "Todas as conexões — Google, Meta, TikTok, WooCommerce, Shopify. Pontuação de qualidade." },
  users:           { he: "ניהול תפקידים: בעל המערכת, מנהל סוכנות, לקוח. הגדר הרשאות ושלוט במי רואה מה.", en: "Role management: System Owner, Agency Manager, Client User. Set permissions and control who sees what.", es: "Roles: Propietario, Manager de Agencia, Cliente. Permisos y control de acceso.", de: "Rollen: Systeminhaber, Agenturmanager, Kunde. Berechtigungen festlegen.", fr: "Rôles: Propriétaire, Manager Agence, Client. Permissions et contrôle d'accès.", pt: "Funções: Proprietário, Gerente de Agência, Cliente. Permissões e controle de acesso." },
};

// ── Common UI strings ─────────────────────────────────────────
export const UI: Record<string, T6> = {
  loading:         { he: "טוען...",          en: "Loading...",       es: "Cargando...",     de: "Lädt...",          fr: "Chargement...",   pt: "Carregando...",   ru: "Загрузка..."         },
  save:            { he: "שמור",             en: "Save",             es: "Guardar",         de: "Speichern",        fr: "Enregistrer",     pt: "Salvar",          ru: "Сохранить"           },
  cancel:          { he: "ביטול",            en: "Cancel",           es: "Cancelar",        de: "Abbrechen",        fr: "Annuler",         pt: "Cancelar",        ru: "Отмена"              },
  connect:         { he: "חבר",              en: "Connect",          es: "Conectar",        de: "Verbinden",        fr: "Connecter",       pt: "Conectar",        ru: "Подключить"          },
  reconnect:       { he: "חבר מחדש",         en: "Reconnect",        es: "Reconectar",      de: "Neu verbinden",    fr: "Reconnecter",     pt: "Reconectar",      ru: "Переподключить"      },
  disconnect:      { he: "נתק",              en: "Disconnect",       es: "Desconectar",     de: "Trennen",          fr: "Déconnecter",     pt: "Desconectar",     ru: "Отключить"           },
  connected:       { he: "מחובר ✓",          en: "Connected ✓",      es: "Conectado ✓",     de: "Verbunden ✓",      fr: "Connecté ✓",      pt: "Conectado ✓",     ru: "Подключено ✓"        },
  notConnected:    { he: "לא מחובר",         en: "Not Connected",    es: "No conectado",    de: "Nicht verbunden",  fr: "Non connecté",    pt: "Não conectado",   ru: "Не подключено"       },
  logout:          { he: "התנתקות",          en: "Logout",           es: "Cerrar sesión",   de: "Abmelden",         fr: "Déconnexion",     pt: "Sair",            ru: "Выйти"               },
  refresh:         { he: "רענן",             en: "Refresh",          es: "Actualizar",      de: "Aktualisieren",    fr: "Actualiser",      pt: "Atualizar",       ru: "Обновить"            },
  demo:            { he: "דמו",              en: "Demo",             es: "Demo",            de: "Demo",             fr: "Démo",            pt: "Demo",            ru: "Демо"                },
  live:            { he: "חי",               en: "Live",             es: "En vivo",         de: "Live",             fr: "En direct",       pt: "Ao vivo",         ru: "Прямой эфир"         },
  manageConns:     { he: "נהל חיבורים",      en: "Manage",           es: "Gestionar",       de: "Verwalten",        fr: "Gérer",           pt: "Gerenciar",       ru: "Управлять"           },
  connQuality:     { he: "איכות חיבורים",    en: "Connection Quality",es: "Calidad de conexión", de: "Verbindungsqualität", fr: "Qualité de connexion", pt: "Qualidade de conexão", ru: "Качество соединений" },
  ownerPanel:      { he: "פאנל בעלים",       en: "Owner Panel",      es: "Panel de dueño",  de: "Besitzer-Panel",   fr: "Panneau propriétaire", pt: "Painel do proprietário", ru: "Панель владельца"  },
  ownerPanelSub:   { he: "ניהול לקוחות ומנויים", en: "Manage customers & subscriptions", es: "Gestionar clientes y suscripciones", de: "Kunden & Abonnements verwalten", fr: "Gérer clients & abonnements", pt: "Gerenciar clientes e assinaturas", ru: "Управление клиентами и подписками" },
  aiGrowthOS:      { he: "מערכת הצמיחה",    en: "AI Growth OS",     es: "OS de Crecimiento IA", de: "KI-Wachstums-OS",fr: "OS de Croissance IA", pt: "OS de Crescimento IA", ru: "ИИ-система роста"  },
  connectNow:      { he: "חבר עכשיו",        en: "Connect Now",      es: "Conectar ahora",  de: "Jetzt verbinden",  fr: "Connecter maintenant", pt: "Conectar agora", ru: "Подключить сейчас" },
  editConn:        { he: "ערוך חיבור",       en: "Edit Connection",  es: "Editar conexión", de: "Verbindung bearbeiten", fr: "Modifier la connexion", pt: "Editar conexão", ru: "Редактировать"     },
  whatProvides:    { he: "מה חיבור זה מספק", en: "What this connection provides", es: "Qué proporciona esta conexión", de: "Was diese Verbindung bietet", fr: "Ce que cette connexion fournit", pt: "O que esta conexão fornece", ru: "Что даёт это подключение" },
  affects:         { he: "משפיע על",         en: "Affects modules",  es: "Afecta módulos",  de: "Betrifft Module",  fr: "Affecte modules",  pt: "Afeta módulos",   ru: "Влияет на модули"   },
  requiredFields:  { he: "שדות נדרשים",      en: "Required fields",  es: "Campos requeridos", de: "Pflichtfelder", fr: "Champs requis",    pt: "Campos obrigatórios", ru: "Обязательные поля" },
  issues:          { he: "בעיות",            en: "Issues",           es: "Problemas",       de: "Probleme",         fr: "Problèmes",       pt: "Problemas",       ru: "Проблемы"            },
  noIssues:        { he: "אין בעיות — הכל מחובר!", en: "No issues — all connected!", es: "Sin problemas — ¡todo conectado!", de: "Keine Probleme — alles verbunden!", fr: "Aucun problème — tout est connecté!", pt: "Sem problemas — tudo conectado!", ru: "Нет проблем — всё подключено!" },
  connectStore:    { he: "חבר את החנות שלך", en: "Connect your store",es: "Conecta tu tienda", de: "Verbinde deinen Shop", fr: "Connecte ta boutique", pt: "Conecte sua loja", ru: "Подключить магазин" },
  spend:           { he: "הוצאה",            en: "Spend",            es: "Gasto",           de: "Ausgaben",         fr: "Dépenses",        pt: "Gastos",          ru: "Расходы"             },
  revenue:         { he: "הכנסה",            en: "Revenue",          es: "Ingresos",        de: "Einnahmen",        fr: "Revenus",         pt: "Receita",         ru: "Доход"               },
  roas:            { he: "ROAS",             en: "ROAS",             es: "ROAS",            de: "ROAS",             fr: "ROAS",            pt: "ROAS",            ru: "ROAS"                },
  conversions:     { he: "המרות",            en: "Conversions",      es: "Conversiones",    de: "Konversionen",     fr: "Conversions",     pt: "Conversões",      ru: "Конверсии"           },
  more:            { he: "עוד",              en: "More",             es: "Más",             de: "Mehr",             fr: "Plus",            pt: "Mais",            ru: "Ещё"                 },
  aboutModule:     { he: "מידע על המודול",   en: "About this module",es: "Acerca del módulo", de: "Über dieses Modul", fr: "À propos du module", pt: "Sobre este módulo", ru: "О модуле"        },
  close:           { he: "סגור",             en: "Close",            es: "Cerrar",          de: "Schließen",        fr: "Fermer",          pt: "Fechar",          ru: "Закрыть"             },
  myPermissions:   { he: "ההרשאות שלי",      en: "My Permissions",   es: "Mis permisos",    de: "Meine Berechtigungen", fr: "Mes permissions", pt: "Minhas permissões", ru: "Мои разрешения"  },
  role:            { he: "תפקיד",            en: "Role",             es: "Rol",             de: "Rolle",            fr: "Rôle",            pt: "Função",          ru: "Роль"                },
  welcomeTitle:    { he: "ברוך הבא למערכת!",  en: "Welcome to the system!", es: "¡Bienvenido al sistema!", de: "Willkommen im System!", fr: "Bienvenue dans le système!", pt: "Bem-vindo ao sistema!", ru: "Добро пожаловать!" },
  permissionsInfo: { he: "אלו ההרשאות שלך במערכת", en: "These are your system permissions", es: "Estos son tus permisos del sistema", de: "Dies sind Ihre Systemberechtigungen", fr: "Voici vos autorisations système", pt: "Estas são suas permissões no sistema", ru: "Ваши права в системе" },
  canAccess:       { he: "יש לך גישה ל:",    en: "You have access to:", es: "Tienes acceso a:", de: "Sie haben Zugang zu:", fr: "Vous avez accès à:", pt: "Você tem acesso a:", ru: "У вас есть доступ к:" },
  noAccess:        { he: "אין לך גישה ל:",   en: "No access to:",    es: "Sin acceso a:",   de: "Kein Zugang zu:",  fr: "Pas d'accès à:",  pt: "Sem acesso a:",   ru: "Нет доступа к:"      },
  understood:      { he: "הבנתי, נתחיל!",    en: "Got it, let's start!", es: "¡Entendido, empecemos!", de: "Verstanden, los geht's!", fr: "Compris, allons-y!", pt: "Entendi, vamos começar!", ru: "Понятно, начнём!" },
  emailPanelTitle: { he: "הגדרות מייל ארגוני", en: "Organizational Email Settings", es: "Configuración de correo electrónico organizacional", de: "Organisationelle E-Mail-Einstellungen", fr: "Paramètres e-mail organisationnel", pt: "Configurações de e-mail organizacional", ru: "Настройки корпоративной почты" },
  geminiShared:    { he: "Gemini מחובר (שיתוף מהמנהל)", en: "Gemini connected (shared from admin)", es: "Gemini conectado (compartido del administrador)", de: "Gemini verbunden (vom Admin geteilt)", fr: "Gemini connecté (partagé par l'administrateur)", pt: "Gemini conectado (compartilhado pelo administrador)", ru: "Gemini подключён (от администратора)" },
};
