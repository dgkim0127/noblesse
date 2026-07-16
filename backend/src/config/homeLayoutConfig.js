import { validationError } from "../utils/errors.js";

export const homeLayoutLocales = Object.freeze(["kr", "en", "jp", "zh-TW"]);

const localized = (kr, en, jp, zhTw) => ({ kr, en, jp, "zh-TW": zhTw });

export const defaultHomeLayout = Object.freeze({
  version: 1,
  header: {
    showMarquee: true,
    marquee: localized(
      "SILVER 925 & Surgical Piercing & Brass Piercing · 실버 & 써지컬 & 신주 피어싱 · Allergy-conscious materials · Since 2010",
      "SILVER 925 & Surgical Piercing & Brass Piercing · Allergy-conscious materials · Since 2010",
      "SILVER 925 & サージカル & 真鍮ピアス · Allergy-conscious materials · Since 2010",
      "SILVER 925 & 外科鋼 & 黃銅穿孔飾品 · Allergy-conscious materials · Since 2010"
    )
  },
  sections: [
    {
      id: "showcase",
      type: "showcase",
      visible: true,
      title: localized("메인 스냅", "Main showcase", "メインスナップ", "主視覺輪播"),
      note: localized("홈 첫 화면의 이미지 슬라이드입니다.", "The image carousel at the top of the home page.", "ホーム上部の画像スライドです。", "首頁上方的圖片輪播。")
    },
    {
      id: "categories",
      type: "categories",
      visible: true,
      title: localized("카테고리 바로가기", "Category shortcuts", "カテゴリーショートカット", "分類捷徑"),
      note: localized("주요 소재와 모양으로 이동합니다.", "Shortcuts to key materials and shapes.", "主な素材と形に移動します。", "前往主要材質與造型。")
    },
    {
      id: "new-arrival",
      type: "productCollection",
      visible: true,
      title: localized("신상품", "New Arrival", "新商品", "新品"),
      note: localized("새롭게 준비한 신규 라인과 이번 주 추천 아이템입니다.", "New lines and recommended pieces prepared for this week.", "今週のために用意した新しいラインとおすすめアイテムです。", "本週準備的新品系列和推薦單品。"),
      layout: "grid",
      productSource: { rule: "new", limit: 8, pinnedProductIds: [], excludedProductIds: [] }
    },
    {
      id: "weekly-pick",
      type: "productCollection",
      visible: true,
      title: localized("WEEKLY BEST", "Weekly Best", "週間ベスト", "每週精選"),
      note: localized("이번 주 거래처 문의가 모인 스타일을 한눈에 정리했습니다.", "A focused edit of styles drawing buyer inquiries this week.", "今週の取引先お問い合わせが集まったスタイルをまとめました。", "整理本週買家諮詢較多的重點款式。"),
      layout: "feature",
      productSource: { rule: "weekly", limit: 5, pinnedProductIds: [], excludedProductIds: [] }
    },
    {
      id: "buyer-selection",
      type: "buyerBoards",
      visible: true,
      title: localized("바이어 셀렉션", "Buyer Selection", "バイヤーセレクション", "買家精選"),
      note: localized("국내·해외 거래처 상담 흐름에 맞춰 정리한 B2B 컨셉 보드입니다.", "B2B concept boards arranged for domestic and global buyer consultations.", "国内外の取引先相談に合わせて整理したB2Bコンセプトボードです。", "根據國內外客戶洽談流程整理的 B2B 概念看板。"),
      layout: "rail"
    },
    {
      id: "piercing-catalog",
      type: "productCollection",
      visible: true,
      title: localized("피어싱", "Piercing", "ピアス", "穿孔"),
      note: localized("피어싱=귀족, 더이상 말이 필요한가요?", "Piercing = Noblesse. Need we say more?", "ピアス＝貴族。これ以上の説明が必要ですか？", "穿孔 = 貴族，還需要更多說明嗎？"),
      layout: "grid",
      productSource: { rule: "piercing", limit: 8, pinnedProductIds: [], excludedProductIds: [] }
    },
    {
      id: "steady-selection",
      type: "productCollection",
      visible: true,
      title: localized("스테디 셀렉션", "Steady Selection", "定番セレクション", "常青精選"),
      note: localized("꾸준히 찾는 데일리 라인을 모았습니다.", "Daily lines buyers keep coming back for.", "毎日選ばれる定番ラインを集めました。", "匯集買家持續選擇的日常系列。"),
      layout: "grid",
      productSource: { rule: "steady", limit: 8, pinnedProductIds: [], excludedProductIds: [] }
    },
    {
      id: "campaign",
      type: "campaign",
      visible: true,
      eyebrow: localized("B2B QUOTE", "B2B QUOTE", "B2B QUOTE", "B2B QUOTE"),
      title: localized("거래처 맞춤 견적을 요청하세요", "Request a buyer-specific quote", "取引先向け見積をご依頼ください", "申請買家專屬報價"),
      note: localized("수량, 색상, 납기 조건을 확인해 공식 견적을 안내합니다.", "We review quantity, color and lead-time requirements before issuing a formal quote.", "数量、カラー、納期条件を確認して正式なお見積をご案内します。", "確認數量、顏色與交期條件後提供正式報價。"),
      ctaLabel: localized("견적 요청", "Request Quote", "見積依頼", "申請報價"),
      ctaPath: "/register",
      ctaApprovedPath: "/request-quote"
    },
    {
      id: "support",
      type: "support",
      visible: true,
      title: localized("이용 안내", "Buyer support", "ご利用案内", "買家支援"),
      note: localized("최근 본 상품, 상담 안내, 회사 정보를 확인합니다.", "Recently viewed products, buyer support and company information.", "最近見た商品、相談案内、会社情報を確認します。", "查看最近瀏覽、買家支援與公司資訊。")
    }
  ]
});

const defaultsById = new Map(defaultHomeLayout.sections.map((section) => [section.id, section]));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanText(value, maxLength = 300) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw validationError("Home layout text must be a string");
  const text = value.trim();
  if (text.length > maxLength) throw validationError("Home layout text is too long");
  return text;
}

function normalizeLocalized(value, fallback = {}, maxLength = 300) {
  if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) {
    throw validationError("Localized home layout copy must be an object");
  }
  return Object.fromEntries(homeLayoutLocales.map((locale) => [
    locale,
    cleanText(value?.[locale] ?? fallback?.[locale] ?? "", maxLength)
  ]));
}

function normalizePath(value, fallback) {
  const path = cleanText(value ?? fallback, 500);
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw validationError("Home layout links must be internal site paths");
  }
  return path;
}

function normalizeProductSource(value, fallback) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const limit = Number(source.limit ?? fallback.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
    throw validationError("Home product limit must be from 1 to 12");
  }
  const normalizeIds = (items) => {
    if (!Array.isArray(items)) throw validationError("Home product selections must be arrays");
    const ids = items.map((item) => cleanText(item, 120)).filter(Boolean);
    if (ids.length > 24 || new Set(ids).size !== ids.length) {
      throw validationError("Home product selections must contain unique product ids");
    }
    return ids;
  };
  return {
    rule: fallback.rule,
    limit,
    pinnedProductIds: normalizeIds(source.pinnedProductIds ?? fallback.pinnedProductIds),
    excludedProductIds: normalizeIds(source.excludedProductIds ?? fallback.excludedProductIds)
  };
}

function normalizeSection(value, fallback) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const section = {
    id: fallback.id,
    type: fallback.type,
    visible: fallback.id === "showcase" ? true : input.visible !== false,
    title: normalizeLocalized(input.title, fallback.title, 160),
    note: normalizeLocalized(input.note, fallback.note, 400)
  };
  if (fallback.layout) {
    const layouts = fallback.type === "productCollection" ? ["grid", "feature"] : ["rail"];
    section.layout = layouts.includes(input.layout) ? input.layout : fallback.layout;
  }
  if (fallback.productSource) {
    section.productSource = normalizeProductSource(input.productSource, fallback.productSource);
  }
  if (fallback.type === "campaign") {
    section.eyebrow = normalizeLocalized(input.eyebrow, fallback.eyebrow, 80);
    section.ctaLabel = normalizeLocalized(input.ctaLabel, fallback.ctaLabel, 80);
    section.ctaPath = normalizePath(input.ctaPath, fallback.ctaPath);
    section.ctaApprovedPath = normalizePath(input.ctaApprovedPath, fallback.ctaApprovedPath);
  }
  return section;
}

export function normalizeHomeLayout(value = {}) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const providedSections = Array.isArray(input.sections) ? input.sections : [];
  const unknown = providedSections.find((section) => !defaultsById.has(section?.id));
  if (unknown) throw validationError("Unknown home layout section");
  const duplicateIds = providedSections.map((section) => section?.id).filter(Boolean);
  if (new Set(duplicateIds).size !== duplicateIds.length) {
    throw validationError("Home layout section ids must be unique");
  }
  const providedById = new Map(providedSections.map((section) => [section.id, section]));
  const orderedIds = [
    ...providedSections.map((section) => section.id),
    ...defaultHomeLayout.sections.map((section) => section.id).filter((id) => !providedById.has(id))
  ];
  const sections = orderedIds.map((id) => normalizeSection(providedById.get(id), defaultsById.get(id)));
  const showcaseIndex = sections.findIndex((section) => section.id === "showcase");
  if (showcaseIndex > 0) sections.unshift(sections.splice(showcaseIndex, 1)[0]);
  return {
    version: 1,
    header: {
      showMarquee: input.header?.showMarquee !== false,
      marquee: normalizeLocalized(input.header?.marquee, defaultHomeLayout.header.marquee, 240)
    },
    sections
  };
}

export function getHomeLayoutCompletion(config) {
  const layout = normalizeHomeLayout(config);
  const missing = [];
  if (layout.header.showMarquee) {
    for (const locale of homeLayoutLocales) {
      if (!layout.header.marquee[locale]) missing.push(`header.marquee.${locale}`);
    }
  }
  for (const section of layout.sections.filter((item) => item.visible && item.id !== "showcase")) {
    for (const locale of homeLayoutLocales) {
      if (!section.title?.[locale]) missing.push(`${section.id}.title.${locale}`);
      if (!section.note?.[locale]) missing.push(`${section.id}.note.${locale}`);
      if (section.type === "campaign" && !section.ctaLabel?.[locale]) {
        missing.push(`${section.id}.ctaLabel.${locale}`);
      }
    }
  }
  return { isPublishable: missing.length === 0, missing };
}

export function cloneDefaultHomeLayout() {
  return clone(defaultHomeLayout);
}
