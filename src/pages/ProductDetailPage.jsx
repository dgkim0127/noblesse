import {
  ChevronLeft,
  ChevronRight,
  Images,
  LockKeyhole,
  Minus,
  Plus,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
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

const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

const detailCopy = {
  kr: {
    addToInquiry: '견적 리스트에 담기',
    adminPriceBooks: '관리자 가격표',
    approvalRequired: '승인 후 가격 확인 가능',
    assuranceAssetsBody: '상세 이미지와 등록 사양을 기준으로 견적 검토를 진행합니다.',
    assuranceAssetsTitle: '바이어 자료',
    assuranceMarketBody: '국내와 해외 B2B 거래 검토를 위한 카탈로그 상품입니다.',
    assuranceMarketTitle: '거래 검토 가능',
    assuranceMoqBody: '승인된 거래처에게만 MOQ와 가격 기준을 안내합니다.',
    assuranceMoqTitle: '승인 후 MOQ 안내',
    assuranceQcBody: '출고 전 상품 상태와 사양은 견적 단계에서 다시 확인합니다.',
    assuranceQcTitle: '사양 확인',
    available: '가능',
    back: '상품 목록으로',
    badgesExportReady: 'EXPORT READY',
    badgesNew: 'NEW',
    buyerOnly: '승인된 거래처만 가격과 MOQ를 확인할 수 있습니다.',
    buyerPoint: '바이어 포인트',
    buyerPointBodyOne: '소재, 색상, 사이즈 정보를 견적 요청 전에 한 화면에서 확인합니다.',
    buyerPointBodyThree: '선택 옵션과 수량은 견적 리스트에서 다시 조정할 수 있습니다.',
    buyerPointBodyTwo: '승인된 거래처에게만 가격과 MOQ 기준을 노출합니다.',
    buyerPointTitleOne: '간단한 검토',
    buyerPointTitleThree: '견적 흐름 유지',
    buyerPointTitleTwo: '승인 기반 가격',
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
    moqAfterReview: '승인 후 안내',
    noImage: '등록된 상품 이미지가 없습니다.',
    notFound: '상품을 찾을 수 없습니다.',
    origin: '원산지',
    priceUnavailable: '등록된 승인 가격이 없습니다.',
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
    requestAccess: '거래처 승인 요청',
    reviewStatus: '승인 상태 보기',
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
    statusGuest: '회원가입 후 거래처 승인을 요청하면 가격과 견적 기능을 사용할 수 있습니다.',
    statusPending: '거래처 정보 확인 중입니다. 승인 후 가격과 견적 리스트 기능이 열립니다.',
    thumbnail: '썸네일',
    unavailable: '불가',
    viewLarge: '큰 이미지 보기',
    wholesale: '도매 기준',
  },
  en: {
    addToInquiry: 'Add to Inquiry List',
    adminPriceBooks: 'Admin price books',
    approvalRequired: 'Price available after approval',
    assuranceAssetsBody: 'Detail images and registered specifications support quote review.',
    assuranceAssetsTitle: 'Buyer assets',
    assuranceMarketBody: 'Catalog-ready for domestic and overseas B2B review.',
    assuranceMarketTitle: 'Market ready',
    assuranceMoqBody: 'MOQ and price basis are shared only with approved buyers.',
    assuranceMoqTitle: 'Approval-based MOQ',
    assuranceQcBody: 'Product condition and specifications are checked again during quote review.',
    assuranceQcTitle: 'Spec check',
    available: 'Available',
    back: 'Back to products',
    badgesExportReady: 'EXPORT READY',
    badgesNew: 'NEW',
    buyerOnly: 'Only approved buyers can view price and MOQ.',
    buyerPoint: 'Buyer point',
    buyerPointBodyOne: 'Review material, color, and size information before requesting a quote.',
    buyerPointBodyThree: 'Selected options and quantity can be adjusted again in the Inquiry List.',
    buyerPointBodyTwo: 'Price and MOQ are shown only to approved buyers.',
    buyerPointTitleOne: 'Easy review',
    buyerPointTitleThree: 'Quote-first flow',
    buyerPointTitleTwo: 'Approval-based price',
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
    moqAfterReview: 'Shared after approval',
    noImage: 'No product image is registered.',
    notFound: 'Product not found.',
    origin: 'Origin',
    priceUnavailable: 'Approved buyer price is not registered.',
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
    requestAccess: 'Request buyer access',
    reviewStatus: 'View approval status',
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
    statusGuest: 'Request buyer approval after registration to use prices and quote tools.',
    statusPending: 'Your buyer profile is under review. Price and Inquiry List tools open after approval.',
    thumbnail: 'thumbnail',
    unavailable: 'Unavailable',
    viewLarge: 'View large image',
    wholesale: 'Wholesale basis',
  },
  jp: {
    addToInquiry: '見積リストに追加',
    adminPriceBooks: '管理者価格表',
    approvalRequired: '承認後に価格を確認できます',
    assuranceAssetsBody: '詳細画像と登録仕様をもとに見積確認を進めます。',
    assuranceAssetsTitle: 'バイヤー資料',
    assuranceMarketBody: '国内外B2B取引の検討に対応するカタログ商品です。',
    assuranceMarketTitle: '取引検討可能',
    assuranceMoqBody: 'MOQと価格基準は承認済み取引先にのみ案内されます。',
    assuranceMoqTitle: '承認後MOQ案内',
    assuranceQcBody: '出荷前の商品状態と仕様は見積段階で再確認します。',
    assuranceQcTitle: '仕様確認',
    available: '可能',
    back: '商品一覧へ戻る',
    badgesExportReady: 'EXPORT READY',
    badgesNew: 'NEW',
    buyerOnly: '承認済み取引先のみ価格とMOQを確認できます。',
    buyerPoint: 'バイヤーポイント',
    buyerPointBodyOne: '素材、カラー、サイズ情報を見積依頼前に確認できます。',
    buyerPointBodyThree: '選択したオプションと数量は見積リストで再調整できます。',
    buyerPointBodyTwo: '価格とMOQは承認済み取引先にのみ表示されます。',
    buyerPointTitleOne: '確認しやすい構成',
    buyerPointTitleThree: '見積中心の流れ',
    buyerPointTitleTwo: '承認制価格',
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
    moqAfterReview: '承認後に案内',
    noImage: '登録された商品画像がありません。',
    notFound: '商品が見つかりません。',
    origin: '原産地',
    priceUnavailable: '承認価格が登録されていません。',
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
    requestAccess: '取引先承認を申請',
    reviewStatus: '承認状況を見る',
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
    statusGuest: '会員登録後に取引先承認を申請すると、価格と見積機能を利用できます。',
    statusPending: '取引先情報を確認中です。承認後に価格と見積リスト機能が利用できます。',
    thumbnail: 'サムネイル',
    unavailable: '不可',
    viewLarge: '大きい画像を見る',
    wholesale: '卸取引基準',
  },
  cn: {
    addToInquiry: '加入詢價清單',
    adminPriceBooks: '管理員價格表',
    approvalRequired: '核准後可查看價格',
    assuranceAssetsBody: '以詳細圖片與登錄規格作為詢價審核依據。',
    assuranceAssetsTitle: '買家資料',
    assuranceMarketBody: '適用於台灣與海外 B2B 交易審核的型錄商品。',
    assuranceMarketTitle: '可供交易審核',
    assuranceMoqBody: 'MOQ 與價格基準僅提供給已核准買家。',
    assuranceMoqTitle: '核准後 MOQ',
    assuranceQcBody: '出貨前會於詢價階段再次確認商品狀態與規格。',
    assuranceQcTitle: '規格確認',
    available: '可支援',
    back: '返回商品列表',
    badgesExportReady: 'EXPORT READY',
    badgesNew: 'NEW',
    buyerOnly: '只有核准的買家可以查看價格與 MOQ。',
    buyerPoint: '買家重點',
    buyerPointBodyOne: '詢價前可集中確認材質、顏色與尺寸資訊。',
    buyerPointBodyThree: '選擇的選項與數量可在詢價清單中再次調整。',
    buyerPointBodyTwo: '價格與 MOQ 僅對已核准買家顯示。',
    buyerPointTitleOne: '容易檢視',
    buyerPointTitleThree: '以詢價為中心',
    buyerPointTitleTwo: '核准制價格',
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
    moqAfterReview: '核准後提供',
    noImage: '尚未登錄商品圖片。',
    notFound: '找不到商品。',
    origin: '產地',
    priceUnavailable: '尚未登錄核准買家價格。',
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
    requestAccess: '申請買家核准',
    reviewStatus: '查看核准狀態',
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
    statusGuest: '註冊後申請買家核准，即可使用價格與詢價功能。',
    statusPending: '買家資料審核中。核准後即可使用價格與詢價清單功能。',
    thumbnail: '縮圖',
    unavailable: '不支援',
    viewLarge: '查看大圖',
    wholesale: '批發基準',
  },
}

const cleanDetailCopy = {
  en: detailCopy.en,
  kr: {
    ...detailCopy.en,
    addToInquiry: '견적 리스트에 담기',
    adminPriceBooks: '관리자 가격표',
    approvalRequired: '승인 후 가격 확인 가능',
    assuranceAssetsBody: '상세 이미지와 등록 사양을 기준으로 견적 검토를 진행합니다.',
    assuranceAssetsTitle: '바이어 자료',
    assuranceMarketBody: '국내외 B2B 거래 검토를 위한 카탈로그 상품입니다.',
    assuranceMarketTitle: '거래 검토 가능',
    assuranceMoqBody: '승인된 거래처에게만 MOQ와 가격 기준을 안내합니다.',
    assuranceMoqTitle: '승인 후 MOQ 안내',
    assuranceQcBody: '출고 전 상품 상태와 사양은 견적 단계에서 다시 확인합니다.',
    assuranceQcTitle: '사양 확인',
    available: '가능',
    back: '상품 목록으로',
    buyerOnly: '승인된 거래처만 가격과 MOQ를 확인할 수 있습니다.',
    buyerPoint: '바이어 포인트',
    buyerPointBodyOne: '소재, 색상, 사이즈 정보를 견적 요청 전에 한 화면에서 확인합니다.',
    buyerPointBodyThree: '선택 옵션과 수량은 견적 리스트에서 다시 조정할 수 있습니다.',
    buyerPointBodyTwo: '승인된 거래처에게만 가격과 MOQ 기준을 노출합니다.',
    buyerPointTitleOne: '간단한 검토',
    buyerPointTitleThree: '견적 흐름 유지',
    buyerPointTitleTwo: '승인 기반 가격',
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
    moqAfterReview: '승인 후 안내',
    noImage: '등록된 상품 이미지가 없습니다.',
    notFound: '상품을 찾을 수 없습니다.',
    origin: '원산지',
    priceUnavailable: '등록된 승인 가격이 없습니다.',
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
    requestAccess: '거래처 승인 요청',
    reviewStatus: '승인 상태 보기',
    selectedImage: '선택된 이미지',
    shippingNotice: '출고 안내',
    shippingNoticeText: '출고 일정, 포장, 교환 가능 여부는 견적 검토 이후 상품 상태와 거래 조건에 따라 별도로 안내합니다.',
    size: '사이즈',
    sizeGuide: '사이즈 가이드',
    sizeGuideText: '피어싱 사이즈와 착용감은 디자인과 측정 방식에 따라 달라질 수 있습니다. 견적 요청 전 상세 규격을 확인해 주세요.',
    sizes: '사이즈',
    specification: '상세 사양',
    specificationIntro: '견적 검토에는 장식 문구보다 등록된 구조와 사양을 사용합니다.',
    sectionDelivery: '출고 안내',
    sectionMaterial: '소재 안내',
    sectionOverview: '개요',
    sectionSpecification: '상세 사양',
    quietDetailHeadline: '작은 피어싱도 한눈에 검토할 수 있게 정리했습니다.',
    quietDetailLead: '이미지, 소재, 옵션, 견적 안내를 분리해 바이어가 필요한 정보를 빠르게 확인할 수 있습니다.',
    statusGuest: '회원가입 후 거래처 승인을 요청하면 가격과 견적 기능을 사용할 수 있습니다.',
    statusPending: '거래처 정보 확인 중입니다. 승인 후 가격과 견적 리스트 기능이 열립니다.',
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
  },
  jp: {
    ...detailCopy.en,
    addToInquiry: '見積リストに追加',
    adminPriceBooks: '管理者価格表',
    approvalRequired: '承認後に価格確認可能',
    category: 'カテゴリー',
    colors: 'カラー',
    exportAvailability: '輸出可否',
    material: '素材',
    origin: '原産地',
    productCode: '商品コード',
    productInfo: '商品情報',
    quoteNotice: '見積案内',
    requestAccess: '取引先承認を申請',
    reviewStatus: '承認状況を見る',
    sectionDelivery: '出荷案内',
    sectionMaterial: '素材案内',
    sectionOverview: '概要',
    sectionSpecification: '詳細仕様',
    specification: '詳細仕様',
    specificationIntro: '見積検討には装飾的な説明ではなく登録された仕様を使用します。',
    statusGuest: '会員登録後、取引先承認を申請すると価格と見積機能を利用できます。',
    statusPending: '取引先情報を確認中です。承認後に価格と見積リスト機能が利用できます。',
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
  },
  cn: {
    ...detailCopy.en,
    addToInquiry: '加入詢價清單',
    adminPriceBooks: '管理者價格表',
    approvalRequired: '核准後可查看價格',
    category: '分類',
    colors: '顏色',
    exportAvailability: '出口可否',
    material: '材質',
    origin: '產地',
    productCode: '商品代碼',
    productInfo: '商品資訊',
    quoteNotice: '詢價說明',
    requestAccess: '申請買家核准',
    reviewStatus: '查看核准狀態',
    sectionDelivery: '出貨說明',
    sectionMaterial: '材質說明',
    sectionOverview: '概要',
    sectionSpecification: '詳細規格',
    specification: '詳細規格',
    specificationIntro: '詢價判斷以登錄的結構與規格為準，而不是裝飾文案。',
    statusGuest: '註冊並申請買家核准後，即可使用價格與詢價功能。',
    statusPending: '買家資料審核中。核准後即可使用價格與詢價清單功能。',
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
  },
}

const directInquiryCopy = {
  en: {
    directInquiryError: 'Unable to send this quote request. Please check the selected options and buyer approval status.',
    directInquiryMemo: 'Request note',
    directInquiryMemoPlaceholder: 'Add quantity, finish, lead time, or other details for the Noblesse team to review.',
    directInquirySubmit: 'Request quote for this product',
    directInquirySubmitting: 'Sending request...',
    directInquirySuccess: 'Your product quote request has been received.',
    directInquiryTitle: 'Product quote request',
    inquiryRef: 'Inquiry number',
    inquiryStatus: 'Status',
    viewInquiry: 'View my inquiry',
  },
  kr: {
    directInquiryError: '이 상품 견적 요청을 보낼 수 없습니다. 선택 항목과 거래처 승인 상태를 확인해 주세요.',
    directInquiryMemo: '요청 메모',
    directInquiryMemoPlaceholder: '필요한 수량, 색상, 납기나 확인할 내용을 적어주세요.',
    directInquirySubmit: '이 상품으로 견적 요청',
    directInquirySubmitting: '문의 접수 중...',
    directInquirySuccess: '상품 견적 요청이 접수되었습니다.',
    directInquiryTitle: '상품 견적 요청',
    inquiryRef: '문의 번호',
    inquiryStatus: '상태',
    viewInquiry: '내 견적 요청 보기',
  },
  jp: {
    directInquiryError: 'この商品の見積依頼を送信できません。選択内容とバイヤー承認状態を確認してください。',
    directInquiryMemo: '依頼メモ',
    directInquiryMemoPlaceholder: '必要数量、カラー、納期、確認したい内容を入力してください。',
    directInquirySubmit: 'この商品で見積依頼',
    directInquirySubmitting: '依頼を送信中...',
    directInquirySuccess: '商品の見積依頼を受け付けました。',
    directInquiryTitle: '商品の見積依頼',
    inquiryRef: '依頼番号',
    inquiryStatus: '状態',
    viewInquiry: '見積依頼を見る',
  },
  cn: {
    directInquiryError: '無法送出此商品詢價。請確認選項與買家審核狀態。',
    directInquiryMemo: '詢價備註',
    directInquiryMemoPlaceholder: '請填寫需要數量、顏色、交期或希望確認的內容。',
    directInquirySubmit: '以此商品送出詢價',
    directInquirySubmitting: '正在送出詢價...',
    directInquirySuccess: '商品詢價已送出。',
    directInquiryTitle: '商品詢價',
    inquiryRef: '詢價編號',
    inquiryStatus: '狀態',
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
  const imageSet = product?.imageSet || {}
  const candidates = [
    { id: 'detail', src: imageSet.detail, label: copy.selectedImage },
    { id: 'zoom', src: imageSet.zoom, label: copy.viewLarge },
    { id: 'card', src: imageSet.card, label: copy.gallery },
    { id: 'thumb', src: imageSet.thumb, label: copy.thumbnail },
  ]
  const seen = new Set()
  return candidates.filter((image) => {
    if (!image.src || seen.has(image.src)) return false
    seen.add(image.src)
    return true
  }).map((image) => ({ ...image, alt: productAlt }))
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

function ProductGallery({ copy, product, productAlt }) {
  const images = useMemo(() => buildGalleryImages(product, productAlt, copy), [copy, product, productAlt])
  const [selectedSrc, setSelectedSrc] = useState(images[0]?.src || '')

  useEffect(() => {
    setSelectedSrc(images[0]?.src || '')
  }, [images])

  const selectedImage = images.find((image) => image.src === selectedSrc) || images[0] || null
  const secondaryImages = images.filter((image) => image.src !== selectedImage?.src).slice(0, 2)

  return <section className={`pd-gallery ${secondaryImages.length > 0 ? 'has-side-images' : 'is-single'}`} aria-label={copy.gallery}>
    <div className="pd-gallery-grid">
      <figure className={`pd-main-image tone-${product.tone}`}>
        {selectedImage
          ? <img src={selectedImage.src} alt={selectedImage.alt} loading="eager" width="1200" height="1200" onError={(event) => { event.currentTarget.hidden = true }} />
          : <div className="pd-image-placeholder"><Images size={32} /><span>{copy.noImage}</span></div>}
      </figure>
      {secondaryImages.length > 0 && <div className="pd-side-images" aria-hidden="true">
        {secondaryImages.map((image) => <figure className="pd-side-image" key={`side-${image.id}`}>
          <img src={image.src} alt="" loading="lazy" width="600" height="600" onError={(event) => { event.currentTarget.hidden = true }} />
        </figure>)}
      </div>}
    </div>
    {images.length > 1 && <div className="pd-thumbs" role="list" aria-label={copy.thumbnail}>
      {images.map((image) => <button
        aria-label={image.label}
        aria-pressed={selectedImage?.src === image.src}
        className={selectedImage?.src === image.src ? 'pd-thumb is-active' : 'pd-thumb'}
        key={image.id}
        onClick={() => setSelectedSrc(image.src)}
        type="button"
      >
        <img src={image.src} alt="" loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />
      </button>)}
    </div>}
    {product.imageSet?.zoom && <a className="pd-large-link" href={product.imageSet.zoom} rel="noreferrer" target="_blank">{copy.viewLarge}<ChevronRight size={14} /></a>}
  </section>
}

function OptionButtons({ label, options, selected, onSelect }) {
  const safeOptions = asList(options)
  if (safeOptions.length === 0) return null
  return <div className="pd-option-group">
    <span>{label}</span>
    <div className="pd-option-buttons">
      {safeOptions.map((option) => <button className={selected === option ? 'pd-option-button is-active' : 'pd-option-button'} key={option} type="button" onClick={() => onSelect(option)}>{option}</button>)}
    </div>
  </div>
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
  const copy = getDetailCopy(contentLocale)
  const product = products.find((item) => item.productId === productId)
  const productName = product ? getLocalizedProductName(product, locale) : ''
  const productAlt = product ? getLocalizedProductAlt(product, locale) : ''
  const description = product ? getLocalizedProductDescription(product, locale) : ''
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const price = product ? getPrice(product.productId) : null
  const approvedAmount = product ? approvedPrice(product.productId) : null
  const adminPriceBooks = product && isAdmin ? getAdminPriceBooks(product.productId) : []
  const adminPriceItems = adminPriceBooks.map(formatAdminPriceBook)
  const canUseTradeTerms = Boolean(isApproved && price && approvedAmount !== null)
  const canRequestProductQuote = Boolean(isApproved && product)
  const canViewAdminPrices = Boolean(isAdmin && adminPriceBooks.length > 0)
  const requestMoq = canUseTradeTerms ? price.moq : product?.moqDefault || 1
  const visibleMoq = canUseTradeTerms ? price.moq : canRequestProductQuote ? requestMoq : canViewAdminPrices ? adminPriceBooks[0]?.moq : null
  const [quantity, setQuantity] = useState(visibleMoq || 1)
  const [directMemo, setDirectMemo] = useState('')
  const [directStatus, setDirectStatus] = useState('idle')
  const [directError, setDirectError] = useState('')
  const [directInquiry, setDirectInquiry] = useState(null)

  useEffect(() => {
    setSelectedColor(product?.colors?.[0] ?? '')
    setSelectedSize(product?.sizes?.[0] ?? '')
  }, [product?.productId, product?.colors, product?.sizes])

  useEffect(() => {
    if (visibleMoq) setQuantity(visibleMoq)
  }, [visibleMoq])

  useEffect(() => {
    setDirectMemo('')
    setDirectStatus('idle')
    setDirectError('')
    setDirectInquiry(null)
  }, [product?.productId])

  if (dataStatus === 'loading') {
    return <main className="content pd-page"><div className="empty">Loading product details...</div></main>
  }

  if (dataStatus === 'error') {
    return <main className="content pd-page"><div className="empty"><h1>Catalog API unavailable</h1><p>{dataError || 'Unable to load product details.'}</p></div></main>
  }

  if (!product) return <main className="content pd-page"><div className="empty">{copy.notFound}</div></main>

  const categoryName = getLocalizedCategoryName(product, contentLocale)
  const colors = asList(product.colors)
  const sizes = asList(product.sizes)
  const activeColor = colors.includes(selectedColor) ? selectedColor : colors[0] ?? ''
  const activeSize = sizes.includes(selectedSize) ? selectedSize : sizes[0] ?? ''
  const productSpecs = product.specs || {}
  const productDetailContent = getLocalizedProductDetailContent(product, locale)
  const specUnit = productSpecs.unit || 'mm'
  const overviewBody = productDetailContent.description || productDetailContent.body || description || copy.quietDetailLead
  const materialGuideBody = productDetailContent.materialInfo || (product.material ? copy.materialGuideText(product.material) : '')
  const sizeGuideBody = productDetailContent.sizeGuide || copy.sizeGuideText
  const shippingNoticeBody = productDetailContent.exchangeNotice || copy.shippingNoticeText
  const quoteWorkflowLead = productDetailContent.wholesaleNotice || copy.quoteWorkflowLead
  const currentQuantity = normalizeQuantity(quantity, requestMoq || 1)
  const accessLink = viewerState === 'pending' ? '/approval-pending' : '/register'
  const accessLabel = viewerState === 'pending' ? copy.reviewStatus : copy.requestAccess
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

  const specificationRows = [
    [copy.gauge, productSpecs.gauge],
    [copy.length, withUnit(productSpecs.length, specUnit)],
    [copy.barLength, withUnit(productSpecs.barLength, specUnit)],
    [copy.postLength, withUnit(productSpecs.postLength, specUnit)],
    [copy.ballSize, withUnit(productSpecs.ballSize, specUnit)],
    [copy.charmSize, withUnit(productSpecs.charmSize, specUnit)],
    [copy.totalLength, withUnit(productSpecs.totalLength, specUnit)],
    [copy.innerDiameter, withUnit(productSpecs.innerDiameter, specUnit)],
    [copy.barThickness, withUnit(productSpecs.barThickness, specUnit)],
    [copy.decorationType, productSpecs.decorationType],
    [copy.decorationColor, productSpecs.decorationColor],
    [copy.decorationSize, withUnit(productSpecs.decorationSize, specUnit)],
    [copy.decorationCount, productSpecs.decorationCount],
    [copy.settingMethod, productSpecs.settingMethod],
    [copy.specNote, productSpecs.specNote || productSpecs.decorationNote],
  ].filter(([, value]) => value)

  const addSelectedItem = () => addInquiryItem(product.productId, { color: activeColor, size: activeSize }, currentQuantity)
  const updateQuantity = (nextQuantity) => setQuantity(normalizeQuantity(nextQuantity, requestMoq || 1))
  const submitSelectedProductInquiry = async () => {
    if (!canRequestProductQuote || directStatus === 'submitting') return
    setDirectStatus('submitting')
    setDirectError('')
    setDirectInquiry(null)
    try {
      const inquiry = await submitProductInquiry({
        productId: product.productId,
        option: { color: activeColor, size: activeSize },
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

  return <main className="content pd-page">
    <nav className="pd-breadcrumb" aria-label="Breadcrumb">
      <Link to={toLocalePath('/products')}><ChevronLeft size={16} />{copy.back}</Link>
      <span>{categoryName}</span>
      <span>{product.code}</span>
    </nav>

    <section className="pd-hero">
      <ProductGallery copy={copy} product={product} productAlt={productAlt} />

      <aside className="pd-panel" aria-label={copy.productInfo}>
        <div className="pd-badges">
          <span>{copy.badgesNew}</span>
          {product.isExportAvailable && <span>{copy.badgesExportReady}</span>}
        </div>
        <p className="pd-eyebrow">{copy.productCode} {product.code}</p>
        <h1>{productName}</h1>
        {product.nameEn && product.nameEn !== productName && <p className="pd-alt-name">{product.nameEn}</p>}
        {description && <p className="pd-summary">{description}</p>}

        <dl className="pd-meta-list">
          {productInfoRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          {visibleMoq && <div><dt>{copy.moq}</dt><dd>{visibleMoq} pcs</dd></div>}
        </dl>

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

        {canRequestProductQuote ? <div className="pd-trade-box">
          <small>{copy.approvalRequired}</small>
          {canUseTradeTerms
            ? <>
              <strong>{formatMoney(approvedAmount, price.currency)}</strong>
              <span>{copy.moq} {price.moq} pcs · {price.market} · {price.currency}</span>
            </>
            : <>
              <strong>{copy.priceUnavailable}</strong>
              <span>{copy.quoteNoticeText}</span>
            </>}
          <OptionButtons label={copy.color} options={colors} selected={activeColor} onSelect={setSelectedColor} />
          <OptionButtons label={copy.size} options={sizes} selected={activeSize} onSelect={setSelectedSize} />
          <div className="pd-option-group">
            <span>{copy.quantity}</span>
            <div className="pd-quantity-control">
              <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(currentQuantity - requestMoq)}><Minus size={15} /></button>
              <input value={currentQuantity} type="number" min={requestMoq} step={requestMoq} onBlur={(event) => updateQuantity(event.target.value)} onChange={(event) => updateQuantity(event.target.value)} />
              <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(currentQuantity + requestMoq)}><Plus size={15} /></button>
            </div>
            <small>{copy.quantityNote(requestMoq)}</small>
          </div>
          <div className="pd-direct-inquiry-form" id="pd-inquiry-form">
            <label htmlFor="pd-direct-inquiry-memo">{copy.directInquiryTitle}</label>
            <textarea
              id="pd-direct-inquiry-memo"
              maxLength={1000}
              onChange={(event) => setDirectMemo(event.target.value)}
              placeholder={copy.directInquiryMemoPlaceholder}
              rows={4}
              value={directMemo}
            />
            <div className="pd-direct-actions">
              <button className="pd-secondary-action" type="button" onClick={addSelectedItem}><Plus size={17} />{copy.addToInquiry}</button>
              <button
                className="pd-primary-action"
                disabled={directStatus === 'submitting'}
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

    <section className="pd-assurance-strip" aria-label={copy.guide}>
      <article><strong>{copy.assuranceMoqTitle}</strong><span>{copy.assuranceMoqBody}</span></article>
      <article><strong>{copy.assuranceMarketTitle}</strong><span>{copy.assuranceMarketBody}</span></article>
      <article><strong>{copy.assuranceAssetsTitle}</strong><span>{copy.assuranceAssetsBody}</span></article>
      <article><strong>{copy.assuranceQcTitle}</strong><span>{copy.assuranceQcBody}</span></article>
    </section>

    <nav className="pd-section-nav" aria-label={copy.productInfo}>
      <a href="#pd-overview">{copy.sectionOverview}</a>
      <a href="#pd-specification">{copy.sectionSpecification}</a>
      <a href="#pd-material">{copy.sectionMaterial}</a>
      <a href="#pd-delivery">{copy.sectionDelivery}</a>
    </nav>

    <section className="pd-editorial pd-overview" id="pd-overview">
      <div className="pd-editorial-copy">
        <p className="pd-editorial-eyebrow">{copy.quietDetailEyebrow}</p>
        <h2>{productDetailContent.headline || copy.quietDetailHeadline}</h2>
        <p>{overviewBody}</p>
      </div>
      <div className="pd-overview-grid">
        <div className="pd-overview-media">
          {product.imageSet?.card || product.imageSet?.detail
            ? <img src={product.imageSet.card || product.imageSet.detail} alt={productAlt} loading="lazy" />
            : <div className="pd-image-placeholder"><Images size={30} /><span>{copy.noImage}</span></div>}
        </div>
        <article className="pd-overview-note">
          <span>01 / FORM</span>
          <h3>{productDetailContent.decoration || copy.buyerPointTitleOne}</h3>
          <p>{productDetailContent.fit || copy.buyerPointBodyOne}</p>
        </article>
      </div>
      <div className="pd-buyer-points" aria-label={copy.buyerPoint}>
        <p>{copy.buyerPoint}</p>
        <article><strong>01</strong><h3>{copy.buyerPointTitleOne}</h3><span>{copy.buyerPointBodyOne}</span></article>
        <article><strong>02</strong><h3>{copy.buyerPointTitleTwo}</h3><span>{copy.buyerPointBodyTwo}</span></article>
        <article><strong>03</strong><h3>{copy.buyerPointTitleThree}</h3><span>{copy.buyerPointBodyThree}</span></article>
      </div>
    </section>

    <section className="pd-editorial pd-specification-section" id="pd-specification">
      <div className="pd-section-heading">
        <div><p>{copy.productInfo}</p><h2>{copy.specification}</h2></div>
        <span>{copy.specificationIntro}</span>
      </div>
      <div className="pd-spec-layout">
        <div className="pd-spec-image">
          {product.imageSet?.detail || product.imageSet?.card
            ? <img src={product.imageSet.detail || product.imageSet.card} alt={productAlt} loading="lazy" />
            : <div className="pd-image-placeholder"><Images size={30} /><span>{copy.noImage}</span></div>}
        </div>
        <dl className="pd-spec-table">
          {productInfoRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          {visibleMoq && <div><dt>{copy.moq}</dt><dd>{visibleMoq} pcs</dd></div>}
          {specificationRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </div>
    </section>

    <section className="pd-editorial pd-material-section" id="pd-material">
      <div className="pd-material-copy">
        <p className="pd-editorial-eyebrow">{copy.materialGuide}</p>
        <h2>{copy.materialHeadline}</h2>
        {materialGuideBody && <p>{materialGuideBody}</p>}
      </div>
      <div className="pd-material-cards">
        {product.material && <article><span>{product.material}</span><strong>{copy.material}</strong></article>}
        {joinList(colors) && <article><span>{joinList(colors)}</span><strong>{copy.colors}</strong></article>}
        {copy.quoteNotice && <article><span>QC</span><strong>{copy.assuranceQcTitle}</strong></article>}
      </div>
    </section>

    <section className="pd-editorial pd-delivery-section" id="pd-delivery">
      <div className="pd-section-heading">
        <div><p>{copy.wholesale}</p><h2>{copy.quoteWorkflow}</h2></div>
        <span>{quoteWorkflowLead}</span>
      </div>
      <div className="pd-process-grid">
        <article><strong>01</strong><h3>{copy.quoteStepSelect}</h3><p>{copy.quoteStepSelectBody}</p></article>
        <article><strong>02</strong><h3>{copy.quoteStepReceive}</h3><p>{copy.quoteStepReceiveBody}</p></article>
        <article><strong>03</strong><h3>{copy.quoteStepConfirm}</h3><p>{copy.quoteStepConfirmBody}</p></article>
        <article><strong>04</strong><h3>{copy.shippingNotice}</h3><p>{shippingNoticeBody}</p>{sizeGuideBody && <small>{sizeGuideBody}</small>}</article>
      </div>
    </section>

    <section className="pd-related">
      <div className="pd-section-heading">
        <div><p>{copy.category}</p><h2>{copy.categoryProducts}</h2></div>
        <Link to={toLocalePath(`/products?category=${product.categoryId}`)}>{copy.categoryView}</Link>
      </div>
      {relatedProducts.length > 0
        ? <div className="catalog-grid">{relatedProducts.map((item) => <CatalogCard key={item.productId} product={item} />)}</div>
        : <div className="empty related-empty">{copy.emptyRelated}</div>}
    </section>

    <div className="pd-mobile-action" aria-label={copy.quoteNotice}>
      {canRequestProductQuote
        ? <a className="pd-primary-action" href="#pd-inquiry-form">{copy.directInquirySubmit}</a>
        : !canViewAdminPrices && <Link className="pd-secondary-action" to={toLocalePath(accessLink)}>{accessLabel}</Link>}
    </div>
  </main>
}
