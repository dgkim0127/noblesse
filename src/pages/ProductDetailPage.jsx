import {
  ChevronLeft,
  ChevronRight,
  Images,
  LockKeyhole,
  Minus,
  Pencil,
  Plus,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { ProductDetailBlocks } from '../components/ProductDetailBlocks'
import { getInquiryKey, getInquiryRoutePath } from '../commerce/inquiryKeys'
import { useCommerce } from '../commerce/commerceStore'
import { formatAdminPriceBook } from '../config/currency'
import { formatMoney } from '../utils/commerce'
import {
  getLocalizedProductAlt,
  getLocalizedProductDetailContent,
  getLocalizedProductDescription,
  getLocalizedProductName,
  useLocalePath,
} from '../utils/locale'
import { imagePresentationStyle, productGalleryEntries } from '../utils/productImageGallery'
import {
  getEffectiveProductOptionGroups,
  getLegacySelectionFromSnapshots,
  getLocalizedOptionLabel,
  getMissingRequiredProductOptions,
  getSelectedOptionSnapshots,
  selectedOptionPairs,
} from '../utils/productOptions'

const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

const detailCopy = {
  kr: {
    addToInquiry: '견적 리스트에 담기',
    adminPriceBooks: '관리자 가격표',
    approvalRequired: '로그인 후 가격 확인 가능',
    assuranceAssetsBody: '상세 이미지와 등록 사양을 기준으로 견적 검토를 진행합니다.',
    assuranceAssetsTitle: '바이어 자료',
    assuranceMarketBody: '국내와 해외 B2B 거래 검토를 위한 카탈로그 상품입니다.',
    assuranceMarketTitle: '거래 검토 가능',
    assuranceMoqBody: '로그인한 거래처에게 MOQ와 가격 기준을 안내합니다.',
    assuranceMoqTitle: '거래처 MOQ 안내',
    assuranceQcBody: '출고 전 상품 상태와 사양은 견적 단계에서 다시 확인합니다.',
    assuranceQcTitle: '사양 확인',
    available: '가능',
    back: '상품 목록으로',
    badgesExportReady: 'EXPORT READY',
    badgesNew: 'NEW',
    buyerOnly: '로그인한 거래처는 가격과 MOQ를 확인할 수 있습니다.',
    buyerPoint: '바이어 포인트',
    buyerPointBodyOne: '소재, 색상, 사이즈 정보를 견적 요청 전에 한 화면에서 확인합니다.',
    buyerPointBodyThree: '선택 옵션과 수량은 견적 리스트에서 다시 조정할 수 있습니다.',
    buyerPointBodyTwo: '로그인한 거래처에게 가격과 MOQ 기준을 노출합니다.',
    buyerPointTitleOne: '간단한 검토',
    buyerPointTitleThree: '견적 흐름 유지',
    buyerPointTitleTwo: '거래처 가격',
    category: '카테고리',
    categoryProducts: '같은 분류의 상품',
    categoryView: '카테고리 보기',
    color: '색상',
    colors: '색상',
    description: '상품 설명',
    emptyRelated: '같은 분류에 표시할 상품이 아직 없습니다.',
    exportAvailability: '수출 가능 여부',
    gallery: '상품 이미지',
    guide: '안내',
    leadTime: '리드타임',
    material: '소재',
    materialGuide: '소재 안내',
    materialHeadline: '소재 기준을 명확하게 안내합니다.',
    materialGuideText: (material) => `${material} 기준으로 등록된 상품입니다. 도금, 마감, 라벨 기준은 견적 확인 단계에서 담당자와 다시 확인해 주세요.`,
    moq: 'MOQ',
    moqAfterReview: '로그인 후 안내',
    noImage: '등록된 상품 이미지가 없습니다.',
    notFound: '상품을 찾을 수 없습니다.',
    origin: '원산지',
    priceUnavailable: '등록된 거래처 가격이 없습니다.',
    productCode: '상품 코드',
    productInfo: '상품 정보',
    quantity: '수량',
    quantityNote: (moq) => `수량은 MOQ 단위로 조정됩니다. 기준 단위: ${moq} pcs`,
    quoteNotice: '견적 안내',
    quoteStepConfirm: '조건 확정',
    quoteStepConfirmBody: '최종 조건은 담당자 확인 후 안내됩니다.',
    quoteStepReceive: '기준 확인',
    quoteStepReceiveBody: '가격, 재고, 납기, 포장 조건을 확인합니다.',
    quoteStepSelect: '상품 선택',
    quoteStepSelectBody: '색상, 사이즈, 수량을 선택해 견적 검토를 요청합니다.',
    quoteWorkflow: '견적 진행 방식',
    quoteWorkflowLead: '이 페이지는 B2B 견적 요청을 위한 상품 검토 도구입니다.',
    quoteNoticeText: '견적 요청은 최종 거래 확정이 아닙니다. Noblesse가 재고, 납기, 공급 조건을 확인한 뒤 최종 견적 기준을 안내합니다.',
    requestAccess: '거래처 등록 또는 로그인',
    reviewStatus: '계정 상태 보기',
    selectedImage: '선택된 이미지',
    shippingNotice: '출고 안내',
    shippingNoticeText: '출고 일정, 포장, 교환 가능 여부는 견적 검토 이후 상품 상태와 거래 조건에 따라 별도 안내됩니다.',
    size: '사이즈',
    sizeGuide: '사이즈 가이드',
    sizeGuideText: '피어싱 사이즈와 착용감은 디자인과 측정 방식에 따라 달라질 수 있습니다. 견적 요청 전 상세 규격을 확인해 주세요.',
    sizes: '사이즈',
    specification: '상세 사양',
    specificationIntro: '견적 검토에는 장식 문구보다 등록된 구조화 사양을 사용합니다.',
    sectionDelivery: '출고 안내',
    sectionMaterial: '소재 안내',
    sectionOverview: '개요',
    sectionSpecification: '상세 사양',
    quietDetailEyebrow: 'THE QUIET DETAIL',
    quietDetailHeadline: '작은 피어싱도 한눈에 검토할 수 있게 정리했습니다.',
    quietDetailLead: '이미지, 소재, 옵션, 견적 안내를 분리해 바이어가 필요한 정보를 빠르게 확인할 수 있습니다.',
    statusGuest: '거래처 계정으로 로그인하면 가격과 견적 기능을 사용할 수 있습니다.',
    statusPending: '거래처 계정 상태를 확인해주세요.',
    thumbnail: '썸네일',
    unavailable: '불가',
    viewLarge: '큰 이미지 보기',
    wholesale: '도매 기준',
  },
  en: {
    addToInquiry: 'Add to Inquiry List',
    adminPriceBooks: 'Admin price books',
    approvalRequired: 'Price available after sign-in',
    assuranceAssetsBody: 'Detail images and registered specifications support quote review.',
    assuranceAssetsTitle: 'Buyer assets',
    assuranceMarketBody: 'Catalog-ready for domestic and overseas B2B review.',
    assuranceMarketTitle: 'Market ready',
    assuranceMoqBody: 'MOQ and price basis are shared with signed-in buyers.',
    assuranceMoqTitle: 'Buyer MOQ',
    assuranceQcBody: 'Product condition and specifications are checked again during quote review.',
    assuranceQcTitle: 'Spec check',
    available: 'Available',
    back: 'Back to products',
    badgesExportReady: 'EXPORT READY',
    badgesNew: 'NEW',
    buyerOnly: 'Signed-in buyers can view price and MOQ.',
    buyerPoint: 'Buyer point',
    buyerPointBodyOne: 'Review material, color, and size information before requesting a quote.',
    buyerPointBodyThree: 'Selected options and quantity can be adjusted again in the Inquiry List.',
    buyerPointBodyTwo: 'Price and MOQ are shown to signed-in buyers.',
    buyerPointTitleOne: 'Easy review',
    buyerPointTitleThree: 'Quote-first flow',
    buyerPointTitleTwo: 'Buyer price',
    category: 'Category',
    categoryProducts: 'More in this category',
    categoryView: 'View category',
    color: 'Color',
    colors: 'Colors',
    description: 'Product information',
    emptyRelated: 'More products from this category will appear here.',
    exportAvailability: 'Export availability',
    gallery: 'Product images',
    guide: 'Guide',
    leadTime: 'Lead time',
    material: 'Material',
    materialGuide: 'Material guide',
    materialHeadline: 'Material standards, clearly stated.',
    materialGuideText: (material) => `This product is registered with ${material}. Finish, plating, and destination labeling requirements should be confirmed during quote review.`,
    moq: 'MOQ',
    moqAfterReview: 'Shared after sign-in',
    noImage: 'No product image is registered.',
    notFound: 'Product not found.',
    origin: 'Origin',
    priceUnavailable: 'Buyer price is not registered.',
    productCode: 'Product code',
    productInfo: 'Product info',
    quantity: 'Quantity',
    quantityNote: (moq) => `Quantity is adjusted by MOQ units. Unit: ${moq} pcs`,
    quoteNotice: 'Quote notice',
    quoteStepConfirm: 'Confirm terms',
    quoteStepConfirmBody: 'Final terms are guided after staff review.',
    quoteStepReceive: 'Review basis',
    quoteStepReceiveBody: 'Price, stock, lead time, and packaging terms are checked.',
    quoteStepSelect: 'Select items',
    quoteStepSelectBody: 'Select finish, size, and quantity to request quote review.',
    quoteWorkflow: 'Quote workflow',
    quoteWorkflowLead: 'This page is a B2B quote-request product review tool.',
    quoteNoticeText: 'A Request Quote is not a final trade confirmation. Noblesse reviews stock, lead time, and trade terms before sending the final quote basis.',
    requestAccess: 'Register or sign in',
    reviewStatus: 'View account status',
    selectedImage: 'Selected image',
    shippingNotice: 'Dispatch notice',
    shippingNoticeText: 'Dispatch schedule, packaging, and exchange availability are guided after quote review based on product status and trade terms.',
    size: 'Size',
    sizeGuide: 'Size guide',
    sizeGuideText: 'Piercing size and fit can vary by design and measurement method. Please check the registered specification before requesting a quote.',
    sizes: 'Sizes',
    specification: 'Specification',
    specificationIntro: 'Use structured data rather than decorative copy for quote decisions.',
    sectionDelivery: 'Delivery',
    sectionMaterial: 'Material guide',
    sectionOverview: 'Overview',
    sectionSpecification: 'Specification',
    quietDetailEyebrow: 'THE QUIET DETAIL',
    quietDetailHeadline: 'A compact product, organized for quick buyer review.',
    quietDetailLead: 'Images, material, options, and quote guidance are separated so buyers can scan what matters.',
    statusGuest: 'Register or sign in with a buyer account to use prices and quote tools.',
    statusPending: 'Please check your buyer account status.',
    thumbnail: 'thumbnail',
    unavailable: 'Unavailable',
    viewLarge: 'View large image',
    wholesale: 'Wholesale basis',
  },
  jp: {
    addToInquiry: '見積リストに追加',
    adminPriceBooks: '管理者価格表',
    approvalRequired: 'ログイン後に価格を確認できます',
    assuranceAssetsBody: '詳細画像と登録仕様をもとに見積確認を進めます。',
    assuranceAssetsTitle: 'バイヤー資料',
    assuranceMarketBody: '国内外B2B取引の検討に対応するカタログ商品です。',
    assuranceMarketTitle: '取引検討可能',
    assuranceMoqBody: 'MOQと価格基準はログインした取引先に案内されます。',
    assuranceMoqTitle: '取引先MOQ案内',
    assuranceQcBody: '出荷前の商品状態と仕様は見積段階で再確認します。',
    assuranceQcTitle: '仕様確認',
    available: '可能',
    back: '商品一覧へ戻る',
    badgesExportReady: 'EXPORT READY',
    badgesNew: 'NEW',
    buyerOnly: 'ログインした取引先は価格とMOQを確認できます。',
    buyerPoint: 'バイヤーポイント',
    buyerPointBodyOne: '素材、カラー、サイズ情報を見積依頼前に確認できます。',
    buyerPointBodyThree: '選択したオプションと数量は見積リストで再調整できます。',
    buyerPointBodyTwo: '価格とMOQはログインした取引先に表示されます。',
    buyerPointTitleOne: '確認しやすい構成',
    buyerPointTitleThree: '見積中心の流れ',
    buyerPointTitleTwo: '取引先価格',
    category: 'カテゴリー',
    categoryProducts: '同じカテゴリーの商品',
    categoryView: 'カテゴリーを見る',
    color: 'カラー',
    colors: 'カラー',
    description: '商品情報',
    emptyRelated: '同じカテゴリーの商品が追加されるとここに表示されます。',
    exportAvailability: '輸出対応',
    gallery: '商品画像',
    guide: '案内',
    leadTime: 'リードタイム',
    material: '素材',
    materialGuide: '素材ガイド',
    materialHeadline: '素材基準を明確に案内します。',
    materialGuideText: (material) => `この商品は${material}として登録されています。仕上げ、メッキ、販売国の表示条件は見積確認時に担当者へご確認ください。`,
    moq: 'MOQ',
    moqAfterReview: 'ログイン後に案内',
    noImage: '登録された商品画像がありません。',
    notFound: '商品が見つかりません。',
    origin: '原産地',
    priceUnavailable: '取引先価格が登録されていません。',
    productCode: '商品コード',
    productInfo: '商品情報',
    quantity: '数量',
    quantityNote: (moq) => `数量はMOQ単位で調整されます。基準単位: ${moq} pcs`,
    quoteNotice: '見積案内',
    quoteStepConfirm: '条件確定',
    quoteStepConfirmBody: '最終条件は担当者確認後に案内されます。',
    quoteStepReceive: '基準確認',
    quoteStepReceiveBody: '価格、在庫、納期、包装条件を確認します。',
    quoteStepSelect: '商品選択',
    quoteStepSelectBody: 'カラー、サイズ、数量を選択して見積確認を依頼します。',
    quoteWorkflow: '見積の流れ',
    quoteWorkflowLead: 'このページはB2B見積依頼のための商品確認ツールです。',
    quoteNoticeText: '見積依頼は最終注文や決済ではありません。Noblesseが在庫、納期、取引条件を確認したうえで最終見積基準を案内します。',
    requestAccess: '取引先登録またはログイン',
    reviewStatus: 'アカウント状態を見る',
    selectedImage: '選択中の画像',
    shippingNotice: '出荷案内',
    shippingNoticeText: '出荷予定、梱包、交換可否は見積確認後、商品状態と取引条件に基づいて別途案内されます。',
    size: 'サイズ',
    sizeGuide: 'サイズガイド',
    sizeGuideText: 'ピアスのサイズや着用感はデザインと測定方法により異なる場合があります。見積依頼前に登録仕様をご確認ください。',
    sizes: 'サイズ',
    specification: '詳細仕様',
    specificationIntro: '見積判断には装飾的なコピーより登録済みの構造化仕様を使用します。',
    sectionDelivery: '出荷案内',
    sectionMaterial: '素材ガイド',
    sectionOverview: '概要',
    sectionSpecification: '詳細仕様',
    quietDetailEyebrow: 'THE QUIET DETAIL',
    quietDetailHeadline: '小さなピアスも一目で確認できるよう整理しました。',
    quietDetailLead: '画像、素材、オプション、見積案内を分けて、必要な情報をすばやく確認できます。',
    statusGuest: '取引先アカウントでログインすると、価格と見積機能を利用できます。',
    statusPending: '取引先アカウントの状態をご確認ください。',
    thumbnail: 'サムネイル',
    unavailable: '不可',
    viewLarge: '大きい画像を見る',
    wholesale: '卸取引基準',
  },
  cn: {
    addToInquiry: '加入詢價清單',
    adminPriceBooks: '管理員價格表',
    approvalRequired: '登入後可查看價格',
    assuranceAssetsBody: '以詳細圖片與登錄規格作為詢價審核依據。',
    assuranceAssetsTitle: '買家資料',
    assuranceMarketBody: '適用於台灣與海外 B2B 交易審核的型錄商品。',
    assuranceMarketTitle: '可供交易審核',
    assuranceMoqBody: 'MOQ 與價格基準提供給已登入買家。',
    assuranceMoqTitle: '買家 MOQ',
    assuranceQcBody: '出貨前會於詢價階段再次確認商品狀態與規格。',
    assuranceQcTitle: '規格確認',
    available: '可支援',
    back: '返回商品列表',
    badgesExportReady: 'EXPORT READY',
    badgesNew: 'NEW',
    buyerOnly: '已登入買家可以查看價格與 MOQ。',
    buyerPoint: '買家重點',
    buyerPointBodyOne: '詢價前可集中確認材質、顏色與尺寸資訊。',
    buyerPointBodyThree: '選擇的選項與數量可在詢價清單中再次調整。',
    buyerPointBodyTwo: '價格與 MOQ 對已登入買家顯示。',
    buyerPointTitleOne: '容易檢視',
    buyerPointTitleThree: '以詢價為中心',
    buyerPointTitleTwo: '買家價格',
    category: '分類',
    categoryProducts: '同分類商品',
    categoryView: '查看分類',
    color: '顏色',
    colors: '顏色',
    description: '商品資訊',
    emptyRelated: '同分類商品新增後會顯示在這裡。',
    exportAvailability: '出口支援',
    gallery: '商品圖片',
    guide: '說明',
    leadTime: '交期',
    material: '材質',
    materialGuide: '材質說明',
    materialHeadline: '清楚說明材質基準。',
    materialGuideText: (material) => `此商品以 ${material} 登錄。電鍍、表面處理與目的市場標示要求，請於詢價確認時與負責人再次確認。`,
    moq: 'MOQ',
    moqAfterReview: '登入後提供',
    noImage: '尚未登錄商品圖片。',
    notFound: '找不到商品。',
    origin: '產地',
    priceUnavailable: '尚未登錄買家價格。',
    productCode: '商品代碼',
    productInfo: '商品資訊',
    quantity: '數量',
    quantityNote: (moq) => `數量會依 MOQ 單位調整。基準單位：${moq} pcs`,
    quoteNotice: '詢價說明',
    quoteStepConfirm: '確認條件',
    quoteStepConfirmBody: '最終條件由負責人確認後提供。',
    quoteStepReceive: '確認基準',
    quoteStepReceiveBody: '確認價格、庫存、交期與包裝條件。',
    quoteStepSelect: '選擇商品',
    quoteStepSelectBody: '選擇顏色、尺寸與數量後請求詢價審核。',
    quoteWorkflow: '詢價流程',
    quoteWorkflowLead: '本頁是 B2B 詢價商品檢視工具。',
    quoteNoticeText: '詢價請求不是最終訂單或付款。Noblesse 會確認庫存、交期與交易條件後，再提供最終報價基準。',
    requestAccess: '註冊或登入買家帳戶',
    reviewStatus: '查看帳戶狀態',
    selectedImage: '目前選擇的圖片',
    shippingNotice: '出貨說明',
    shippingNoticeText: '出貨時程、包裝與可否換貨，會在詢價審核後依商品狀態與交易條件另行說明。',
    size: '尺寸',
    sizeGuide: '尺寸指南',
    sizeGuideText: '穿孔飾品的尺寸與配戴感可能依設計與測量方式不同。詢價前請確認登錄規格。',
    sizes: '尺寸',
    specification: '詳細規格',
    specificationIntro: '詢價判斷使用結構化規格，而非裝飾性文案。',
    sectionDelivery: '出貨說明',
    sectionMaterial: '材質說明',
    sectionOverview: '概要',
    sectionSpecification: '詳細規格',
    quietDetailEyebrow: 'THE QUIET DETAIL',
    quietDetailHeadline: '小尺寸飾品也能快速完成買家檢視。',
    quietDetailLead: '將圖片、材質、選項與詢價說明分開，讓買家快速掌握重點。',
    statusGuest: '註冊或登入買家帳戶後，即可使用價格與詢價功能。',
    statusPending: '請確認買家帳戶狀態。',
    thumbnail: '縮圖',
    unavailable: '不支援',
    viewLarge: '查看大圖',
    wholesale: '批發基準',
  },
}

const cleanDetailCopy = {
  en: {
    ...detailCopy.en,
    careGuide: 'Care guide',
    closureType: 'Closure',
    detailImages: 'Product details',
    detailImagesIntro: 'Review the product from multiple angles and in actual wearing context.',
    finish: 'Finish',
    keyFacts: 'Key specifications',
    materialAndCare: 'Material & care',
    piercingType: 'Piercing type',
    plating: 'Plating',
    productStructure: 'Product structure',
    saleType: 'Sales unit',
    saleTypePair: 'Pair',
    saleTypeSet: 'Set',
    saleTypeSingle: 'Single piece',
    sectionDelivery: 'Quote guide',
    sectionMaterial: 'Material & care',
    sectionOverview: 'Detail images',
    sectionSpecification: 'Exact specifications',
    stoneType: 'Stone',
    wearingGuide: 'Fit & wearing',
    wearingLocation: 'Recommended placement',
  },
  kr: {
    ...detailCopy.en,
    addToInquiry: '견적 리스트에 담기',
    adminPriceBooks: '관리자 가격표',
    approvalRequired: '로그인 후 가격 확인 가능',
    assuranceAssetsBody: '상세 이미지와 등록 사양을 기준으로 견적 검토를 진행합니다.',
    assuranceAssetsTitle: '바이어 자료',
    assuranceMarketBody: '국내외 B2B 거래 검토를 위한 카탈로그 상품입니다.',
    assuranceMarketTitle: '거래 검토 가능',
    assuranceMoqBody: '로그인한 거래처에게 MOQ와 가격 기준을 안내합니다.',
    assuranceMoqTitle: '거래처 MOQ 안내',
    assuranceQcBody: '출고 전 상품 상태와 사양은 견적 단계에서 다시 확인합니다.',
    assuranceQcTitle: '사양 확인',
    available: '가능',
    back: '상품 목록으로',
    buyerOnly: '로그인한 거래처는 가격과 MOQ를 확인할 수 있습니다.',
    buyerPoint: '바이어 포인트',
    buyerPointBodyOne: '소재, 색상, 사이즈 정보를 견적 요청 전에 한 화면에서 확인합니다.',
    buyerPointBodyThree: '선택 옵션과 수량은 견적 리스트에서 다시 조정할 수 있습니다.',
    buyerPointBodyTwo: '로그인한 거래처에게 가격과 MOQ 기준을 노출합니다.',
    buyerPointTitleOne: '간단한 검토',
    buyerPointTitleThree: '견적 흐름 유지',
    buyerPointTitleTwo: '거래처 가격',
    category: '카테고리',
    categoryProducts: '같은 분류의 상품',
    categoryView: '카테고리 보기',
    color: '색상',
    colors: '색상',
    description: '상품 정보',
    emptyRelated: '같은 분류에 표시할 상품이 아직 없습니다.',
    exportAvailability: '수출 가능 여부',
    gallery: '상품 이미지',
    guide: '안내',
    leadTime: '리드타임',
    material: '소재',
    materialGuide: '소재 안내',
    materialHeadline: '소재 기준은 명확하게 안내합니다.',
    materialGuideText: (material) => `${material} 기준으로 등록된 상품입니다. 도금, 마감, 국가별 표기 기준은 견적 확인 단계에서 다시 확인해 주세요.`,
    moqAfterReview: '로그인 후 안내',
    noImage: '등록된 상품 이미지가 없습니다.',
    notFound: '상품을 찾을 수 없습니다.',
    origin: '원산지',
    priceUnavailable: '등록된 거래처 가격이 없습니다.',
    productCode: '상품 코드',
    productInfo: '상품 정보',
    quantity: '수량',
    quantityNote: (moq) => `수량은 MOQ 단위로 조정됩니다. 기준 단위: ${moq} pcs`,
    quoteNotice: '견적 안내',
    quoteStepConfirm: '조건 확정',
    quoteStepConfirmBody: '최종 조건은 담당자 확인 후 안내합니다.',
    quoteStepReceive: '기준 확인',
    quoteStepReceiveBody: '가격, 재고, 납기, 포장 조건을 확인합니다.',
    quoteStepSelect: '상품 선택',
    quoteStepSelectBody: '색상, 사이즈, 수량을 선택해 견적 검토를 요청합니다.',
    quoteWorkflow: '견적 진행 방식',
    quoteWorkflowLead: '이 페이지는 B2B 견적 요청을 위한 상품 검토 도구입니다.',
    quoteNoticeText: '견적 요청은 최종 거래 확정이 아닙니다. Noblesse가 재고, 납기, 공급 조건을 확인한 뒤 최종 견적 기준을 안내합니다.',
    requestAccess: '거래처 등록 또는 로그인',
    reviewStatus: '계정 상태 보기',
    selectedImage: '선택된 이미지',
    shippingNotice: '출고 안내',
    shippingNoticeText: '출고 일정, 포장, 교환 가능 여부는 견적 검토 이후 상품 상태와 거래 조건에 따라 별도로 안내합니다.',
    size: '사이즈',
    sizeGuide: '사이즈 가이드',
    sizeGuideText: '피어싱 사이즈와 착용감은 디자인과 측정 방식에 따라 달라질 수 있습니다. 견적 요청 전 상세 규격을 확인해 주세요.',
    sizes: '사이즈',
    specification: '상세 사양',
    specificationIntro: '견적 검토에는 장식 문구보다 등록된 구조와 사양을 사용합니다.',
    sectionDelivery: '견적 안내',
    sectionMaterial: '소재·관리',
    sectionOverview: '상세 이미지',
    sectionSpecification: '정확한 규격',
    quietDetailHeadline: '작은 피어싱도 한눈에 검토할 수 있게 정리했습니다.',
    quietDetailLead: '이미지, 소재, 옵션, 견적 안내를 분리해 바이어가 필요한 정보를 빠르게 확인할 수 있습니다.',
    statusGuest: '거래처 계정으로 로그인하면 가격과 견적 기능을 사용할 수 있습니다.',
    statusPending: '거래처 계정 상태를 확인해주세요.',
    thumbnail: '썸네일',
    unavailable: '불가',
    viewLarge: '큰 이미지 보기',
    wholesale: '도매 기준',
    gauge: '게이지',
    length: '길이',
    barLength: '바 길이',
    postLength: '포스트 길이',
    ballSize: '볼 사이즈',
    charmSize: '장식 사이즈',
    totalLength: '전체 길이',
    innerDiameter: '내경',
    barThickness: '바 두께',
    decorationType: '장식 타입',
    decorationColor: '장식 색상',
    decorationSize: '장식 크기',
    decorationCount: '장식 수량',
    settingMethod: '세팅 방식',
    specNote: '사양 메모',
    careGuide: '보관·관리 안내',
    closureType: '잠금 방식',
    detailImages: '상품 상세',
    detailImagesIntro: '제품의 구조와 실제 착용 느낌을 여러 각도에서 확인하세요.',
    finish: '표면 마감',
    keyFacts: '핵심 사양',
    materialAndCare: '소재·관리',
    piercingType: '피어싱 유형',
    plating: '도금',
    productStructure: '제품 구조',
    saleType: '판매 단위',
    saleTypePair: '한 쌍',
    saleTypeSet: '세트',
    saleTypeSingle: '낱개',
    stoneType: '스톤',
    wearingGuide: '착용 안내',
    wearingLocation: '권장 착용 부위',
  },
  jp: {
    ...detailCopy.en,
    addToInquiry: '見積リストに追加',
    adminPriceBooks: '管理者価格表',
    approvalRequired: 'ログイン後に価格確認可能',
    category: 'カテゴリー',
    colors: 'カラー',
    exportAvailability: '輸出可否',
    material: '素材',
    origin: '原産地',
    productCode: '商品コード',
    productInfo: '商品情報',
    quoteNotice: '見積案内',
    requestAccess: '取引先登録またはログイン',
    reviewStatus: 'アカウント状態を見る',
    sectionDelivery: '見積案内',
    sectionMaterial: '素材・お手入れ',
    sectionOverview: '詳細画像',
    sectionSpecification: '正確な仕様',
    specification: '詳細仕様',
    specificationIntro: '見積検討には装飾的な説明ではなく登録された仕様を使用します。',
    statusGuest: '取引先アカウントでログインすると価格と見積機能を利用できます。',
    statusPending: '取引先アカウントの状態をご確認ください。',
    quietDetailHeadline: '小さなピアスも一目で確認できるよう整理しました。',
    quietDetailLead: '画像、素材、オプション、見積案内を分け、必要な情報を素早く確認できます。',
    materialHeadline: '素材基準を明確に案内します。',
    materialGuideText: (material) => `${material}基準で登録された商品です。メッキ、仕上げ、国別表記基準は見積確認時に再確認してください。`,
    quoteWorkflow: '見積の流れ',
    quoteWorkflowLead: 'このページはB2B見積依頼のための商品確認ツールです。',
    quoteNoticeText: '見積依頼は最終取引の確定ではありません。Noblesseが在庫、納期、供給条件を確認した後、最終見積基準を案内します。',
    shippingNoticeText: '出荷日程、包装、交換可否は見積確認後、商品状態と取引条件に応じて別途案内します。',
    sizeGuideText: 'ピアスのサイズと着用感はデザインや測定方法により異なります。見積依頼前に詳細仕様をご確認ください。',
    gauge: 'ゲージ',
    length: '長さ',
    barLength: 'バー長さ',
    postLength: 'ポスト長さ',
    ballSize: 'ボールサイズ',
    charmSize: 'チャームサイズ',
    totalLength: '全長',
    innerDiameter: '内径',
    barThickness: 'バー太さ',
    decorationType: '装飾タイプ',
    decorationColor: '装飾カラー',
    decorationSize: '装飾サイズ',
    decorationCount: '装飾数',
    settingMethod: 'セッティング方式',
    specNote: '仕様メモ',
    careGuide: '保管・お手入れ',
    closureType: '留め方',
    detailImages: '商品詳細',
    detailImagesIntro: '商品の構造と着用イメージを複数の角度から確認できます。',
    finish: '表面仕上げ',
    keyFacts: '主要仕様',
    materialAndCare: '素材・お手入れ',
    piercingType: 'ピアスタイプ',
    plating: 'メッキ',
    productStructure: '商品構造',
    saleType: '販売単位',
    saleTypePair: 'ペア',
    saleTypeSet: 'セット',
    saleTypeSingle: '片耳',
    stoneType: 'ストーン',
    wearingGuide: '着用案内',
    wearingLocation: '推奨部位',
  },
  cn: {
    ...detailCopy.en,
    addToInquiry: '加入詢價清單',
    adminPriceBooks: '管理者價格表',
    approvalRequired: '登入後可查看價格',
    category: '分類',
    colors: '顏色',
    exportAvailability: '出口可否',
    material: '材質',
    origin: '產地',
    productCode: '商品代碼',
    productInfo: '商品資訊',
    quoteNotice: '詢價說明',
    requestAccess: '註冊或登入買家帳戶',
    reviewStatus: '查看帳戶狀態',
    sectionDelivery: '詢價說明',
    sectionMaterial: '材質與保養',
    sectionOverview: '詳細圖片',
    sectionSpecification: '精確規格',
    specification: '詳細規格',
    specificationIntro: '詢價判斷以登錄的結構與規格為準，而不是裝飾文案。',
    statusGuest: '註冊或登入買家帳戶後，即可使用價格與詢價功能。',
    statusPending: '請確認買家帳戶狀態。',
    quietDetailHeadline: '小型耳飾也能一眼完成買家檢視。',
    quietDetailLead: '圖片、材質、選項與詢價說明分區呈現，方便買家快速確認重點。',
    materialHeadline: '材質標準清楚標示。',
    materialGuideText: (material) => `此商品以 ${material} 登錄。鍍層、表面處理與各市場標示要求，請於詢價確認階段再次確認。`,
    quoteWorkflow: '詢價流程',
    quoteWorkflowLead: '本頁是 B2B 詢價用的商品檢視工具。',
    quoteNoticeText: '詢價請求並非最終交易確認。Noblesse 會確認庫存、交期與供應條件後，再提供最終報價基準。',
    shippingNoticeText: '出貨時程、包裝與交換可否，將於詢價確認後依商品狀態與交易條件另行說明。',
    sizeGuideText: '耳飾尺寸與配戴感會因設計與測量方式而異。詢價前請確認登錄的詳細規格。',
    gauge: '規格',
    length: '長度',
    barLength: '桿長',
    postLength: '針長',
    ballSize: '球尺寸',
    charmSize: '吊飾尺寸',
    totalLength: '全長',
    innerDiameter: '內徑',
    barThickness: '桿厚',
    decorationType: '裝飾類型',
    decorationColor: '裝飾顏色',
    decorationSize: '裝飾尺寸',
    decorationCount: '裝飾數量',
    settingMethod: '鑲嵌方式',
    specNote: '規格備註',
    careGuide: '保存與保養',
    closureType: '固定方式',
    detailImages: '商品詳細',
    detailImagesIntro: '從多個角度確認商品結構與實際配戴效果。',
    finish: '表面處理',
    keyFacts: '主要規格',
    materialAndCare: '材質與保養',
    piercingType: '穿孔飾品類型',
    plating: '電鍍',
    productStructure: '商品結構',
    saleType: '販售單位',
    saleTypePair: '一對',
    saleTypeSet: '套組',
    saleTypeSingle: '單件',
    stoneType: '寶石',
    wearingGuide: '配戴說明',
    wearingLocation: '建議配戴部位',
  },
}

const directInquiryCopy = {
  en: {
    directInquiryError: 'Unable to send this quote request. Please check the selected options and buyer account status.',
    directInquiryMemo: 'Request note',
    directInquiryMemoPlaceholder: 'Add quantity, finish, lead time, or other details for the Noblesse team to review.',
    directInquirySubmit: 'Request quote for this product',
    directInquirySubmitting: 'Sending request...',
    directInquirySuccess: 'Your product quote request has been received.',
    directInquiryTitle: 'Product quote request',
    inquiryRef: 'Inquiry number',
    inquiryStatus: 'Status',
    optionRequired: 'Select all required options before adding this item.',
    required: 'Required',
    viewInquiry: 'View my inquiry',
  },
  kr: {
    directInquiryError: '이 상품 견적 요청을 보낼 수 없습니다. 선택 항목과 거래처 계정 상태를 확인해 주세요.',
    directInquiryMemo: '요청 메모',
    directInquiryMemoPlaceholder: '필요한 수량, 색상, 납기나 확인할 내용을 적어주세요.',
    directInquirySubmit: '이 상품으로 견적 요청',
    directInquirySubmitting: '문의 접수 중...',
    directInquirySuccess: '상품 견적 요청이 접수되었습니다.',
    directInquiryTitle: '상품 견적 요청',
    inquiryRef: '문의 번호',
    inquiryStatus: '상태',
    optionRequired: '필수 옵션을 모두 선택한 뒤 견적 리스트에 담아주세요.',
    required: '필수',
    viewInquiry: '내 견적 요청 보기',
  },
  jp: {
    directInquiryError: 'この商品の見積依頼を送信できません。選択内容とバイヤーアカウント状態を確認してください。',
    directInquiryMemo: '依頼メモ',
    directInquiryMemoPlaceholder: '必要数量、カラー、納期、確認したい内容を入力してください。',
    directInquirySubmit: 'この商品で見積依頼',
    directInquirySubmitting: '依頼を送信中...',
    directInquirySuccess: '商品の見積依頼を受け付けました。',
    directInquiryTitle: '商品の見積依頼',
    inquiryRef: '依頼番号',
    inquiryStatus: '状態',
    optionRequired: '必須オプションをすべて選択してください。',
    required: '必須',
    viewInquiry: '見積依頼を見る',
  },
  cn: {
    directInquiryError: '無法送出此商品詢價。請確認選項與買家帳戶狀態。',
    directInquiryMemo: '詢價備註',
    directInquiryMemoPlaceholder: '請填寫需要數量、顏色、交期或希望確認的內容。',
    directInquirySubmit: '以此商品送出詢價',
    directInquirySubmitting: '正在送出詢價...',
    directInquirySuccess: '商品詢價已送出。',
    directInquiryTitle: '商品詢價',
    inquiryRef: '詢價編號',
    inquiryStatus: '狀態',
    optionRequired: '請先選擇所有必填選項。',
    required: '必填',
    viewInquiry: '查看我的詢價',
  },
}

const getDetailCopy = (contentLocale) => ({
  ...cleanDetailCopy.en,
  ...(cleanDetailCopy[contentLocale] ?? cleanDetailCopy.en),
  ...(directInquiryCopy[contentLocale] ?? directInquiryCopy.en),
})

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : [])

const joinList = (value) => {
  const list = asList(value)
  return list.length > 0 ? list.join(' / ') : ''
}

const isPresentSpec = (value) => value !== undefined && value !== null && String(value).trim() !== ''

const withUnit = (value, unit = 'mm') => {
  if (!isPresentSpec(value)) return ''
  const text = String(value).trim()
  if (!text || /[a-zA-Z가-힣ぁ-んァ-ヶ一-龯]/.test(text)) return text
  return `${text}${unit || ''}`
}

const buildGalleryImages = (product, productAlt, copy) => {
  return productGalleryEntries(product, productAlt).map((image, index) => ({
    ...image,
    label: index === 0 ? copy.selectedImage : `${copy.gallery} ${index + 1}`,
  }))
}

const getLocalizedCategoryName = (product, contentLocale) => {
  if (contentLocale === 'kr') return product.categoryNameKo || product.categoryNameEn || product.categoryId
  if (contentLocale === 'jp') return product.categoryNameJa || product.categoryNameEn || product.categoryNameKo || product.categoryId
  if (contentLocale === 'cn') return product.categoryNameZhTw || product.categoryNameCn || product.categoryNameEn || product.categoryNameKo || product.categoryId
  return product.categoryNameEn || product.categoryNameKo || product.categoryId
}

const getRelatedProducts = (products, product) => {
  const productCollections = new Set(asList(product.collectionIds))
  return products
    .filter((item) => item.productId !== product.productId && item.isVisible)
    .map((item) => {
      let score = 0
      if (item.categoryId && item.categoryId === product.categoryId) score += 8
      if (asList(item.collectionIds).some((id) => productCollections.has(id))) score += 4
      if (item.material && item.material === product.material) score += 2
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (a.item.sortOrder || 0) - (b.item.sortOrder || 0) || a.item.productId.localeCompare(b.item.productId))
    .slice(0, 4)
    .map(({ item }) => item)
}

function ProductGallery({ activeImageId = '', copy, editor, product, productAlt }) {
  const images = useMemo(() => buildGalleryImages(product, productAlt, copy), [copy, product, productAlt])
  const [selectedId, setSelectedId] = useState(images[0]?.id || '')

  useEffect(() => {
    setSelectedId((current) => {
      if (activeImageId && images.some((image) => image.id === activeImageId)) return activeImageId
      if (editor?.selectedImageId && images.some((image) => image.id === editor.selectedImageId)) return editor.selectedImageId
      return images.some((image) => image.id === current) ? current : images[0]?.id || ''
    })
  }, [activeImageId, editor?.selectedImageId, images])

  const selectedImage = images.find((image) => image.id === selectedId) || images[0] || null
  const secondaryImages = images.filter((image) => image.id !== selectedImage?.id).slice(0, 2)

  return <section className={`pd-gallery ${secondaryImages.length > 0 ? 'has-side-images' : 'is-single'}`} aria-label={copy.gallery}>
    <div className="pd-gallery-grid">
      <figure className={`pd-main-image tone-${product.tone}`}>
        {selectedImage
          ? <img src={selectedImage.detailSrc} alt={selectedImage.alt} loading="eager" width="1200" height="1200" style={imagePresentationStyle(selectedImage)} onError={(event) => { event.currentTarget.hidden = true }} />
          : <div className="pd-image-placeholder"><Images size={32} /><span>{copy.noImage}</span></div>}
      </figure>
      {secondaryImages.length > 0 && <div className="pd-side-images" aria-hidden="true">
        {secondaryImages.map((image) => <figure className="pd-side-image" key={`side-${image.id}`}>
          <img src={image.cardSrc || image.detailSrc} alt="" loading="lazy" width="600" height="600" style={imagePresentationStyle(image)} onError={(event) => { event.currentTarget.hidden = true }} />
        </figure>)}
      </div>}
    </div>
    {images.length > 1 && <div className="pd-thumbs" role="list" aria-label={copy.thumbnail}>
      {images.map((image) => <button
        aria-label={image.label}
        aria-pressed={selectedImage?.id === image.id}
        className={selectedImage?.id === image.id ? 'pd-thumb is-active' : 'pd-thumb'}
        key={image.id}
        onClick={() => {
          setSelectedId(image.id)
          editor?.selectImage?.(image.id)
        }}
        type="button"
      >
        <img src={image.thumbSrc || image.detailSrc} alt="" loading="lazy" width="300" height="300" style={imagePresentationStyle(image)} onError={(event) => { event.currentTarget.hidden = true }} />
      </button>)}
    </div>}
    {selectedImage?.zoomSrc && <a className="pd-large-link" href={selectedImage.zoomSrc} rel="noreferrer" target="_blank">{copy.viewLarge}<ChevronRight size={14} /></a>}
  </section>
}

function ProductOptionGroup({ copy, editor, group, locale, onSelect, selectedValueId }) {
  const normalizedLocale = locale === 'cn' ? 'zh-TW' : locale
  const activeValues = group.values.filter((value) => value.active)
  const groupLabel = editor
    ? String(group.labels?.[normalizedLocale] || '')
    : getLocalizedOptionLabel(group.labels, normalizedLocale)
  return <div className={`pd-option-group${group.required && !selectedValueId ? ' is-required' : ''}`}>
    <span>{groupLabel || `${editor?.localeLabel || ''} 옵션 이름 입력`.trim()}{group.required && <small>{copy.required}</small>}</span>
    <div className="pd-option-buttons">
      {activeValues.map((value) => {
        const valueLabel = editor
          ? String(value.labels?.[normalizedLocale] || '')
          : getLocalizedOptionLabel(value.labels, normalizedLocale)
        return <button
          aria-pressed={selectedValueId === value.id}
          className={`pd-option-button${group.type === 'swatch' ? ' has-swatch' : ''}${selectedValueId === value.id ? ' is-active' : ''}`}
          key={value.id}
          type="button"
          onClick={() => onSelect(group.id, value.id)}
        >
          {group.type === 'swatch' && <i aria-hidden="true" style={{ backgroundColor: value.swatch || '#f4f1f2' }} />}
          <span>{valueLabel || `${editor?.localeLabel || ''} 옵션 값 입력`.trim()}</span>
        </button>
      })}
      {!activeValues.length && editor && <small>옵션 값을 추가하세요.</small>}
    </div>
  </div>
}

function ProductEditorTarget({ align = 'start', children, editor, field, label }) {
  if (!editor) return children
  const active = editor.selectedField === field
  return <div className={`pd-editor-target is-${align}${active ? ' is-active' : ''}`}>
    {children}
    <button
      aria-controls="admin-product-inspector"
      aria-label={`${label} 편집`}
      aria-pressed={active}
      className="pd-editor-target-trigger"
      title={`${label} 편집`}
      type="button"
      onClick={(event) => editor.selectField(field, event.currentTarget)}
    ><Pencil aria-hidden="true" size={15} /></button>
  </div>
}

function ProductInlineEditor({ as: Tag = 'p', className = '', editor, field, label, multiline = false, placeholder, value }) {
  if (!editor) return value ? <Tag className={className}>{value}</Tag> : null
  const active = editor.active?.kind === 'inline' && editor.active.field === field
  if (active) {
    const sharedProps = {
      'aria-label': `${label} 편집`,
      autoFocus: true,
      className: 'pd-inline-editor-input',
      maxLength: multiline ? 4000 : 240,
      value,
      onBlur: () => editor.commitInline(field),
      onChange: (event) => editor.changeInline(field, event.target.value),
      onKeyDown: (event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          editor.cancelInline(field)
          return
        }
        if ((!multiline && event.key === 'Enter') || (multiline && event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
          event.preventDefault()
          editor.commitInline(field)
        }
      },
    }
    return <Tag className={`${className} pd-inline-editor is-active`.trim()}>
      {multiline ? <textarea {...sharedProps} rows={field === 'body' ? 8 : 3} /> : <input {...sharedProps} type="text" />}
    </Tag>
  }
  return <Tag className={`${className} pd-inline-editor${value ? '' : ' is-placeholder'}`.trim()}>
    <button aria-label={`${label} 편집`} type="button" onClick={() => editor.beginInline(field, value)}>
      <span>{value || placeholder}</span><Pencil aria-hidden="true" size={14} />
    </button>
  </Tag>
}

export function ProductDetailView({
  addInquiryItem = () => {},
  adminPriceBooks = [],
  approvedAmount = null,
  contentLocale = 'kr',
  editor = null,
  isAdmin = false,
  isApproved = false,
  locale = 'kr',
  price = null,
  product,
  products = [],
  submitProductInquiry = async () => null,
  toLocalePath = (path) => path,
  viewerState = 'guest',
}) {
  const copy = getDetailCopy(contentLocale)
  const productName = editor ? editor.values.name : product ? getLocalizedProductName(product, locale) : ''
  const productAlt = product ? getLocalizedProductAlt(product, locale) : ''
  const description = editor ? editor.values.summary : product ? getLocalizedProductDescription(product, locale) : ''
  const optionGroups = useMemo(() => getEffectiveProductOptionGroups(product || {}), [product])
  const optionSignature = useMemo(() => optionGroups.map((group) => `${group.id}:${group.values.filter((value) => value.active).map((value) => value.id).join(',')}`).join('|'), [optionGroups])
  const [selectedOptionValues, setSelectedOptionValues] = useState({})
  const adminPriceItems = adminPriceBooks.map(formatAdminPriceBook)
  const canUseTradeTerms = Boolean(isApproved && price && approvedAmount !== null)
  const canRequestProductQuote = Boolean(isApproved && product)
  const canViewAdminPrices = Boolean(isAdmin && adminPriceBooks.length > 0)
  const requestMoq = canUseTradeTerms ? price.moq : product?.moqDefault || 1
  const visibleMoq = canUseTradeTerms ? price.moq : canRequestProductQuote ? requestMoq : canViewAdminPrices ? adminPriceBooks[0]?.moq : null
  const editorCanUseTradeTerms = Boolean(editor && price && approvedAmount !== null)
  const showTradeTerms = canUseTradeTerms || editorCanUseTradeTerms
  const showQuoteTools = Boolean(editor) || canRequestProductQuote
  const effectiveRequestMoq = editor
    ? editorCanUseTradeTerms ? price.moq : product?.moqDefault || 1
    : requestMoq
  const effectiveVisibleMoq = editor ? effectiveRequestMoq : visibleMoq
  const [quantity, setQuantity] = useState(effectiveVisibleMoq || 1)
  const [directMemo, setDirectMemo] = useState('')
  const [directStatus, setDirectStatus] = useState('idle')
  const [directError, setDirectError] = useState('')
  const [directInquiry, setDirectInquiry] = useState(null)

  useEffect(() => {
    const explicitGroups = Array.isArray(product?.optionGroups) && product.optionGroups.length > 0
    setSelectedOptionValues((current) => Object.fromEntries(optionGroups.flatMap((group) => {
      const activeValues = group.values.filter((value) => value.active)
      const currentValue = activeValues.find((value) => value.id === current[group.id])
      if (currentValue) return [[group.id, currentValue.id]]
      if (!explicitGroups && activeValues[0]) return [[group.id, activeValues[0].id]]
      return []
    })))
  }, [optionGroups, optionSignature, product?.optionGroups, product?.productId])

  useEffect(() => {
    if (effectiveVisibleMoq) setQuantity(effectiveVisibleMoq)
  }, [effectiveVisibleMoq])

  useEffect(() => {
    setDirectMemo('')
    setDirectStatus('idle')
    setDirectError('')
    setDirectInquiry(null)
  }, [product?.productId])

  if (!product) return <main className="content pd-page"><div className="empty">{copy.notFound}</div></main>

  const categoryName = getLocalizedCategoryName(product, contentLocale)
  const colors = asList(product.colors)
  const sizes = asList(product.sizes)
  const selectedOptionSnapshots = getSelectedOptionSnapshots(optionGroups, selectedOptionValues)
  const selectedLegacyOptions = getLegacySelectionFromSnapshots(selectedOptionSnapshots, contentLocale)
  const selectedOptionIds = selectedOptionPairs(selectedOptionValues)
  const missingRequiredOptions = getMissingRequiredProductOptions(optionGroups, selectedOptionValues)
  const selectedOptionImageId = [...selectedOptionSnapshots].reverse().find((item) => item.imageId)?.imageId || ''
  const productSpecs = product.specs || {}
  const localizedDetailContent = getLocalizedProductDetailContent(product, locale)
  const productDetailContent = editor
    ? { ...localizedDetailContent, headline: editor.values.headline, body: editor.values.body, description: editor.values.body }
    : localizedDetailContent
  const specUnit = productSpecs.unit || 'mm'
  const materialGuideBody = productDetailContent.materialInfo || (product.material ? copy.materialGuideText(product.material) : '')
  const sizeGuideBody = productDetailContent.sizeGuide || copy.sizeGuideText
  const wearingGuideBody = productDetailContent.wearingGuide || ''
  const careGuideBody = productDetailContent.careGuide || productDetailContent.care || ''
  const shippingNoticeBody = productDetailContent.exchangeNotice || copy.shippingNoticeText
  const quoteWorkflowLead = productDetailContent.wholesaleNotice || copy.quoteWorkflowLead
  const productTaxonomy = product.taxonomy || {}
  const galleryImages = buildGalleryImages(product, productAlt, copy)
  const saleTypeLabels = {
    pair: copy.saleTypePair,
    set: copy.saleTypeSet,
    single: copy.saleTypeSingle,
  }
  const currentQuantity = normalizeQuantity(quantity, effectiveRequestMoq || 1)
  const accessLink = viewerState === 'guest' ? '/login' : '/account'
  const accessLabel = viewerState === 'guest' ? copy.requestAccess : copy.reviewStatus
  const relatedProducts = getRelatedProducts(products, product)

  const productInfoRows = [
    [copy.productCode, product.code],
    [copy.category, categoryName],
    [copy.material, product.material],
    [copy.colors, joinList(colors)],
    [copy.sizes, joinList(sizes)],
    [copy.leadTime, product.leadTime],
    [copy.origin, product.origin],
    [copy.exportAvailability, product.isExportAvailable ? copy.available : copy.unavailable],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '')

  const heroInfoRows = [
    [copy.category, categoryName],
    [copy.material, product.material || productTaxonomy.baseMaterial],
    [copy.origin, product.origin],
    [copy.leadTime, product.leadTime],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '')

  const specificationItems = [
    { key: 'gauge', label: copy.gauge, value: productSpecs.gauge },
    { key: 'length', label: copy.length, value: withUnit(productSpecs.length, specUnit) },
    { key: 'barLength', label: copy.barLength, value: withUnit(productSpecs.barLength, specUnit) },
    { key: 'postLength', label: copy.postLength, value: withUnit(productSpecs.postLength, specUnit) },
    { key: 'ballSize', label: copy.ballSize, value: withUnit(productSpecs.ballSize, specUnit) },
    { key: 'charmSize', label: copy.charmSize, value: withUnit(productSpecs.charmSize, specUnit) },
    { key: 'totalLength', label: copy.totalLength, value: withUnit(productSpecs.totalLength, specUnit) },
    { key: 'innerDiameter', label: copy.innerDiameter, value: withUnit(productSpecs.innerDiameter, specUnit) },
    { key: 'barThickness', label: copy.barThickness, value: withUnit(productSpecs.barThickness, specUnit) },
    { key: 'decorationType', label: copy.decorationType, value: productSpecs.decorationType },
    { key: 'decorationColor', label: copy.decorationColor, value: productSpecs.decorationColor },
    { key: 'decorationSize', label: copy.decorationSize, value: withUnit(productSpecs.decorationSize, specUnit) },
    { key: 'decorationCount', label: copy.decorationCount, value: productSpecs.decorationCount },
    { key: 'stoneType', label: copy.stoneType, value: productSpecs.stoneType },
    { key: 'closureType', label: copy.closureType, value: productSpecs.closureType },
    { key: 'settingMethod', label: copy.settingMethod, value: productSpecs.settingMethod },
    { key: 'plating', label: copy.plating, value: productSpecs.plating },
    { key: 'finish', label: copy.finish, value: productSpecs.finish },
    { key: 'specNote', label: copy.specNote, value: productSpecs.specNote || productSpecs.decorationNote },
  ].filter((item) => item.value)
  const specificationRows = specificationItems.map((item) => [item.label, item.value])

  const structureRows = [
    [copy.piercingType, productTaxonomy.piercingType],
    [copy.wearingLocation, productTaxonomy.wearingLocation],
    [copy.material, product.material || productTaxonomy.baseMaterial],
    [copy.plating, productSpecs.plating],
    [copy.finish, productSpecs.finish],
    [copy.stoneType, productSpecs.stoneType],
    [copy.closureType, productSpecs.closureType],
    [copy.settingMethod, productSpecs.settingMethod],
    [copy.saleType, saleTypeLabels[productTaxonomy.saleType] || productTaxonomy.saleType],
  ].filter(([, value]) => value)

  const keyFacts = [
    [copy.piercingType, productTaxonomy.piercingType || categoryName],
    [copy.material, product.material || productTaxonomy.baseMaterial],
    [copy.gauge, productSpecs.gauge || (productSpecs.barThickness ? withUnit(productSpecs.barThickness, specUnit) : '')],
    [copy.barLength, withUnit(productSpecs.barLength || productSpecs.postLength || productSpecs.innerDiameter || productSpecs.length, specUnit)],
    [copy.wearingLocation, productTaxonomy.wearingLocation],
    [copy.moq, effectiveVisibleMoq ? `${effectiveVisibleMoq} pcs` : ''],
  ].filter(([, value]) => value)

  const detailBlocks = product.detailContent?.blocks || []
  const hasDetailStory = detailBlocks.length > 0 || galleryImages.length > 1 || productDetailContent.headline || productDetailContent.body || editor
  const hasMaterialAndCare = structureRows.length > 0 || materialGuideBody || wearingGuideBody || careGuideBody || editor

  const addSelectedItem = () => {
    if (editor || missingRequiredOptions.length > 0) return
    addInquiryItem(product.productId, {
      color: selectedLegacyOptions.color,
      size: selectedLegacyOptions.size,
      selectedOptions: selectedOptionIds,
    }, currentQuantity)
  }
  const updateQuantity = (nextQuantity) => setQuantity(normalizeQuantity(nextQuantity, effectiveRequestMoq || 1))
  const submitSelectedProductInquiry = async () => {
    if (editor || !canRequestProductQuote || directStatus === 'submitting' || missingRequiredOptions.length > 0) return
    setDirectStatus('submitting')
    setDirectError('')
    setDirectInquiry(null)
    try {
      const inquiry = await submitProductInquiry({
        productId: product.productId,
        option: {
          color: selectedLegacyOptions.color,
          size: selectedLegacyOptions.size,
          selectedOptions: selectedOptionIds,
        },
        quantity: currentQuantity,
        requestMemo: directMemo.trim(),
      })
      if (!inquiry) {
        throw new Error('PRODUCT_INQUIRY_NOT_CREATED')
      }
      setDirectInquiry(inquiry)
      setDirectStatus('success')
    } catch {
      setDirectStatus('error')
      setDirectError(copy.directInquiryError)
    }
  }

  return <main className={`content pd-page${editor ? ' is-editor-preview' : ''}`}>
    <nav className="pd-breadcrumb" aria-label="Breadcrumb">
      {editor ? <span><ChevronLeft size={16} />{copy.back}</span> : <Link to={toLocalePath('/products')}><ChevronLeft size={16} />{copy.back}</Link>}
      <ProductEditorTarget editor={editor} field="category" label="카테고리"><span>{categoryName || '카테고리 선택'}</span></ProductEditorTarget>
      <ProductEditorTarget align="end" editor={editor} field="code" label="상품 코드"><span>{product.code || '상품 코드 입력'}</span></ProductEditorTarget>
    </nav>

    <section className="pd-hero">
      <ProductEditorTarget editor={editor} field="image" label="상품 이미지"><ProductGallery activeImageId={selectedOptionImageId} copy={copy} editor={editor} product={product} productAlt={productAlt} /></ProductEditorTarget>

      <aside className="pd-panel" aria-label={copy.productInfo}>
        <div className="pd-badges">
          <span>{copy.badgesNew}</span>
          {product.isExportAvailable && <span>{copy.badgesExportReady}</span>}
        </div>
        <ProductEditorTarget align="end" editor={editor} field="code" label="상품 코드"><p className="pd-eyebrow">{copy.productCode} {product.code || '상품 코드 입력'}</p></ProductEditorTarget>
        <ProductInlineEditor as="h1" editor={editor} field="name" label="상품명" placeholder={`${editor?.localeLabel || ''} 상품명 입력`.trim()} value={productName} />
        {!editor && product.nameEn && product.nameEn !== productName && <p className="pd-alt-name">{product.nameEn}</p>}
        <ProductInlineEditor className="pd-summary" editor={editor} field="summary" label="한 줄 요약" multiline placeholder={`${editor?.localeLabel || ''} 한 줄 요약 입력`.trim()} value={description} />

        <ProductEditorTarget align="end" editor={editor} field="productInfo" label="상품 정보">
          <dl className="pd-meta-list">
            {heroInfoRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            {effectiveVisibleMoq && <div><dt>{copy.moq}</dt><dd>{effectiveVisibleMoq} pcs</dd></div>}
          </dl>
        </ProductEditorTarget>

        {canViewAdminPrices && <div className="pd-admin-prices">
          <small>{copy.adminPriceBooks}</small>
          <div className="pd-admin-price-grid">
            {adminPriceItems.map((item, index) => <span className="pd-admin-price" key={`${item.market}-${item.currency}-${index}`}>
              <img alt={item.flagLabel} src={item.flagSrc} />
              <b>{item.amount}</b>
              <span>{item.symbol}</span>
            </span>)}
          </div>
        </div>}

        {showQuoteTools ? <div className="pd-trade-box">
          <small>{copy.approvalRequired}</small>
          <ProductEditorTarget align="end" editor={editor} field="price" label="로그인 회원 가격">
            <div className="pd-editor-price-target">
          {showTradeTerms
            ? <>
              <strong>{formatMoney(approvedAmount, price.currency)}</strong>
              <span>{copy.moq} {price.moq} pcs · {price.market} · {price.currency}</span>
            </>
            : <>
              <strong>{copy.priceUnavailable}</strong>
              <span>{copy.quoteNoticeText}</span>
            </>}
            </div>
          </ProductEditorTarget>
          <ProductEditorTarget align="end" editor={editor} field="options" label="상품 옵션">
            <div className="pd-option-groups">
              {optionGroups.map((group) => <ProductOptionGroup
                copy={copy}
                editor={editor}
                group={group}
                key={group.id}
                locale={contentLocale}
                selectedValueId={selectedOptionValues[group.id] || ''}
                onSelect={(groupId, valueId) => setSelectedOptionValues((current) => ({ ...current, [groupId]: valueId }))}
              />)}
              {!optionGroups.length && editor && <div className="pd-option-group is-empty"><span>상품 옵션</span><small>옵션 그룹을 추가하세요.</small></div>}
            </div>
          </ProductEditorTarget>
          {missingRequiredOptions.length > 0 && !editor && <p className="pd-option-required-message" role="alert">{copy.optionRequired}</p>}
          <ProductEditorTarget align="end" editor={editor} field="moq" label="MOQ">
          <div className="pd-option-group">
            <span>{copy.quantity}</span>
            <div className="pd-quantity-control">
              <button disabled={Boolean(editor)} type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(currentQuantity - effectiveRequestMoq)}><Minus size={15} /></button>
              <input disabled={Boolean(editor)} value={currentQuantity} type="number" min={effectiveRequestMoq} step={effectiveRequestMoq} onBlur={(event) => updateQuantity(event.target.value)} onChange={(event) => updateQuantity(event.target.value)} />
              <button disabled={Boolean(editor)} type="button" aria-label="Increase quantity" onClick={() => updateQuantity(currentQuantity + effectiveRequestMoq)}><Plus size={15} /></button>
            </div>
            <small>{copy.quantityNote(effectiveRequestMoq)}</small>
          </div>
          </ProductEditorTarget>
          <div className="pd-direct-inquiry-form" id="pd-inquiry-form">
            <label htmlFor="pd-direct-inquiry-memo">{copy.directInquiryTitle}</label>
            <textarea
              disabled={Boolean(editor)}
              id="pd-direct-inquiry-memo"
              maxLength={1000}
              onChange={(event) => setDirectMemo(event.target.value)}
              placeholder={copy.directInquiryMemoPlaceholder}
              rows={4}
              value={directMemo}
            />
            <div className="pd-direct-actions">
              <button className="pd-secondary-action" disabled={Boolean(editor) || missingRequiredOptions.length > 0} type="button" onClick={addSelectedItem}><Plus size={17} />{copy.addToInquiry}</button>
              <button
                className="pd-primary-action"
                disabled={Boolean(editor) || directStatus === 'submitting' || missingRequiredOptions.length > 0}
                type="button"
                onClick={submitSelectedProductInquiry}
              >
                {directStatus === 'submitting' ? copy.directInquirySubmitting : copy.directInquirySubmit}
              </button>
            </div>
            {directStatus === 'success' && directInquiry && <div className="pd-direct-feedback is-success" role="status">
              <strong>{copy.directInquirySuccess}</strong>
              <span>{copy.inquiryRef}: {getInquiryKey(directInquiry) || '-'}</span>
              {directInquiry.status && <span>{copy.inquiryStatus}: {directInquiry.status}</span>}
              <Link to={toLocalePath(getInquiryRoutePath(directInquiry))}>{copy.viewInquiry}</Link>
            </div>}
            {directStatus === 'error' && <div className="pd-direct-feedback is-error" role="alert">
              {directError || copy.directInquiryError}
            </div>}
          </div>
        </div> : <div className="pd-access-box">
          <LockKeyhole size={20} />
          <strong>{canViewAdminPrices ? copy.adminPriceBooks : copy.approvalRequired}</strong>
          <p>{viewerState === 'pending' ? copy.statusPending : canViewAdminPrices ? copy.buyerOnly : copy.statusGuest}</p>
          {!canViewAdminPrices && <Link className="pd-secondary-action" to={toLocalePath(accessLink)}>{accessLabel}</Link>}
        </div>}
      </aside>
    </section>

    {keyFacts.length > 0 && <section className="pd-key-facts" aria-label={copy.keyFacts}>
      <p>{copy.keyFacts}</p>
      <dl>{keyFacts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>}

    <nav className="pd-section-nav" aria-label={copy.productInfo}>
      {hasDetailStory && <a href="#pd-overview">{copy.sectionOverview}</a>}
      <a href="#pd-specification">{copy.sectionSpecification}</a>
      {hasMaterialAndCare && <a href="#pd-material">{copy.sectionMaterial}</a>}
      <a href="#pd-delivery">{copy.sectionDelivery}</a>
    </nav>

    {hasDetailStory && <section className="pd-editorial pd-detail-story" id="pd-overview">
      <ProductEditorTarget editor={editor} field="detailBlocks" label="상세 콘텐츠">
        <ProductDetailBlocks
          blocks={detailBlocks}
          care={careGuideBody}
          careTitle={copy.careGuide}
          description={productDetailContent.body || description || copy.detailImagesIntro}
          editor={editor}
          galleryImages={galleryImages}
          headline={productDetailContent.headline || productName}
          locale={contentLocale}
          noImageCopy={copy.noImage}
          specificationTitle={copy.specification}
          specifications={specificationItems}
        />
      </ProductEditorTarget>
    </section>}

    <section className="pd-editorial pd-specification-section" id="pd-specification">
      <div className="pd-section-heading">
        <div><p>{copy.productInfo}</p><h2>{copy.specification}</h2></div>
        <span>{copy.specificationIntro}</span>
      </div>
      <div className="pd-spec-layout is-data-only">
        <ProductEditorTarget align="end" editor={editor} field="specs" label="상세 스펙"><dl className="pd-spec-table">
            {productInfoRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            {effectiveVisibleMoq && <div><dt>{copy.moq}</dt><dd>{effectiveVisibleMoq} pcs</dd></div>}
            {specificationRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl></ProductEditorTarget>
        <ProductEditorTarget align="end" editor={editor} field="care" label="사이즈 안내">
          <aside className="pd-size-note"><strong>{copy.sizeGuide}</strong><p>{sizeGuideBody}</p></aside>
        </ProductEditorTarget>
      </div>
    </section>

    {hasMaterialAndCare && <section className="pd-editorial pd-material-care-section" id="pd-material">
      <div className="pd-section-heading">
        <div><p>{copy.productStructure}</p><h2>{copy.materialAndCare}</h2></div>
        {materialGuideBody && <span>{materialGuideBody}</span>}
      </div>
      <div className="pd-material-care-grid">
        <ProductEditorTarget editor={editor} field="productInfo" label="제품 구조">
          <dl className="pd-structure-list">
            {structureRows.length > 0
              ? structureRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)
              : <div><dt>{copy.material}</dt><dd>—</dd></div>}
          </dl>
        </ProductEditorTarget>
        <ProductEditorTarget align="end" editor={editor} field="care" label="착용 및 관리 안내">
          <div className="pd-care-guides">
            {(wearingGuideBody || editor) && <article><strong>{copy.wearingGuide}</strong><p>{wearingGuideBody || '—'}</p></article>}
            {(sizeGuideBody || editor) && <article><strong>{copy.sizeGuide}</strong><p>{sizeGuideBody || '—'}</p></article>}
            {(careGuideBody || editor) && <article><strong>{copy.careGuide}</strong><p>{careGuideBody || '—'}</p></article>}
          </div>
        </ProductEditorTarget>
      </div>
    </section>}

    <section className="pd-editorial pd-delivery-section" id="pd-delivery">
      <div className="pd-section-heading">
        <div><p>{copy.wholesale}</p><h2>{copy.quoteWorkflow}</h2></div>
        <span>{quoteWorkflowLead}</span>
      </div>
      <div className="pd-process-grid">
        <article><strong>01</strong><h3>{copy.quoteStepSelect}</h3><p>{copy.quoteStepSelectBody}</p></article>
        <article><strong>02</strong><h3>{copy.quoteStepReceive}</h3><p>{copy.quoteStepReceiveBody}</p></article>
        <article><strong>03</strong><h3>{copy.quoteStepConfirm}</h3><p>{copy.quoteStepConfirmBody}</p></article>
      </div>
      <aside className="pd-shipping-note"><strong>{copy.shippingNotice}</strong><p>{shippingNoticeBody}</p></aside>
    </section>

    <section className="pd-related">
      <div className="pd-section-heading">
        <div><p>{copy.category}</p><h2>{copy.categoryProducts}</h2></div>
        {editor ? <span>{copy.categoryView}</span> : <Link to={toLocalePath(`/products?category=${product.categoryId}`)}>{copy.categoryView}</Link>}
      </div>
      {relatedProducts.length > 0
        ? <div className="catalog-grid">{relatedProducts.map((item) => <CatalogCard key={item.productId} product={item} />)}</div>
        : <div className="empty related-empty">{copy.emptyRelated}</div>}
    </section>

    <div className="pd-mobile-action" aria-label={copy.quoteNotice}>
      {showQuoteTools
        ? editor ? <button className="pd-primary-action" disabled type="button">{copy.directInquirySubmit}</button> : <a className="pd-primary-action" href="#pd-inquiry-form">{copy.directInquirySubmit}</a>
        : !canViewAdminPrices && <Link className="pd-secondary-action" to={toLocalePath(accessLink)}>{accessLabel}</Link>}
    </div>
  </main>
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const {
    addInquiryItem,
    approvedPrice,
    dataError,
    dataStatus,
    getAdminPriceBooks,
    getPrice,
    isAdmin,
    isApproved,
    products,
    submitProductInquiry,
    viewerState,
  } = useCommerce()
  const { contentLocale, locale, toLocalePath } = useLocalePath()
  const product = products.find((item) => item.productId === productId)

  if (dataStatus === 'loading') {
    return <main className="content pd-page"><div className="empty">Loading product details...</div></main>
  }
  if (dataStatus === 'error') {
    return <main className="content pd-page"><div className="empty"><h1>Catalog API unavailable</h1><p>{dataError || 'Unable to load product details.'}</p></div></main>
  }

  return <ProductDetailView
    addInquiryItem={addInquiryItem}
    adminPriceBooks={product && isAdmin ? getAdminPriceBooks(product.productId) : []}
    approvedAmount={product ? approvedPrice(product.productId) : null}
    contentLocale={contentLocale}
    isAdmin={isAdmin}
    isApproved={isApproved}
    locale={locale}
    price={product ? getPrice(product.productId) : null}
    product={product}
    products={products}
    submitProductInquiry={submitProductInquiry}
    toLocalePath={toLocalePath}
    viewerState={viewerState}
  />
}
