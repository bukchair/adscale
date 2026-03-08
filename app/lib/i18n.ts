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
  performance: { he: "ביצועים",    en: "Performance", es: "Rendimiento",   de: "Leistung",      fr: "Performance",  pt: "Desempenho",    ru: "Эффективность" },
  campaigns:   { he: "קמפיינים",   en: "Campaigns",   es: "Campañas",      de: "Kampagnen",     fr: "Campagnes",    pt: "Campanhas",     ru: "Кампании"      },
  growth:      { he: "צמיחה",      en: "Growth",      es: "Crecimiento",   de: "Wachstum",      fr: "Croissance",   pt: "Crescimento",   ru: "Рост"          },
  manage:      { he: "ניהול",      en: "Manage",      es: "Gestión",       de: "Verwaltung",    fr: "Gestion",      pt: "Gestão",        ru: "Управление"    },
};

// ── Module names ──────────────────────────────────────────────
export const MODULE_NAMES: Record<string, T6> = {
  overview:           { he: "סקירה כללית",    en: "Overview",           es: "Resumen",          de: "Übersicht",         fr: "Aperçu",              pt: "Visão Geral",           ru: "Обзор"                },
  profitability:      { he: "רווחיות",        en: "Profitability",      es: "Rentabilidad",     de: "Rentabilität",      fr: "Rentabilité",         pt: "Rentabilidade",         ru: "Рентабельность"       },
  budget:             { he: "ניהול תקציב",    en: "Budget Control",     es: "Control Presupuesto", de: "Budgetkontrolle", fr: "Contrôle Budget",     pt: "Controle Orçamento",    ru: "Управление бюджетом"  },
  recommendations:    { he: "המלצות AI",      en: "AI Recommendations", es: "Recomendaciones IA", de: "KI-Empfehlungen", fr: "Recommandations IA",  pt: "Recomendações IA",      ru: "Рекомендации ИИ"      },
  "search-terms":     { he: "ניתוח חיפושים",  en: "Search Intelligence",es: "Inteligencia Búsqueda", de: "Suchanalyse",  fr: "Intelligence Recherche", pt: "Inteligência Busca", ru: "Анализ поиска"        },
  "negative-keywords":{ he: "מילות שליליות",  en: "Negative Keywords",  es: "Palabras Negativas", de: "Negative Keywords", fr: "Mots-clés Négatifs",  pt: "Palavras Negativas",    ru: "Минус-слова"          },
  seo:                { he: "מרכז SEO / GEO", en: "SEO / GEO Center",   es: "Centro SEO/GEO",   de: "SEO/GEO Zentrum",   fr: "Centre SEO/GEO",      pt: "Centro SEO/GEO",        ru: "Центр SEO / GEO"      },
  products:           { he: "מוצרים",         en: "Products",           es: "Productos",        de: "Produkte",          fr: "Produits",            pt: "Produtos",              ru: "Товары"               },
  audiences:          { he: "קהלים",          en: "Audiences",          es: "Audiencias",       de: "Zielgruppen",       fr: "Audiences",           pt: "Públicos",              ru: "Аудитории"            },
  "creative-lab":     { he: "מעבדת יצירה",    en: "Creative Lab",       es: "Lab. Creativo",    de: "Kreativlabor",      fr: "Atelier Créatif",     pt: "Lab. Criativo",         ru: "Творческая лаборатория"},
  "financial-reports":{ he: "דוחות כספיים",   en: "Financial Reports",  es: "Informes Financieros", de: "Finanzberichte", fr: "Rapports Financiers", pt: "Relatórios Financeiros",ru: "Финансовые отчёты"    },
  approvals:          { he: "אישורים",        en: "Approvals",          es: "Aprobaciones",     de: "Genehmigungen",     fr: "Approbations",        pt: "Aprovações",            ru: "Согласования"         },
  automation:         { he: "אוטומציה",       en: "Automation",         es: "Automatización",   de: "Automatisierung",   fr: "Automatisation",      pt: "Automação",             ru: "Автоматизация"        },
  "audit-log":        { he: "יומן פעולות",    en: "Audit Log",          es: "Registro Auditoría", de: "Audit-Log",       fr: "Journal d'Audit",     pt: "Log de Auditoria",      ru: "Журнал действий"      },
  integrations:       { he: "חיבורים",        en: "Integrations",       es: "Integraciones",    de: "Integrationen",     fr: "Intégrations",        pt: "Integrações",           ru: "Интеграции"           },
  users:              { he: "משתמשים",        en: "Users & Roles",      es: "Usuarios y Roles", de: "Benutzer & Rollen", fr: "Utilisateurs & Rôles",pt: "Usuários e Funções",    ru: "Пользователи и роли"  },
};

// ── Module info descriptions ──────────────────────────────────
export const MODULE_INFO: Record<string, T6> = {
  overview:           { he: "תצוגת ביצועים כוללת — הוצאות, הכנסות, ROAS ומגמות צמיחה מכל הפלטפורמות שלך.", en: "Complete performance overview — spend, revenue, ROAS and growth trends from all your platforms.", es: "Vista general completa — gastos, ingresos, ROAS y tendencias de crecimiento de todas tus plataformas.", de: "Vollständige Leistungsübersicht — Ausgaben, Einnahmen, ROAS und Wachstumstrends von all Ihren Plattformen.", fr: "Vue d'ensemble complète — dépenses, revenus, ROAS et tendances de croissance de toutes vos plateformes.", pt: "Visão geral completa — gastos, receitas, ROAS e tendências de crescimento de todas as suas plataformas." },
  profitability:      { he: "רואה רווח אמיתי לכל קמפיין — אחרי עלויות מוצר ומשלוח. יודע בדיוק אם הפרסום שלך מכניס כסף.", en: "See real profit per campaign — after product costs and shipping. Know exactly if your ads make money.", es: "Ve las ganancias reales por campaña — después de costos de producto y envío. Sabe si tus anuncios generan dinero.", de: "Echter Gewinn pro Kampagne — nach Produkt- und Versandkosten. Wissen Sie genau, ob Ihre Werbung Geld einbringt.", fr: "Profit réel par campagne — après coûts produits et livraison. Sachez exactement si vos publicités rapportent de l'argent.", pt: "Lucro real por campanha — após custos de produto e envio. Saiba exatamente se seus anúncios geram dinheiro." },
  budget:             { he: "שולט על קצב ההוצאה היומי. AI מזהה כשתקציב רץ מהר מדי או לאט מדי ומציע התאמות.", en: "Control your daily spending pace. AI detects when a budget runs too fast or slow and suggests adjustments.", es: "Controla el ritmo de gasto diario. La IA detecta cuándo el presupuesto corre demasiado rápido o lento y sugiere ajustes.", de: "Kontrollieren Sie Ihr tägliches Ausgabentempo. KI erkennt Budgetprobleme und schlägt Anpassungen vor.", fr: "Contrôlez votre rythme de dépenses. L'IA détecte quand un budget va trop vite ou trop lentement et suggère des ajustements.", pt: "Controle o ritmo de gastos diários. A IA detecta quando o orçamento está com problemas e sugere ajustes." },
  recommendations:    { he: "המלצות AI — מה להקפיא, מה להגביר, מה לנסות אחרת. כל המלצה מוסברת בבירור.", en: "AI recommendations — what to pause, scale, or try differently. Every recommendation is clearly explained.", es: "Recomendaciones de IA — qué pausar, escalar o intentar de manera diferente. Cada recomendación se explica claramente.", de: "KI-Empfehlungen — was zu pausieren, skalieren oder anders zu versuchen. Jede Empfehlung wird klar erklärt.", fr: "Recommandations IA — quoi mettre en pause, augmenter ou essayer différemment. Chaque recommandation est clairement expliquée.", pt: "Recomendações de IA — o que pausar, escalar ou tentar diferente. Cada recomendação é claramente explicada." },
  "search-terms":     { he: "מנתח כל ביטוי חיפוש שהפעיל את המודעות שלך. מזהה בזבוז תקציב ומציע מילים שליליות.", en: "Analyzes every search term that triggered your ads. Identifies budget waste and suggests negative keywords.", es: "Analiza cada término de búsqueda que activó tus anuncios. Identifica el desperdicio de presupuesto.", de: "Analysiert jeden Suchbegriff, der Ihre Anzeigen ausgelöst hat. Identifiziert Budgetverschwendung.", fr: "Analyse chaque terme de recherche qui a déclenché vos annonces. Identifie le gaspillage de budget.", pt: "Analisa cada termo de pesquisa que acionou seus anúncios. Identifica desperdício de orçamento." },
  "negative-keywords":{ he: "ניהול מילות שלילי — חוסמות חיפושים לא רלוונטיים שאוכלים תקציב. AI מציע ואתה מאשר.", en: "Manage negative keywords — block irrelevant searches eating your budget. AI suggests and you approve.", es: "Gestiona palabras clave negativas — bloquea búsquedas irrelevantes que consumen tu presupuesto.", de: "Negative Keywords verwalten — irrelevante Suchen blockieren, die Ihr Budget fressen.", fr: "Gérez les mots-clés négatifs — bloquez les recherches non pertinentes qui consomment votre budget.", pt: "Gerencie palavras-chave negativas — bloqueie pesquisas irrelevantes que consomem seu orçamento." },
  seo:                { he: "סורק את חנות ה-WooCommerce שלך ומוצא בעיות SEO — כותרות קצרות, תיאורים חסרים, alt text חסר.", en: "Scans your WooCommerce store and finds SEO issues — short titles, missing descriptions, missing alt text.", es: "Escanea tu tienda WooCommerce y encuentra problemas de SEO — títulos cortos, descripciones faltantes.", de: "Scannt Ihren WooCommerce-Store und findet SEO-Probleme — kurze Titel, fehlende Beschreibungen.", fr: "Scanne votre boutique WooCommerce et trouve des problèmes SEO — titres courts, descriptions manquantes.", pt: "Escaneia sua loja WooCommerce e encontra problemas de SEO — títulos curtos, descrições ausentes." },
  products:           { he: "רואה את כל המוצרים מהחנות שלך — מחירים, מלאי וביצועים. מחבר נתוני מכירות לביצועי פרסום.", en: "See all products from your store — prices, inventory, performance. Connects sales data to ad performance.", es: "Ve todos los productos de tu tienda — precios, inventario, rendimiento. Conecta ventas con anuncios.", de: "Sehen Sie alle Produkte aus Ihrem Shop — Preise, Inventar, Leistung. Verbindet Verkaufsdaten mit Anzeigenleistung.", fr: "Voyez tous les produits de votre boutique — prix, inventaire, performances. Connecte ventes et publicités.", pt: "Veja todos os produtos da sua loja — preços, estoque, desempenho. Conecta vendas com anúncios." },
  audiences:          { he: "בונה קהלים ממוקדים לפרסום — לפי התנהגות, רכישות ומיקום. מסנכרן עם Google ו-Meta.", en: "Build targeted audiences for advertising — based on behavior, purchases and location. Syncs with Google and Meta.", es: "Crea audiencias segmentadas para publicidad — según comportamiento, compras y ubicación.", de: "Erstellen Sie zielgerichtete Zielgruppen — basierend auf Verhalten, Käufen und Standort.", fr: "Créez des audiences ciblées — basées sur le comportement, les achats et la localisation.", pt: "Crie públicos segmentados — com base em comportamento, compras e localização." },
  "creative-lab":     { he: "מייצר מודעות עם AI — טקסט ותמונות עם Gemini. בחר מוצר, פלטפורמה וסגנון — AI כותב ומייצר עבורך.", en: "Generate ads with AI — text and images with Gemini. Choose a product, platform and style — AI writes and creates for you.", es: "Genera anuncios con IA Gemini — texto e imágenes. Elige un producto, plataforma y estilo.", de: "Generieren Sie Anzeigen mit KI — Text und Bilder mit Gemini. Wählen Sie Produkt, Plattform und Stil.", fr: "Générez des publicités avec l'IA Gemini — texte et images. Choisissez un produit, une plateforme et un style.", pt: "Gere anúncios com IA Gemini — texto e imagens. Escolha um produto, plataforma e estilo." },
  "financial-reports":{ he: "דוחות כספיים מלאים — הכנסות, הוצאות, רווח. ייצוא ל-Excel ושליחה למייל אוטומטי.", en: "Full financial reports — revenue, expenses, profit. Export to Excel and send by email automatically.", es: "Informes financieros completos — ingresos, gastos, ganancias. Exporta a Excel y envía por correo.", de: "Vollständige Finanzberichte — Einnahmen, Ausgaben, Gewinn. Export nach Excel und per E-Mail senden.", fr: "Rapports financiers complets — revenus, dépenses, bénéfices. Exportez vers Excel et envoyez par e-mail.", pt: "Relatórios financeiros completos — receitas, despesas, lucro. Exporte para Excel e envie por e-mail." },
  approvals:          { he: "תור לאישור פעולות AI — לפני שהמערכת מבצעת שינויים בקמפיינים, תוכל לאשר או לדחות.", en: "Approval queue for AI actions — before the system makes campaign changes, you can approve or reject.", es: "Cola de aprobación para acciones de IA — antes de que el sistema haga cambios, puedes aprobar o rechazar.", de: "Genehmigungswarteschlange für KI-Aktionen — bevor das System Änderungen vornimmt, können Sie genehmigen.", fr: "File d'approbation — avant que le système ne modifie les campagnes, vous pouvez approuver ou rejeter.", pt: "Fila de aprovação — antes de o sistema fazer alterações nas campanhas, você pode aprovar ou rejeitar." },
  automation:         { he: "הגדר כללים אוטומטיים — 'אם ROAS ירד מתחת ל-X, הפסק קמפיין'. AI מבצע פעולות ללא התערבות ידנית.", en: "Set automation rules — 'If ROAS drops below X, pause campaign'. AI executes actions without manual intervention.", es: "Establece reglas de automatización — 'Si el ROAS baja de X, pausa la campaña'. La IA actúa automáticamente.", de: "Automatisierungsregeln — 'Wenn ROAS unter X fällt, Kampagne pausieren'. KI handelt automatisch.", fr: "Règles d'automatisation — 'Si le ROAS tombe sous X, mettre en pause'. L'IA agit automatiquement.", pt: "Regras de automação — 'Se o ROAS cair abaixo de X, pausar campanha'. A IA age automaticamente." },
  "audit-log":        { he: "יומן של כל הפעולות במערכת — מי שינה מה ומתי. שקיפות מלאה לכל הצוות.", en: "Log of all system actions — who changed what and when. Full transparency for the entire team.", es: "Registro de todas las acciones del sistema — quién cambió qué y cuándo. Transparencia total.", de: "Protokoll aller Systemaktionen — wer was wann geändert hat. Volle Transparenz für das gesamte Team.", fr: "Journal de toutes les actions — qui a changé quoi et quand. Transparence totale pour toute l'équipe.", pt: "Registro de todas as ações — quem mudou o quê e quando. Transparência total para toda a equipe." },
  integrations:       { he: "חבר את כל הפלטפורמות — Google, Meta, TikTok, WooCommerce, Analytics ועוד. כאן מתחיל הכל.", en: "Connect all your platforms — Google, Meta, TikTok, WooCommerce, Analytics and more. This is where it all starts.", es: "Conecta todas tus plataformas — Google, Meta, TikTok, WooCommerce, Analytics y más.", de: "Verbinden Sie alle Plattformen — Google, Meta, TikTok, WooCommerce, Analytics und mehr.", fr: "Connectez toutes vos plateformes — Google, Meta, TikTok, WooCommerce, Analytics et plus.", pt: "Conecte todas as plataformas — Google, Meta, TikTok, WooCommerce, Analytics e mais." },
  users:              { he: "ניהול משתמשים וצוות — הוסף חברי צוות, הגדר הרשאות ושלוט במי רואה מה.", en: "Manage users and team — add team members, set permissions and control who sees what.", es: "Gestiona usuarios y equipo — agrega miembros, establece permisos y controla quién ve qué.", de: "Benutzer und Team verwalten — Mitglieder hinzufügen, Berechtigungen festlegen.", fr: "Gérez les utilisateurs — ajoutez des membres, définissez les autorisations et contrôlez qui voit quoi.", pt: "Gerencie usuários — adicione membros, defina permissões e controle quem vê o quê." },
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
