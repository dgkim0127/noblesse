import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import {
  areRequiredAgreementsAccepted,
  buildAgreementSnapshot,
  getAgreementDocument,
  getAgreementSummaryForRegister,
  getInitialAgreements,
} from '../services/agreementService'
import { resolveLocaleCopy, useLocalePath } from '../utils/locale'

const registerCopy = {
  kr: {
    eyebrow: '거래처 문의',
    title: '국내·해외 거래처 문의',
    intro: '피어싱 B2B 카탈로그를 확인하고 바이어 등록 문의를 남겨주세요.',
    helper: '거래 정보를 남겨주시면 담당자가 확인 후 회원가, MOQ, 거래 조건과 문의 가능 여부를 안내드립니다.',
    noticeTitle: '문의 전 확인해주세요',
    noticeItems: [
      '거래처 정보는 담당자가 직접 확인합니다.',
      '승인 후 회원가와 거래 조건 안내가 가능합니다.',
      '견적 요청은 최종 주문이 아닙니다.',
      '최종 가격, 재고, 납기, 배송 조건은 Noblesse 확인 후 안내됩니다.',
    ],
    groups: { buyer: '거래처 정보', contact: '연락처 정보', business: '비즈니스 정보', memo: '문의 메모' },
    fields: {
      email: '이메일',
      password: '비밀번호',
      companyName: '회사명',
      contactName: '담당자명',
      country: '국가',
      preferredLanguage: '선호 언어',
      phone: '전화번호',
      messengerType: '메신저 종류',
      messengerId: '메신저 ID',
      salesChannel: '판매 채널',
      businessNumber: '사업자 번호',
      requestMemo: '문의 메모',
    },
    memoPlaceholder: '운영 중인 스토어, 주요 시장, 관심 있는 피어싱 라인이나 예상 문의 수량을 알려주세요.',
    approvalTitle: '담당자 확인 안내',
    approvalBody: '거래처 정보는 담당자가 직접 확인합니다. 확인 전까지 가격과 견적 문의 기능은 잠겨 있습니다.',
    orderDisclaimer: '견적 문의는 최종 주문이 아니며, 담당자 확인 후 거래 조건을 안내드립니다.',
    agreementsEyebrow: '약관',
    agreementsTitle: '약관 및 개인정보 동의',
    agreementsIntro: '거래처 문의에는 필수 약관 3개 동의가 필요합니다. 마케팅 안내 수신은 선택입니다.',
    allAgree: '전체 동의',
    allAgreeSub: '필수 및 선택 항목에 모두 동의',
    required: '[필수]',
    optional: '[선택]',
    viewDetails: '자세히 보기',
    privacyPolicy: '개인정보 처리방침 보기',
    warning: '거래처 문의를 위해 필수 약관을 모두 동의해주세요.',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '거래처 문의 보내기',
    back: '로그인으로 돌아가기',
  },
  en: {
    eyebrow: 'TRADE INQUIRY',
    title: 'Domestic & international buyer inquiry',
    intro: 'Browse the B2B piercing catalog and send a buyer registration inquiry.',
    helper: 'Our team reviews your trade information and then guides pricing, MOQ, trade terms, and inquiry availability.',
    noticeTitle: 'Before you inquire',
    noticeItems: [
      'Trade information is reviewed manually by the Noblesse team.',
      'Member pricing and trade terms can be guided after approval.',
      'Request Quote is not a final confirmation.',
      'Final price, stock, lead time, and shipping terms are confirmed by Noblesse.',
    ],
    groups: { buyer: 'Trade Information', contact: 'Contact Information', business: 'Business Information', memo: 'Inquiry Memo' },
    fields: {
      email: 'Email',
      password: 'Password',
      companyName: 'Company Name',
      contactName: 'Contact Name',
      country: 'Country',
      preferredLanguage: 'Preferred Language',
      phone: 'Phone',
      messengerType: 'Messenger Type',
      messengerId: 'Messenger ID',
      salesChannel: 'Sales Channel',
      businessNumber: 'Business Number',
      requestMemo: 'Inquiry Memo',
    },
    memoPlaceholder: 'Tell us about your store, market, preferred piercing line, or expected inquiry quantity.',
    approvalTitle: 'Manual Review Notice',
    approvalBody: 'Trade information is reviewed manually. Prices and quote inquiry features remain locked until review is complete.',
    orderDisclaimer: 'Quote inquiries are not final orders. Noblesse confirms trade terms after review.',
    agreementsEyebrow: 'AGREEMENTS',
    agreementsTitle: 'Terms and privacy consent',
    agreementsIntro: 'Membership request requires acceptance of three required agreement items. Product and catalog updates are optional.',
    allAgree: 'Agree to all',
    allAgreeSub: 'Agree to all required and optional items',
    required: '[Required]',
    optional: '[Optional]',
    viewDetails: 'View details',
    privacyPolicy: 'View Privacy Policy',
    warning: 'Please agree to all required terms to send a trade inquiry.',
    warningSub: 'All required items must be checked before submitting.',
    submit: 'Send Trade Inquiry',
    back: 'Back to Login',
  },
  jp: {
    eyebrow: '取引先お問い合わせ',
    title: '国内・海外取引先お問い合わせ',
    intro: 'B2Bピアスカタログを確認し、バイヤー登録のお問い合わせを送信してください。',
    helper: '取引情報を送信いただくと、担当者が確認後に取引条件、最小数量、見積相談の可否をご案内します。',
    noticeTitle: 'お問い合わせ前にご確認ください',
    noticeItems: [
      '取引先情報は担当者が確認します。',
      '確認後、取引条件をご案内できます。',
      '見積相談は最終確定ではありません。',
      '最終見積はNoblesse確認後にご案内します。',
    ],
    groups: { buyer: '取引先情報', contact: '連絡先情報', business: '事業者情報', memo: 'お問い合わせメモ' },
    fields: {
      email: 'メールアドレス',
      password: 'パスワード',
      companyName: '会社名',
      contactName: '担当者名',
      country: '国',
      preferredLanguage: '希望言語',
      phone: '電話番号',
      messengerType: 'メッセンジャー種別',
      messengerId: 'メッセンジャーID',
      salesChannel: '販売チャネル',
      businessNumber: '事業者番号',
      requestMemo: 'お問い合わせメモ',
    },
    memoPlaceholder: '運営中のストア、主な市場、関心のあるピアスラインや想定数量を入力してください。',
    approvalTitle: '担当者確認のご案内',
    approvalBody: '取引先情報は担当者が確認します。確認前は取引条件と見積相談機能は利用できません。',
    orderDisclaimer: '見積相談は最終注文ではありません。担当者確認後に取引条件をご案内します。',
    agreementsEyebrow: '規約',
    agreementsTitle: '規約および個人情報同意',
    agreementsIntro: '取引先お問い合わせには3つの必須同意が必要です。マーケティング案内の受信は任意です。',
    allAgree: 'すべて同意',
    allAgreeSub: '必須および任意項目にすべて同意',
    required: '[必須]',
    optional: '[任意]',
    viewDetails: '詳細を見る',
    privacyPolicy: '個人情報処理方針を見る',
    warning: '取引先お問い合わせのため、必須規約にすべて同意してください。',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '取引先お問い合わせ',
    back: 'ログインへ戻る',
  },
  cn: {
    eyebrow: '贸易咨询',
    title: '国内外买家贸易咨询',
    intro: '浏览B2B穿孔商品目录后，请提交买家登记咨询。',
    helper: '提交贸易信息后，工作人员会确认并提供交易条件、最小数量和报价咨询说明。',
    noticeTitle: '咨询前请确认',
    noticeItems: [
      '贸易信息将由工作人员确认。',
      '确认后可提供交易条件说明。',
      '报价咨询不是最终确认。',
      '最终报价由 Noblesse 确认后提供。',
    ],
    groups: { buyer: '贸易信息', contact: '联系方式', business: '业务信息', memo: '咨询备注' },
    fields: {
      email: '邮箱',
      password: '密码',
      companyName: '公司名称',
      contactName: '联系人',
      country: '国家',
      preferredLanguage: '首选语言',
      phone: '电话',
      messengerType: '通讯工具类型',
      messengerId: '通讯工具 ID',
      salesChannel: '销售渠道',
      businessNumber: '营业登记号',
      requestMemo: '咨询备注',
    },
    memoPlaceholder: '请填写您的店铺、主要市场、感兴趣的穿孔产品线或预计咨询数量。',
    approvalTitle: '工作人员确认说明',
    approvalBody: '贸易信息将由工作人员确认。确认前，交易条件和报价咨询功能将保持锁定。',
    orderDisclaimer: '报价咨询不是最终订单。工作人员确认后会说明交易条件。',
    agreementsEyebrow: '条款',
    agreementsTitle: '条款及个人信息同意',
    agreementsIntro: '提交贸易咨询需要同意3项必选条款。营销及新品通知为可选项。',
    allAgree: '全部同意',
    allAgreeSub: '同意所有必选及可选项目',
    required: '[必选]',
    optional: '[可选]',
    viewDetails: '查看详情',
    privacyPolicy: '查看隐私政策',
    warning: '请同意所有必选条款后再提交贸易咨询。',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '提交贸易咨询',
    back: '返回登录',
  },
}

const _fieldGroups = {
  buyer: [
    ['email', 'email'],
    ['password', 'password'],
    ['companyName', 'text'],
    ['contactName', 'text'],
    ['country', 'text'],
    ['preferredLanguage', 'text'],
  ],
  contact: [
    ['phone', 'tel'],
    ['messengerType', 'text'],
    ['messengerId', 'text'],
  ],
  business: [
    ['salesChannel', 'text'],
    ['businessNumber', 'text'],
  ],
}

const ageAgreementSummary = {
  key: 'age_confirmed',
  version: 'age-v1.0',
  required: true,
  titleKo: '14세 이상입니다',
  titleEn: 'I am at least 14 years old',
  sections: [],
}

const profileFieldsByLocale = {
  kr: [
    ['이름', 'name', 'text', '이름', 'field-name'],
    ['국가', 'country', 'country', '국가 검색 또는 선택', 'field-country'],
    ['업체명', 'companyName', 'text', '업체명', 'field-company'],
    ['주소', 'address', 'text', '주소', 'field-address'],
    ['첨부파일', 'attachment', 'file', '', 'field-attachment', 'attachment'],
    ['아이디', 'loginId', 'id', '아이디', 'field-id'],
    ['비밀번호', 'password', 'password', '비밀번호', 'field-password', 'password'],
    ['비밀번호 확인', 'passwordConfirm', 'password', '비밀번호 확인', 'field-password-confirm'],
    ['이메일', 'email', 'emailComposite', '이메일 아이디', 'field-email'],
    ['전화번호', 'phone', 'tel', '전화번호', 'field-phone'],
  ],
  en: [
    ['Name', 'name', 'text', 'Name', 'field-name'],
    ['Country', 'country', 'country', 'Search or select country', 'field-country'],
    ['Company', 'companyName', 'text', 'Company', 'field-company'],
    ['Address', 'address', 'text', 'Address', 'field-address'],
    ['Attachment', 'attachment', 'file', '', 'field-attachment', 'attachment'],
    ['ID', 'loginId', 'id', 'ID', 'field-id'],
    ['Password', 'password', 'password', 'Password', 'field-password', 'password'],
    ['Confirm password', 'passwordConfirm', 'password', 'Confirm password', 'field-password-confirm'],
    ['Email', 'email', 'emailComposite', 'Email ID', 'field-email'],
    ['Phone', 'phone', 'tel', 'Phone number', 'field-phone'],
  ],
  jp: [
    ['お名前', 'name', 'text', 'お名前', 'field-name'],
    ['国', 'country', 'country', '国を検索または選択', 'field-country'],
    ['会社名', 'companyName', 'text', '会社名', 'field-company'],
    ['住所', 'address', 'text', '住所', 'field-address'],
    ['添付ファイル', 'attachment', 'file', '', 'field-attachment', 'attachment'],
    ['ID', 'loginId', 'id', 'ID', 'field-id'],
    ['パスワード', 'password', 'password', 'パスワード', 'field-password', 'password'],
    ['パスワード確認', 'passwordConfirm', 'password', 'パスワード確認', 'field-password-confirm'],
    ['メール', 'email', 'emailComposite', 'メールID', 'field-email'],
    ['電話番号', 'phone', 'tel', '電話番号', 'field-phone'],
  ],
  cn: [
    ['姓名', 'name', 'text', '姓名', 'field-name'],
    ['国家', 'country', 'country', '搜索或选择国家', 'field-country'],
    ['公司名称', 'companyName', 'text', '公司名称', 'field-company'],
    ['地址', 'address', 'text', '地址', 'field-address'],
    ['附件', 'attachment', 'file', '', 'field-attachment', 'attachment'],
    ['ID', 'loginId', 'id', 'ID', 'field-id'],
    ['密码', 'password', 'password', '密码', 'field-password', 'password'],
    ['确认密码', 'passwordConfirm', 'password', '确认密码', 'field-password-confirm'],
    ['邮箱', 'email', 'emailComposite', '邮箱ID', 'field-email'],
    ['电话号码', 'phone', 'tel', '电话号码', 'field-phone'],
  ],
}

const registerStepCopy = {
  kr: {
    continue: '동의하기',
    submit: '가입하기',
    duplicateCheck: '중복확인',
    duplicateEmpty: '아이디를 입력해주세요.',
    duplicateShort: '아이디는 4자 이상 입력해주세요.',
    duplicateUnavailable: '이미 사용 중인 아이디입니다.',
    duplicateAvailable: '사용 가능한 아이디입니다.',
    infoTitle: '정보 입력',
    memoTitle: '문의 내용',
    memoLabel: '문의 내용',
    memoPlaceholder: '관심 제품, 예상 수량, 판매 지역 등 필요한 내용만 간단히 적어주세요.',
    backToAgreements: '동의 항목 다시 보기',
    requiredOnly: '필수 항목에만',
  },
  en: {
    continue: 'Agree',
    submit: 'Sign Up',
    duplicateCheck: 'Check ID',
    duplicateEmpty: 'Please enter an ID.',
    duplicateShort: 'Use at least 4 characters.',
    duplicateUnavailable: 'This ID is already in use.',
    duplicateAvailable: 'This ID is available.',
    infoTitle: 'Information',
    memoTitle: 'Inquiry memo',
    memoLabel: 'Inquiry memo',
    memoPlaceholder: 'Briefly add products, quantity, market, or trade notes.',
    backToAgreements: 'Back to agreements',
    requiredOnly: 'Required items only',
  },
  jp: {
    continue: '同意する',
    submit: '登録する',
    duplicateCheck: '重複確認',
    duplicateEmpty: 'IDを入力してください。',
    duplicateShort: 'IDは4文字以上で入力してください。',
    duplicateUnavailable: 'このIDはすでに使用されています。',
    duplicateAvailable: '使用できるIDです。',
    infoTitle: '情報入力',
    memoTitle: 'お問い合わせ内容',
    memoLabel: 'お問い合わせ内容',
    memoPlaceholder: '気になる商品、数量、販売地域などを簡単に入力してください。',
    backToAgreements: '同意項目に戻る',
    requiredOnly: '必須項目のみ',
  },
  cn: {
    continue: '同意',
    submit: '注册',
    duplicateCheck: '检查ID',
    duplicateEmpty: '请输入ID。',
    duplicateShort: 'ID至少需要4个字符。',
    duplicateUnavailable: '该ID已被使用。',
    duplicateAvailable: '该ID可以使用。',
    infoTitle: '填写信息',
    memoTitle: '咨询内容',
    memoLabel: '咨询内容',
    memoPlaceholder: '请简单填写感兴趣的产品、预计数量、销售地区等。',
    backToAgreements: '返回同意项目',
    requiredOnly: '仅必填项目',
  },
}

const countryOptionsByLocale = {
  kr: ['한국', '일본', '중국', '미국', '캐나다', '대만', '홍콩', '싱가포르', '태국', '베트남', '필리핀', '인도네시아', '말레이시아', '호주', '영국', '프랑스', '독일', '기타'],
  en: ['Korea', 'Japan', 'China', 'United States', 'Canada', 'Taiwan', 'Hong Kong', 'Singapore', 'Thailand', 'Vietnam', 'Philippines', 'Indonesia', 'Malaysia', 'Australia', 'United Kingdom', 'France', 'Germany', 'Other'],
  jp: ['韓国', '日本', '中国', 'アメリカ', 'カナダ', '台湾', '香港', 'シンガポール', 'タイ', 'ベトナム', 'フィリピン', 'インドネシア', 'マレーシア', 'オーストラリア', 'イギリス', 'フランス', 'ドイツ', 'その他'],
  cn: ['韩国', '日本', '中国', '美国', '加拿大', '台湾', '香港', '新加坡', '泰国', '越南', '菲律宾', '印度尼西亚', '马来西亚', '澳大利亚', '英国', '法国', '德国', '其他'],
}

const profileHelperCopy = {
  kr: {
    attachment: '사업자등록증 또는 회사 사진. 현재는 서버 저장 없이 담당자 확인 안내용입니다.',
    password: '8자 이상, 숫자와 특수기호를 포함해주세요.',
    countryOther: '국가 직접 입력',
    emailDomain: '선택',
    customEmailDomain: '직접 입력',
  },
  en: {
    attachment: 'Business registration or company photo. For now this is only for manual review guidance and is not uploaded to a server.',
    password: 'Use 8+ characters including a number and a special character.',
    countryOther: 'Enter country',
    emailDomain: 'Select',
    customEmailDomain: 'Custom domain',
  },
  jp: {
    attachment: '事業者登録証または会社写真。現時点ではサーバー保存せず、担当者確認案内用です。',
    password: '8文字以上、数字と記号を含めてください。',
    countryOther: '国を直接入力',
    emailDomain: '選択',
    customEmailDomain: '直接入力',
  },
  cn: {
    attachment: '营业执照或公司照片。目前不会上传到服务器，仅用于人工确认说明。',
    password: '请使用8位以上，并包含数字和特殊符号。',
    countryOther: '直接输入国家',
    emailDomain: '选择',
    customEmailDomain: '自定义域名',
  },
}

const emailDomainsByLocale = {
  kr: ['naver.com', 'nate.com', 'daum.net', 'gmail.com', 'hanmail.net', 'kakao.com', '직접 입력'],
  en: ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'Custom'],
  jp: ['gmail.com', 'yahoo.co.jp', 'docomo.ne.jp', 'ezweb.ne.jp', 'softbank.ne.jp', '直接入力'],
  cn: ['gmail.com', 'qq.com', '163.com', '126.com', 'outlook.com', '自定义'],
}

const passwordMismatchCopy = {
  kr: '비밀번호가 일치하지 않습니다.',
  en: 'Passwords do not match.',
  jp: 'パスワードが一致しません。',
  cn: '两次输入的密码不一致。',
}

const passwordRuleLabelsByLocale = {
  kr: {
    length: '8자 이상',
    number: '숫자 포함',
    symbol: '특수기호 포함',
  },
  en: {
    length: 'At least 8 characters',
    number: 'Includes a number',
    symbol: 'Includes a special character',
  },
  jp: {
    length: '8文字以上',
    number: '数字を含む',
    symbol: '記号を含む',
  },
  cn: {
    length: '至少8个字符',
    number: '包含数字',
    symbol: '包含特殊符号',
  },
}

const passwordToggleLabelsByLocale = {
  kr: {
    show: '비밀번호 보기',
    hide: '비밀번호 숨기기',
  },
  en: {
    show: 'Show password',
    hide: 'Hide password',
  },
  jp: {
    show: 'パスワードを表示',
    hide: 'パスワードを非表示',
  },
  cn: {
    show: '显示密码',
    hide: '隐藏密码',
  },
}

const signupTitleByLocale = {
  kr: '회원 가입',
  en: 'Sign Up',
  jp: '会員登録',
  cn: '会员注册',
}

const agreementLabelsByLocale = {
  kr: {
    age_confirmed: '14세 이상입니다',
    terms_of_service: '귀족 이용약관',
    buyer_terms: '귀족 도매 회원 및 견적 이용 조건',
    privacy_collection_use: '개인정보 수집·이용 동의',
    marketing_updates: '신상품 및 카탈로그 안내 수신 동의',
  },
  en: {
    age_confirmed: 'I am at least 14 years old',
    terms_of_service: 'Noblesse Terms of Service',
    buyer_terms: 'Wholesale Member and Quote Terms',
    privacy_collection_use: 'Personal Information Collection and Use Consent',
    marketing_updates: 'New Product and Catalog Updates Consent',
  },
  jp: {
    age_confirmed: '14歳以上です',
    terms_of_service: '貴族利用規約',
    buyer_terms: '貴族卸会員および見積利用条件',
    privacy_collection_use: '個人情報の収集・利用同意',
    marketing_updates: '新商品およびカタログ案内の受信同意',
  },
  cn: {
    age_confirmed: '已满14岁',
    terms_of_service: '贵族使用条款',
    buyer_terms: '贵族批发会员及报价使用条件',
    privacy_collection_use: '个人信息收集及使用同意',
    marketing_updates: '新品及目录通知接收同意',
  },
}

const agreementMetaCopy = {
  kr: { required: '[필수]', optional: '[선택]', details: '자세히 보기', accept: '동의하기', accepted: '동의 완료' },
  en: { required: '[Required]', optional: '[Optional]', details: 'View details', accept: 'Agree', accepted: 'Agreed' },
  jp: { required: '[必須]', optional: '[任意]', details: '詳細を見る', accept: '同意する', accepted: '同意済み' },
  cn: { required: '[必填]', optional: '[可选]', details: '查看详情', accept: '同意', accepted: '已同意' },
}

const localizedAgreementSections = {
  terms_of_service: {
    kr: [
      ['제1조 목적', '본 약관은 귀족이 운영하는 Noblesse 웹사이트에서 제공하는 국내·해외 B2B 피어싱 카탈로그, 회원 가입, 거래처 확인, 상품 정보 열람, 견적 문의 및 관련 안내 서비스의 이용 조건과 절차를 정합니다.'],
      ['제2조 용어의 정의', ['이용자는 사이트에 접속하거나 서비스를 이용하는 모든 방문자와 회원을 의미합니다.', '회원은 회원 가입 절차를 통해 정보를 제출하고 귀족의 카탈로그 및 문의 서비스를 이용하는 개인 또는 사업자 담당자를 의미합니다.', '승인 회원은 귀족이 거래 가능 여부를 확인한 뒤 회원가, MOQ, 견적 문의 등 일부 기능 접근을 허용한 회원을 의미합니다.', '견적 문의는 상품, 옵션, 수량, 메모를 기준으로 거래 검토를 요청하는 절차이며 최종 주문이나 결제가 아닙니다.']],
      ['제3조 약관의 효력 및 변경', ['본 약관은 회원 가입 화면 또는 사이트 내 연결 화면을 통해 게시되며, 회원이 약관에 동의하고 가입 절차를 진행하면 효력이 발생합니다.', '귀족은 운영 정책, 서비스 구조, 관련 법령, 보안 기준 또는 거래 절차 변경에 따라 약관을 개정할 수 있습니다.', '중요한 변경이 있는 경우 사이트 공지, 회원 화면, 이메일 등 합리적인 방법으로 안내할 수 있습니다.']],
      ['제4조 서비스의 제공', ['귀족은 상품 이미지, 상품명, 상품 코드, 소재, 컬러, 사이즈, MOQ, 카테고리, 컬렉션, 카탈로그 안내, 회원 상태 안내, 견적 문의 관련 기능을 제공할 수 있습니다.', '서비스는 B2B 거래 검토를 돕기 위한 카탈로그 및 문의 기능이며, 온라인 결제나 즉시 주문 확정을 목적으로 하지 않습니다.']],
      ['제5조 회원 가입 및 정보 제출', ['회원은 아이디, 비밀번호, 업체명, 담당자명, 연락처, 국가/지역, 판매 채널, 관심 상품, 문의 내용 등 거래 확인에 필요한 정보를 제출할 수 있습니다.', '회원은 가입 과정에서 사실과 다른 정보, 타인의 정보, 확인이 어려운 정보를 제출해서는 안 됩니다.', '제출 정보가 부정확하거나 추가 확인이 필요한 경우 회원가 안내, 거래 조건 안내, 견적 문의 이용이 보류될 수 있습니다.']],
      ['제6조 계정 및 비밀번호 관리', ['아이디와 비밀번호 관리 책임은 회원에게 있습니다.', '회원은 계정을 제3자에게 양도, 대여, 공유하거나 타인의 계정을 사용해서는 안 됩니다.', '회원의 관리 소홀로 발생한 손해 또는 거래상 불이익에 대해서 귀족은 책임을 지지 않을 수 있습니다.']],
      ['제7조 거래처 확인 및 이용 제한', ['귀족은 업체 정보, 연락처, 판매 지역, 판매 채널, 거래 적합성, 공급 정책 등을 기준으로 거래처 확인을 진행할 수 있습니다.', '허위 정보, 부정 이용, 무단 가격 공유, 비정상 접근, 서비스 방해 행위가 확인되는 경우 이용을 제한하거나 회원 상태를 보류·차단할 수 있습니다.']],
      ['제8조 상품 정보 및 이미지', ['사이트에 표시되는 상품 이미지와 설명은 거래 검토를 위한 카탈로그 정보입니다.', '색상, 광택, 소재 질감, 크기, 포장 상태는 촬영 환경, 디스플레이 환경, 생산 시점에 따라 실제 상품과 차이가 있을 수 있습니다.', '상품 구성, 옵션, MOQ, 수출 가능 여부는 공급 상황에 따라 변경될 수 있습니다.']],
      ['제9조 가격 및 거래 조건', ['회원가, 시장별 가격, MOQ, 재고, 납기, 배송 조건, 수출 조건은 승인 회원 또는 담당자 확인 후 안내될 수 있습니다.', '사이트에 표시되는 정보 또는 문의 단계의 참고 가격은 최종 확정 조건이 아니며, 최종 조건은 귀족 담당자 확인 후 별도로 안내됩니다.']],
      ['제10조 견적 문의의 성격', ['견적 문의는 회원이 관심 상품과 수량을 기준으로 귀족에 검토를 요청하는 절차입니다.', '견적 문의 접수만으로 주문, 계약, 결제, 배송 의무가 발생하지 않습니다.', '최종 가격, 가능 수량, 생산 가능 여부, 납기, 배송 조건은 담당자 확인 후 안내됩니다.']],
      ['제11조 회원의 의무', ['회원은 관련 법령, 본 약관, 사이트 안내, 거래상 신의성실 원칙을 준수해야 합니다.', '회원은 상품 정보, 회원가, 견적 내용, 내부 거래 조건을 귀족의 사전 동의 없이 외부에 공개하거나 상업적으로 이용해서는 안 됩니다.']],
      ['제12조 금지 행위', ['허위 정보 제출, 타인 정보 도용, 비정상적인 접근, 사이트 정보 무단 수집, 이미지와 설명의 무단 복제, 회원가 무단 공유, 시스템 오용, 서비스 운영 방해 행위는 금지됩니다.', '위 행위가 확인될 경우 귀족은 사전 안내 없이 서비스 이용 제한, 회원 상태 변경, 문의 처리 보류 등의 조치를 할 수 있습니다.']],
      ['제13조 서비스 변경 및 중단', ['귀족은 상품 공급, 재고, 생산 조건, 카탈로그 개편, 시스템 점검, 보안 이슈, 운영상 필요에 따라 서비스 전부 또는 일부를 변경하거나 일시 중단할 수 있습니다.', '서비스 변경 또는 중단이 예상되는 경우 가능한 범위에서 사이트 또는 연락 채널을 통해 안내합니다.']],
      ['제14조 책임의 제한', ['귀족은 고의 또는 중대한 과실이 없는 한 회원이 입력한 정보 오류, 연락 불가, 외부 환경, 통신 장애, 제3자 행위로 인한 손해에 대해 책임을 지지 않을 수 있습니다.', '사이트의 카탈로그 정보는 거래 검토를 위한 참고 자료이며, 최종 거래 조건은 별도 확인 절차를 통해 확정됩니다.']],
      ['제15조 개인정보 보호', '귀족은 회원 가입, 거래처 확인, 문의 응대, 견적 안내에 필요한 개인정보를 관련 동의 및 개인정보 처리방침에 따라 처리합니다.'],
      ['제16조 문의 및 고지', '회원 가입, 약관, 개인정보, 카탈로그, 견적 문의와 관련한 문의는 사이트 안내 또는 지정 이메일 연락처를 통해 접수할 수 있습니다.'],
    ],
    en: [
      ['Service Purpose', 'Noblesse provides a B2B piercing catalog, sign-up, buyer review, and quote inquiry features for domestic and international buyers.'],
      ['Sign Up and Submitted Information', 'Members may submit ID, password, company name, contact name, contact details, and country or region information. Submitted information is used for buyer review and inquiry support.'],
      ['Account Management', 'Members are responsible for keeping account and contact information accurate and must not use another person’s information or unverifiable details.'],
      ['Product Information', 'Product images, materials, colors, sizes, MOQ, and catalog descriptions are reference information for trade review and may differ depending on photography, display, and inventory conditions.'],
      ['Pricing and Trade Terms', 'Member pricing, market pricing, stock, lead time, shipping conditions, and MOQ may be guided after approval and manual review. Screen information is not a final trade condition.'],
      ['Quote Inquiry', 'A quote inquiry is not a final order. It is a request for Noblesse to review selected products, options, and quantities for trade discussion.'],
      ['Prohibited Conduct', 'False information, unauthorized price sharing, unauthorized copying of site information, system misuse, account sharing, or conduct that interferes with trade review may be restricted.'],
      ['Service Changes', 'Product information, catalog structure, price display, and inquiry procedures may change based on operational needs.'],
      ['Service Restrictions', 'Noblesse may temporarily limit or suspend parts of the service for operation, security, system maintenance, supply condition changes, or misuse prevention.'],
      ['Limitation of Responsibility', 'Site information supports B2B trade review. Final pricing and trade terms are separately confirmed by Noblesse after review.'],
      ['Contact Channel', 'Sign-up, catalog, quote inquiry, and privacy-related inquiries may be received through site guidance or the designated email contact.'],
    ],
    jp: [
      ['サービスの目的', '貴族は国内外のB2Bバイヤー向けに、ピアスカタログ、会員登録、会員確認、見積お問い合わせ機能を提供します。'],
      ['会員登録および情報提出', '会員はID、パスワード、会社名、担当者名、連絡先、国・地域など必要な情報を提出できます。提出情報は取引先確認とお問い合わせ対応に使用されます。'],
      ['アカウント管理', '会員は提出したアカウント情報と連絡先を正確に維持する必要があり、他人の情報や確認困難な情報を使用することはできません。'],
      ['商品情報', 'サイトの商品画像、素材、色、サイズ、MOQ、カタログ説明は取引検討のための参考情報であり、撮影環境や在庫状況により差が生じる場合があります。'],
      ['価格および取引条件', '会員価格、市場別価格、在庫、納期、配送条件、MOQは承認および担当者確認後に案内される場合があり、画面表示が最終条件を意味するものではありません。'],
      ['見積お問い合わせ', '見積お問い合わせは最終注文ではありません。選択した商品、オプション、数量をもとに貴族へ取引確認を依頼する手続きです。'],
      ['禁止行為', '虚偽情報の提出、無断での価格共有、サイト情報の無断複製、システムの不正利用、他人のアカウント使用、取引確認を妨げる行為は制限される場合があります。'],
      ['サービス変更', '商品情報、カタログ構成、価格表示、問い合わせ手順は運営状況により変更される場合があります。'],
      ['サービス制限', '貴族は運営、セキュリティ、システム点検、供給条件の変更、不正利用防止のため、サービスの一部を一時的に制限または停止する場合があります。'],
      ['責任の制限', 'サイトの情報はB2B取引検討を補助する資料であり、最終価格および取引条件は担当者確認後に別途案内されます。'],
      ['お問い合わせ窓口', '会員登録、カタログ、見積お問い合わせ、個人情報に関する問い合わせは、サイト内案内または指定メール連絡先で受け付けます。'],
    ],
    cn: [
      ['服务目的', '贵族为国内外B2B买家提供穿孔饰品目录、会员注册、会员审核和报价咨询功能。'],
      ['会员注册及信息提交', '会员可以提交ID、密码、公司名称、联系人、联系方式、国家或地区等必要信息。提交的信息将用于买家审核和咨询回复。'],
      ['账户管理', '会员应保持账户信息和联系方式准确，不得使用他人信息或难以确认的信息。'],
      ['商品信息', '网站中的商品图片、材质、颜色、尺寸、MOQ和目录说明为交易审核参考信息，可能因拍摄环境、显示设备或库存情况而有所不同。'],
      ['价格及交易条件', '会员价格、市场价格、库存、交期、配送条件和MOQ可在审核及负责人确认后说明，页面显示内容并不代表最终交易条件。'],
      ['报价咨询', '报价咨询不是最终订单，而是根据所选商品、选项和数量向贵族请求交易确认的流程。'],
      ['禁止行为', '提交虚假信息、未经授权共享价格、擅自复制网站信息、滥用系统、使用他人账户或妨碍交易审核的行为可能受到限制。'],
      ['服务变更', '商品信息、目录结构、价格显示方式和咨询流程可能根据运营情况调整。'],
      ['服务限制', '贵族可因运营、安全、系统维护、供应条件变化或防止不当使用，临时限制或暂停部分服务。'],
      ['责任限制', '网站信息用于辅助B2B交易审核，最终价格和交易条件将由贵族确认后另行说明。'],
      ['联系渠道', '会员注册、目录、报价咨询及个人信息相关问题可通过网站说明或指定邮箱联系。'],
    ],
  },
  buyer_terms: {
    kr: [
      ['제1조 목적', '본 조건은 귀족 도매 회원의 확인 기준, 회원가 열람, MOQ, 견적 문의, 거래 조건 안내와 관련한 세부 이용 기준을 정합니다.'],
      ['제2조 도매 회원 확인', ['귀족은 업체명, 담당자명, 연락처, 국가/지역, 판매 채널, 사업 형태, 관심 상품, 기존 거래 가능성 등을 기준으로 도매 회원 여부를 확인합니다.', '확인은 자동 승인이 아니며 담당자 검토 후 진행됩니다.']],
      ['제3조 회원 상태', ['회원 상태는 비회원, 확인 중, 승인 회원, 관리자 등으로 구분될 수 있습니다.', '확인 중인 회원은 상품 카탈로그를 볼 수 있으나 회원가, 견적 문의, 거래 조건 안내는 제한될 수 있습니다.']],
      ['제4조 회원가 및 시장별 가격', ['회원가와 시장별 가격은 승인 회원에게만 안내될 수 있습니다.', '가격은 통화, 국가, 시장, 공급 조건, 수출 가능 여부, 원자재 가격, 생산 상황에 따라 달라질 수 있습니다.']],
      ['제5조 MOQ 및 옵션', ['MOQ는 상품, 소재, 컬러, 사이즈, 생산 조건, 시장별 공급 정책에 따라 달라질 수 있습니다.', '사이트에 표시되는 MOQ는 검토 기준이며 실제 견적 과정에서 조정될 수 있습니다.']],
      ['제6조 견적 문의', ['견적 문의는 선택한 상품과 수량에 대한 검토 요청입니다.', '견적 문의는 최종 주문, 결제, 계약 체결을 의미하지 않으며, 귀족 담당자의 확인 후 별도 안내됩니다.']],
      ['제7조 정보 정확성', ['회원은 거래처 확인에 필요한 정보를 정확하게 제출해야 합니다.', '허위 정보, 누락 정보, 연락 불가, 확인이 어려운 정보가 있는 경우 승인 또는 견적 안내가 지연될 수 있습니다.']],
      ['제8조 가격 정보 보호', ['회원가, 시장별 가격, 견적 내용, 공급 조건은 승인 회원의 거래 검토를 위한 정보입니다.', '귀족의 사전 동의 없이 가격 정보나 견적 내용을 외부에 공유하거나 공개해서는 안 됩니다.']],
      ['제9조 거래 가능성', '귀족은 상품 공급 상황, 생산 가능 여부, 수출 가능 여부, 거래 지역, 물류 조건, 내부 운영 정책에 따라 거래 가능 여부를 판단할 수 있습니다.'],
      ['제10조 승인 취소 및 제한', '부정확한 정보, 무단 가격 공유, 서비스 오용, 거래 질서 저해 행위가 확인되는 경우 귀족은 회원 상태를 보류하거나 승인 취소 및 이용 제한을 할 수 있습니다.'],
    ],
    en: [
      ['Buyer Review', 'Wholesale member access is reviewed based on company information, sales channel, country or region, contact details, and trading fit.'],
      ['Member Price and Terms', 'Member pricing, MOQ, market pricing, and trade terms may be provided only to approved members.'],
      ['Nature of Quote Request', 'A quote request is a review request for selected products and quantities, not a final transaction.'],
      ['Information Accuracy', 'Review may be delayed if submitted information is inaccurate or difficult to verify.'],
    ],
    jp: [
      ['卸会員確認', '卸会員の確認は会社情報、販売チャネル、国・地域、連絡先、取引適合性を基準に行われます。'],
      ['会員価格と取引条件', '会員価格、MOQ、市場別価格、取引条件は承認された会員にのみ案内される場合があります。'],
      ['見積依頼の性格', '選択した商品と数量に対する確認依頼であり、最終取引の確定ではありません。'],
      ['情報の正確性', '提出情報が不正確または確認困難な場合、案内が保留されることがあります。'],
    ],
    cn: [
      ['批发会员审核', '批发会员资格将根据公司信息、销售渠道、国家或地区、联系方式和交易适合性进行确认。'],
      ['会员价格和交易条件', '会员价格、MOQ、市场价格和交易条件仅可向已审核会员提供。'],
      ['报价请求性质', '报价请求是对所选商品和数量的确认请求，并非最终交易确认。'],
      ['信息准确性', '如提交信息不准确或难以确认，审核和处理可能会延后。'],
    ],
  },
  privacy_collection_use: {
    kr: [
      ['[필수] 개인정보 수집·이용 동의', {
        type: 'table',
        columns: ['목적', '항목', '보유기간'],
        rows: [
          ['회원 가입 및 본인 식별', '아이디, 비밀번호, 담당자명, 연락처', '회원 탈퇴 또는 목적 달성 시까지'],
          ['거래처 확인 및 회원 상태 안내', '업체명, 국가/지역, 판매 채널, 관심 상품, 문의 내용', '회원 탈퇴 또는 거래처 확인 목적 달성 시까지'],
          ['견적 문의 응대 및 거래 조건 안내', '연락처, 문의 상품, 수량, 요청 메모, 담당자 응대 기록', '문의 처리 완료 후 내부 기록 보존 기간까지'],
          ['부정 이용 방지 및 서비스 안정성 확보', '접속 기록, 이용 기록, 회원 상태 변경 기록', '관련 법령 또는 내부 보안 기준에 따른 기간'],
        ],
      }],
      ['[선택] 추가 연락 정보 수집·이용', {
        type: 'table',
        columns: ['목적', '항목', '보유기간'],
        rows: [
          ['빠른 거래 문의 응대', '전화번호, 메신저 종류, 메신저 ID', '회원 탈퇴 또는 수신 거부 시까지'],
          ['시장별 맞춤 안내', '국가/지역, 선호 언어, 판매 채널', '회원 탈퇴 또는 목적 달성 시까지'],
        ],
      }],
      ['동의 거부 권리', ['회원은 개인정보 수집·이용에 동의하지 않을 권리가 있습니다.', '다만 필수 항목에 동의하지 않는 경우 회원 가입, 거래처 확인, 견적 문의 처리가 제한될 수 있습니다.', '선택 항목에 동의하지 않아도 회원 가입 신청은 가능합니다.']],
      ['처리 및 보관 원칙', ['수집한 개인정보는 회원 가입 검토, 거래처 확인, 문의 응대, 기록 관리, 부정 이용 방지 목적 범위 내에서 처리합니다.', '목적 달성 후에는 관련 법령이나 분쟁 대응을 위해 필요한 경우를 제외하고 지체 없이 파기하거나 분리 보관합니다.']],
    ],
    en: [
      ['Purpose', 'Personal information is collected and used for sign-up review, buyer verification, inquiry support, quote guidance, record management, and misuse prevention.'],
      ['Collected Items', 'ID, password, company name, contact name, contact details, country or region, and inquiry memo may be collected.'],
      ['Retention Period', 'Information may be retained until withdrawal, completion of processing purpose, or the end of legally required retention.'],
      ['Refusal of Consent', 'If required privacy consent is refused, sign-up and quote inquiry processing may be limited.'],
    ],
    jp: [
      ['収集目的', '会員登録確認、取引先確認、お問い合わせ対応、見積案内、記録管理、不正利用防止のため個人情報を収集・利用します。'],
      ['収集項目', 'ID、パスワード、会社名、担当者名、連絡先、国・地域、お問い合わせ内容などを収集する場合があります。'],
      ['保有期間', '会員登録の撤回、処理目的の達成、または法令上必要な保管期間が終了するまで保有される場合があります。'],
      ['同意拒否', '必須の個人情報収集・利用に同意しない場合、会員登録および見積お問い合わせの処理が制限されることがあります。'],
    ],
    cn: [
      ['收集目的', '为会员注册审核、买家确认、咨询回复、报价说明、记录管理及防止不当使用而收集和使用个人信息。'],
      ['收集项目', '可能收集ID、密码、公司名称、联系人、联系方式、国家或地区、咨询内容等信息。'],
      ['保存期限', '信息可能保存至会员撤回、处理目的达成或相关法规要求的保存期限结束。'],
      ['拒绝同意', '如不同意必需的个人信息收集及使用，会员注册和报价咨询处理可能受到限制。'],
    ],
  },
  marketing_updates: {
    kr: [
      ['수신 목적', '귀족은 신상품, 신규 카탈로그, 컬렉션, 이벤트, 시즌별 추천 상품, 시장별 입고 안내, 회원 공지 발송을 위해 마케팅 수신 동의를 요청합니다.'],
      ['수신 항목', '수신 정보에는 이메일, 연락처, 선호 언어, 국가/지역, 관심 상품, 판매 채널, 문의 이력에 기반한 추천 정보가 포함될 수 있습니다.'],
      ['수신 채널', '안내는 이메일, 전화, 메신저, 사이트 내 안내 또는 회원이 제출한 연락 채널을 통해 발송될 수 있습니다.'],
      ['선택 동의', '마케팅 수신 동의는 선택 항목이며, 동의하지 않아도 회원 가입 및 필수 거래처 확인 신청은 가능합니다.'],
      ['수신 거부', '회원은 언제든지 이메일 회신, 지정 연락처 또는 사이트 안내를 통해 마케팅 수신 거부를 요청할 수 있습니다.'],
      ['보유 기간', '마케팅 수신 동의 정보는 동의 철회, 회원 탈퇴 또는 발송 목적 달성 시까지 보유될 수 있습니다.'],
    ],
    en: [
      ['Purpose', 'Used to send updates about new products, catalogs, collections, events, member notices, and recommended products.'],
      ['Channels', 'Updates may be sent by email, messenger, phone, or submitted contact channels.'],
      ['Optional Consent', 'Sign-up remains available without this consent, and opt-out can be requested at any time.'],
    ],
    jp: [
      ['受信目的', '新商品、カタログ、コレクション、イベント、会員案内、おすすめ商品情報を送信するために使用します。'],
      ['受信チャネル', 'メール、メッセンジャー、電話、または提出された連絡先に案内が送信される場合があります。'],
      ['任意同意', '同意しなくても会員登録申請は可能で、いつでも受信拒否を申請できます。'],
    ],
    cn: [
      ['接收目的', '用于发送新品、目录、系列、活动、会员通知和推荐商品信息。'],
      ['接收渠道', '通知可能通过邮箱、即时通讯、电话或提交的联系方式发送。'],
      ['可选同意', '不同意也可以申请会员注册，并可随时申请取消接收。'],
    ],
  },
}

const localizedAgreementDetailOverrides = {
  terms_of_service: {
    en: [
      ['Article 1 Purpose', 'These terms define the conditions for Noblesse sign-up, buyer review, product catalog browsing, quote inquiry, and related B2B guidance services.'],
      ['Article 2 Definitions', ['User means any visitor or member who accesses the site or uses the service.', 'Member means an individual or business representative who submits information through the sign-up process and uses the Noblesse catalog or inquiry service.', 'Approved buyer means a member whose trade eligibility has been reviewed by Noblesse and who may access member pricing, MOQ guidance, and quote inquiry features.', 'Quote inquiry means a request for trade review based on products, options, quantities, and notes. It is not a final trade confirmation.']],
      ['Article 3 Effect and Revision', ['These terms are displayed during sign-up or within the connected site screens and take effect when a member agrees and proceeds with sign-up.', 'Noblesse may revise these terms according to operational policy, service structure, applicable law, security standards, or trade procedure changes.', 'Material changes may be announced through the site, member screen, email, or another reasonable notice method.']],
      ['Article 4 Services Provided', ['Noblesse may provide product images, product names, product codes, materials, colors, sizes, MOQ, categories, collections, catalog guidance, member status notices, and quote inquiry features.', 'The service is a B2B catalog and inquiry flow for trade review. It is not intended for immediate trade confirmation.']],
      ['Article 5 Member Obligations', ['Members must submit accurate information and must not use false, third-party, or unverifiable information.', 'Members must manage their ID and password responsibly and must not transfer, share, or allow another person to use their account.', 'Members must not disclose or commercially use product information, member pricing, quote contents, or internal trade terms without prior consent from Noblesse.']],
      ['Article 6 Product Information and Trade Terms', ['Product images and descriptions are catalog information for trade review and may differ depending on photography, display environment, production timing, and supply conditions.', 'Member pricing, market pricing, MOQ, inventory, lead time, shipping terms, and export availability may be provided only to approved members or after manager review.', 'Information shown on the site or in inquiry screens is reference information and final terms are confirmed separately by Noblesse.']],
      ['Article 7 Nature of Quote Inquiry', ['A quote inquiry is a request for Noblesse to review selected products and quantities.', 'Submitting a quote inquiry does not create a final transaction, contract, or shipping obligation.', 'Final price, available quantity, production availability, lead time, and shipping terms are guided after manager review.']],
      ['Article 8 Prohibited Conduct and Restrictions', ['Submitting false information, using another person account, abnormal access, unauthorized collection of site information, unauthorized copying of images or descriptions, unauthorized sharing of member prices, system misuse, or interference with service operation is prohibited.', 'If such conduct is confirmed, Noblesse may restrict service use, change member status, cancel approval, or hold inquiry processing without prior notice.']],
      ['Article 9 Privacy and Notices', ['Noblesse processes personal information necessary for sign-up, buyer review, inquiry response, and quote guidance according to the applicable consent and privacy policy.', 'Questions about sign-up, terms, privacy, catalog, or quote inquiries may be submitted through the site guidance or the designated contact channel.']],
    ],
    jp: [
      ['第1条 目的', '本規約は、貴族の会員登録、バイヤー審査、商品カタログ閲覧、見積お問い合わせ、および関連するB2B案内サービスの利用条件を定めます。'],
      ['第2条 用語の定義', ['利用者とは、サイトにアクセスし、またはサービスを利用するすべての訪問者および会員をいいます。', '会員とは、会員登録手続を通じて情報を提出し、貴族のカタログおよびお問い合わせサービスを利用する個人または事業者担当者をいいます。', '承認バイヤーとは、貴族が取引可能性を確認した後、会員価格、MOQ、見積お問い合わせなど一部機能へのアクセスを許可した会員をいいます。', '見積お問い合わせとは、商品、オプション、数量、メモを基準に取引検討を依頼する手続であり、最終取引確定ではありません。']],
      ['第3条 効力および変更', ['本規約は会員登録時またはサイト内の連携画面に表示され、会員が同意して登録手続を進めた時点で効力を生じます。', '貴族は運営方針、サービス構成、法令、セキュリティ基準、取引手続の変更に応じて本規約を改定することがあります。', '重要な変更は、サイト、会員画面、メール、その他合理的な方法で案内されることがあります。']],
      ['第4条 サービスの提供', ['貴族は商品画像、商品名、商品コード、素材、カラー、サイズ、MOQ、カテゴリー、コレクション、カタログ案内、会員状態案内、見積お問い合わせ機能を提供することがあります。', '本サービスはB2B取引検討のためのカタログおよびお問い合わせ機能であり、即時取引確定を目的としません。']],
      ['第5条 会員の義務', ['会員は正確な情報を提出し、虚偽、第三者、または確認困難な情報を使用してはなりません。', '会員はIDおよびパスワードを責任をもって管理し、アカウントを譲渡、共有、または第三者に使用させてはなりません。', '会員は貴族の事前同意なく、商品情報、会員価格、見積内容、内部取引条件を開示または商業的に利用してはなりません。']],
      ['第6条 商品情報および取引条件', ['商品画像および説明は取引検討のためのカタログ情報であり、撮影環境、表示環境、生産時期、供給状況によって実物と異なる場合があります。', '会員価格、市場別価格、MOQ、在庫、納期、配送条件、輸出可否は承認会員または担当者確認後に案内されることがあります。', 'サイトまたはお問い合わせ画面に表示される情報は参考情報であり、最終条件は貴族が別途確認します。']],
      ['第7条 見積お問い合わせの性格', ['見積お問い合わせは、会員が選択した商品と数量について貴族に検討を依頼する手続です。', '見積お問い合わせの受付のみで最終取引、契約、配送義務は発生しません。', '最終価格、可能数量、生産可否、納期、配送条件は担当者確認後に案内されます。']],
      ['第8条 禁止行為および制限', ['虚偽情報の提出、第三者アカウントの使用、異常アクセス、サイト情報の無断収集、画像または説明の無断複製、会員価格の無断共有、システムの不正利用、サービス運営の妨害は禁止されます。', '該当行為が確認された場合、貴族は事前通知なくサービス利用制限、会員状態変更、承認取消、またはお問い合わせ処理の保留を行うことがあります。']],
      ['第9条 個人情報および通知', ['貴族は会員登録、バイヤー審査、お問い合わせ対応、見積案内に必要な個人情報を、該当する同意および個人情報処理方針に従って処理します。', '会員登録、規約、個人情報、カタログ、見積お問い合わせに関する質問は、サイト案内または指定された連絡窓口を通じて受け付けます。']],
    ],
    cn: [
      ['第1條 目的', '本條款規範貴族會員註冊、買家審核、商品目錄瀏覽、報價詢問及相關 B2B 說明服務的使用條件。'],
      ['第2條 用語定義', ['使用者是指連線至本網站或使用服務的所有訪客與會員。', '會員是指透過會員註冊程序提交資料，並使用貴族目錄及詢問服務的個人或事業負責人。', '已核准買家是指貴族確認交易資格後，允許存取會員價格、MOQ、報價詢問等部分功能的會員。', '報價詢問是以商品、選項、數量與備註為基準，請求貴族進行交易審核的程序，並非最終交易確認。']],
      ['第3條 效力與變更', ['本條款於會員註冊或網站連接畫面中顯示，會員同意並進行註冊程序時生效。', '貴族得依營運政策、服務結構、法令、資安標準或交易流程變更修訂本條款。', '重要變更得透過網站、會員畫面、電子郵件或其他合理方式通知。']],
      ['第4條 服務提供', ['貴族得提供商品圖片、商品名稱、商品代碼、材質、顏色、尺寸、MOQ、分類、系列、目錄說明、會員狀態說明及報價詢問功能。', '本服務為 B2B 交易審核用目錄及詢問功能，並非即時交易成立服務。']],
      ['第5條 會員義務', ['會員應提交正確資料，不得使用不實、第三方或難以確認的資料。', '會員應負責管理 ID 與密碼，不得轉讓、分享或允許他人使用帳戶。', '未經貴族事前同意，會員不得揭露或商業使用商品資訊、會員價格、報價內容或內部交易條件。']],
      ['第6條 商品資訊與交易條件', ['商品圖片與說明為交易審核用目錄資訊，可能因拍攝環境、顯示環境、生產時點與供應狀況而與實物不同。', '會員價格、市場別價格、MOQ、庫存、交期、配送條件與出口可否，得僅向已核准會員或經負責人確認後提供。', '網站或詢問畫面中顯示的資訊為參考資訊，最終條件由貴族另行確認。']],
      ['第7條 報價詢問性質', ['報價詢問是會員針對所選商品與數量請求貴族審核的程序。', '僅提交報價詢問不會產生最終交易、契約或配送義務。', '最終價格、可供應數量、生產可否、交期與配送條件由負責人確認後提供。']],
      ['第8條 禁止行為與限制', ['禁止提交不實資料、使用他人帳戶、異常存取、未經授權蒐集網站資訊、未經授權複製圖片或說明、未經授權分享會員價格、濫用系統或妨礙服務運作。', '如確認上述行為，貴族得不經事前通知限制服務使用、變更會員狀態、取消核准或保留詢問處理。']],
      ['第9條 個人資訊與通知', ['貴族依相關同意及隱私政策，處理會員註冊、買家審核、詢問回覆及報價說明所需的個人資訊。', '會員註冊、條款、個人資訊、目錄或報價詢問相關問題，可透過網站說明或指定聯絡管道提出。']],
    ],
  },
  buyer_terms: {
    en: [
      ['Article 1 Purpose', 'These terms define detailed standards for Noblesse wholesale buyer review, member price access, MOQ, quote inquiry, and trade terms guidance.'],
      ['Article 2 Buyer Review', ['Noblesse reviews wholesale buyer eligibility based on company name, contact person, contact details, country or region, sales channel, business type, interested products, and potential trading fit.', 'Review is not automatic approval and proceeds through manager review.']],
      ['Article 3 Member Status and Access', ['Member status may be divided into guest, under review, approved buyer, and admin.', 'Members under review may browse the product catalog, but member price, quote inquiry, and trade terms guidance may be limited.']],
      ['Article 4 Pricing, MOQ, and Options', ['Member price and market-specific price may be shown only to approved buyers.', 'MOQ may vary depending on product, material, color, size, production condition, and market supply policy.', 'Prices may vary depending on currency, country, market, supply terms, export availability, exchange rates, and production conditions.']],
      ['Article 5 Quote Inquiry and Accuracy', ['Quote inquiry is a request for review of selected products and quantities and is not a final transaction or contract.', 'Members must submit accurate information required for buyer review.', 'Approval or quote guidance may be delayed when submitted information is false, incomplete, unreachable, or difficult to verify.']],
      ['Article 6 Price Information Protection', ['Member pricing, market pricing, quote contents, and supply terms are information provided for approved buyer trade review.', 'Members must not share, disclose, or externally use price information or quote contents without prior consent from Noblesse.']],
      ['Article 7 Approval Cancellation and Restrictions', 'If inaccurate information, unauthorized price sharing, service misuse, or conduct that harms trade order is confirmed, Noblesse may hold member status, cancel approval, or restrict service use.'],
    ],
    jp: [
      ['第1条 目的', '本条件は、貴族の卸バイヤー審査、会員価格へのアクセス、MOQ、見積お問い合わせ、取引条件案内に関する詳細基準を定めます。'],
      ['第2条 バイヤー審査', ['貴族は会社名、担当者、連絡先、国・地域、販売チャネル、業態、関心商品、取引適合性を基準に卸バイヤー資格を審査します。', '審査は自動承認ではなく、担当者確認を経て進められます。']],
      ['第3条 会員状態およびアクセス', ['会員状態はゲスト、審査中、承認バイヤー、管理者などに区分されることがあります。', '審査中の会員は商品カタログを閲覧できますが、会員価格、見積お問い合わせ、取引条件案内は制限される場合があります。']],
      ['第4条 価格、MOQ、およびオプション', ['会員価格および市場別価格は承認バイヤーにのみ表示されることがあります。', 'MOQは商品、素材、カラー、サイズ、生産状況、市場供給方針により異なる場合があります。', '価格は通貨、国、市場、供給条件、輸出可否、為替、製造状況により変動する場合があります。']],
      ['第5条 見積お問い合わせと情報の正確性', ['見積お問い合わせは選択した商品と数量に対する検討依頼であり、最終取引または契約ではありません。', '会員はバイヤー審査に必要な正確な情報を提出しなければなりません。', '提出情報が虚偽、不完全、連絡不能、または確認困難な場合、承認または見積案内が遅延することがあります。']],
      ['第6条 価格情報の保護', ['会員価格、市場別価格、見積内容、供給条件は承認バイヤーの取引検討のために提供される情報です。', '会員は貴族の事前同意なく、価格情報または見積内容を共有、開示、外部利用してはなりません。']],
      ['第7条 承認取消および制限', '不正確な情報、無断の価格共有、サービスの不正利用、または取引秩序を害する行為が確認された場合、貴族は会員状態の保留、承認取消、またはサービス利用制限を行うことがあります。'],
    ],
    cn: [
      ['第1條 目的', '本條件規範貴族批發買家審核、會員價格存取、MOQ、報價詢問與交易條件說明的詳細標準。'],
      ['第2條 買家審核', ['貴族依公司名稱、負責人、聯絡方式、國家或地區、銷售通路、營業型態、關注商品與交易適合性審核批發買家資格。', '審核並非自動核准，將由負責人確認後進行。']],
      ['第3條 會員狀態與存取', ['會員狀態可分為訪客、審核中、已核准買家、管理者等。', '審核中的會員可瀏覽商品目錄，但會員價格、報價詢問及交易條件說明可能受限。']],
      ['第4條 價格、MOQ 與選項', ['會員價格與市場別價格得僅向已核准買家顯示。', 'MOQ 可能依商品、材質、顏色、尺寸、生產狀況與市場供應政策而不同。', '價格可能依幣別、國家、市場、供應條件、出口可否、匯率與生產狀況而變動。']],
      ['第5條 報價詢問與資訊正確性', ['報價詢問是針對所選商品與數量的審核請求，並非最終交易或契約。', '會員應提交買家審核所需的正確資訊。', '如提交資訊不實、不完整、無法聯絡或難以確認，核准或報價說明可能延遲。']],
      ['第6條 價格資訊保護', ['會員價格、市場別價格、報價內容與供應條件，是提供給已核准買家進行交易審核的資訊。', '未經貴族事前同意，會員不得分享、揭露或對外使用價格資訊或報價內容。']],
      ['第7條 核准取消與限制', '如確認不正確資訊、未經授權分享價格、濫用服務或損害交易秩序的行為，貴族得保留會員狀態、取消核准或限制服務使用。'],
    ],
  },
  privacy_collection_use: {
    en: [
      ['[Required] Personal Information Collection and Use Consent', {
        type: 'table',
        columns: ['Purpose', 'Items', 'Retention Period'],
        rows: [
          ['Sign-up and identity confirmation', 'ID, password, contact person name, contact details', 'Until withdrawal or purpose is achieved'],
          ['Buyer review and member status guidance', 'Company name, country or region, sales channel, interested products, inquiry notes', 'Until withdrawal or buyer review purpose is achieved'],
          ['Quote inquiry response and trade terms guidance', 'Contact details, inquiry products, quantity, request memo, manager response record', 'Until inquiry processing is completed and internal record retention period expires'],
          ['Misuse prevention and service stability', 'Access logs, usage records, member status change records', 'Period required by applicable law or internal security standards'],
        ],
      }],
      ['Processing and Safeguards', ['Personal information is processed only within the scope necessary for sign-up review, buyer review, inquiry response, record management, and misuse prevention.', 'After the purpose is achieved, information is deleted or separately stored unless retention is required by law, dispute response, or security standards.', 'If required consent is refused, membership request and quote inquiry processing may be limited.']],
    ],
    jp: [
      ['【必須】個人情報の収集・利用同意', {
        type: 'table',
        columns: ['目的', '項目', '保有期間'],
        rows: [
          ['会員登録および本人確認', 'ID、パスワード、担当者名、連絡先', '退会または目的達成時まで'],
          ['バイヤー審査および会員状態案内', '会社名、国・地域、販売チャネル、関心商品、お問い合わせ内容', '退会またはバイヤー審査目的達成時まで'],
          ['見積お問い合わせ対応および取引条件案内', '連絡先、お問い合わせ商品、数量、依頼メモ、担当者対応記録', 'お問い合わせ処理完了後、内部記録保管期間まで'],
          ['不正利用防止およびサービス安定性確保', 'アクセス記録、利用記録、会員状態変更記録', '関連法令または内部セキュリティ基準に基づく期間'],
        ],
      }],
      ['処理および保護原則', ['個人情報は、会員登録審査、バイヤー審査、お問い合わせ対応、記録管理、不正利用防止に必要な範囲でのみ処理されます。', '目的達成後は、法令、紛争対応、セキュリティ基準上の保管が必要な場合を除き、削除または分離保管されます。', '必須同意を拒否する場合、会員申請および見積お問い合わせ処理が制限されることがあります。']],
    ],
    cn: [
      ['【必填】個人資訊蒐集及使用同意', {
        type: 'table',
        columns: ['目的', '項目', '保存期間'],
        rows: [
          ['會員註冊與本人識別', 'ID、密碼、負責人姓名、聯絡方式', '會員退出或目的達成時為止'],
          ['買家審核與會員狀態說明', '公司名稱、國家或地區、銷售通路、關注商品、詢問內容', '會員退出或買家審核目的達成時為止'],
          ['報價詢問回覆與交易條件說明', '聯絡方式、詢問商品、數量、請求備註、負責人回覆紀錄', '詢問處理完成後至內部紀錄保存期間為止'],
          ['防止不當使用與維持服務穩定', '存取紀錄、使用紀錄、會員狀態變更紀錄', '依相關法令或內部資安標準所需期間'],
        ],
      }],
      ['處理與保護原則', ['個人資訊僅於會員註冊審核、買家審核、詢問回覆、紀錄管理、防止不當使用所需範圍內處理。', '目的達成後，除法令、爭議處理或資安標準要求保存外，將刪除或分離保存。', '如拒絕必填同意，會員申請及報價詢問處理可能受到限制。']],
    ],
  },
  marketing_updates: {
    en: [
      ['Article 1 Purpose', 'Noblesse may send new product, catalog, collection, material, event, and buyer guide updates to members who consent.'],
      ['Article 2 Delivery Channels', 'Updates may be delivered by email, message, messenger, or service notification depending on the contact information submitted by the member.'],
      ['Article 3 Optional Consent', 'Marketing update consent is optional and refusal does not limit membership request or required service use.'],
      ['Article 4 Opt-out', 'Members may withdraw marketing consent at any time through the service screen or contact channel.'],
    ],
    jp: [
      ['第1条 目的', '貴族は同意した会員に対し、新商品、カタログ、コレクション、素材、イベント、バイヤー向け案内を送信することがあります。'],
      ['第2条 送信方法', '案内は、会員が提出した連絡先情報に応じて、メール、メッセージ、メッセンジャー、サービス通知などで送信されることがあります。'],
      ['第3条 任意同意', 'マーケティング案内の受信同意は任意であり、拒否しても会員申請または必須サービス利用は制限されません。'],
      ['第4条 受信停止', '会員はサービス画面または連絡窓口を通じて、いつでもマーケティング同意を撤回できます。'],
    ],
    cn: [
      ['第1條 目的', '貴族得向同意的會員發送新品、目錄、系列、材質、活動及買家說明。'],
      ['第2條 發送方式', '通知得依會員提交的聯絡資訊，透過電子郵件、訊息、通訊軟體或服務通知等方式發送。'],
      ['第3條 選填同意', '行銷通知同意為選填，拒絕不會限制會員申請或必要服務使用。'],
      ['第4條 取消接收', '會員可透過服務畫面或聯絡管道，隨時撤回行銷同意。'],
    ],
  },
}

function _FieldGroup({ title, children }) {
  return <fieldset className="form-section">
    <legend>{title}</legend>
    <div className="register-grid">{children}</div>
  </fieldset>
}

function AgreementDocument({ document, locale }) {
  const useEnglish = locale !== 'kr'
  const localizedSections =
    resolveLocaleCopy(localizedAgreementDetailOverrides[document.key], locale) ??
    resolveLocaleCopy(localizedAgreementSections[document.key], locale, 'en')
  const renderAgreementBody = (body) => {
    if (Array.isArray(body)) {
      return body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
    }

    if (body?.type === 'table') {
      return <div className="agreement-table-wrap">
        <table className="agreement-table">
          <thead>
            <tr>
              {body.columns.map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {body.rows.map((row) => <tr key={row.join('-')}>
              {row.map((cell) => <td key={cell}>{cell}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    }

    return <p>{body}</p>
  }

  if (localizedSections) {
    return <div className="agreement-scroll">
      {localizedSections.map(([heading, body]) => <section key={`${document.key}-${locale}-${heading}`} className="agreement-copy-section">
        <h4>{heading}</h4>
        {renderAgreementBody(body)}
      </section>)}
    </div>
  }

  return <div className="agreement-scroll">
    {document.sections.map((section) => <section key={`${document.key}-${section.headingEn}`} className="agreement-copy-section">
      <h4>{useEnglish ? section.headingEn : section.headingKo}</h4>
      <p>{useEnglish ? section.bodyEn : section.bodyKo}</p>
      {locale === 'kr' && <>
        <h5>{section.headingEn}</h5>
        <p>{section.bodyEn}</p>
      </>}
    </section>)}
  </div>
}

function AgreementRow({ agreement, checked, locale, onChange }) {
  const metaCopy = resolveLocaleCopy(agreementMetaCopy, locale)
  const labelPrefix = agreement.required ? metaCopy.required : metaCopy.optional
  const localeAgreementLabels = resolveLocaleCopy(agreementLabelsByLocale, locale)
  const agreementLabel = localeAgreementLabels?.[agreement.key] ?? agreementLabelsByLocale.kr[agreement.key] ?? agreement.titleKo

  return <div className={`agreement-card agreement-row ${agreement.required ? 'required' : 'optional'}`}>
    <div className="agreement-row-main">
      <label>
        <input checked={checked} data-agreement-key={agreement.key} onChange={(event) => onChange(agreement.key, event.target.checked)} type="checkbox" />
        <span>
          <strong>{labelPrefix} {agreementLabel}</strong>
        </span>
      </label>
      {agreement.sections.length > 0 && <details className="agreement-details agreement-inline-details">
        <summary>{metaCopy.details}</summary>
        <AgreementDocument document={agreement} locale={locale} />
        <button
          className="agreement-detail-accept"
          disabled={checked}
          onClick={() => onChange(agreement.key, true)}
          type="button"
        >
          {checked ? metaCopy.accepted : metaCopy.accept}
        </button>
      </details>}
    </div>
  </div>
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { dataMode, registerBuyer, setViewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const t = resolveLocaleCopy(registerCopy, locale)
  const [agreements, setAgreements] = useState(getInitialAgreements)
  const [registerStep, setRegisterStep] = useState('agreements')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [countryQuery, setCountryQuery] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [emailDomain, setEmailDomain] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [passwordConfirmValue, setPasswordConfirmValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [loginIdValue, setLoginIdValue] = useState('')
  const [duplicateStatus, setDuplicateStatus] = useState(null)
  const [submitNotice, setSubmitNotice] = useState('')
  const [submitStatus, setSubmitStatus] = useState('idle')
  const agreementSummaries = getAgreementSummaryForRegister()
  const registerAgreementSummaries = [ageAgreementSummary, ...agreementSummaries]
  const privacyPolicy = getAgreementDocument('privacy_policy')
  const requiredAccepted = agreements.age_confirmed === true && areRequiredAgreementsAccepted(agreements)
  const requiredAgreementKeys = registerAgreementSummaries.filter((agreement) => agreement.required).map((agreement) => agreement.key)
  const requiredAllAccepted = requiredAgreementKeys.every((key) => agreements[key] === true)
  const profileFields = resolveLocaleCopy(profileFieldsByLocale, locale)
  const stepCopy = resolveLocaleCopy(registerStepCopy, locale)
  const countryOptions = resolveLocaleCopy(countryOptionsByLocale, locale)
  const emailDomains = resolveLocaleCopy(emailDomainsByLocale, locale)
  const profileHelpers = resolveLocaleCopy(profileHelperCopy, locale)
  const passwordMismatch = resolveLocaleCopy(passwordMismatchCopy, locale)
  const passwordRuleLabels = resolveLocaleCopy(passwordRuleLabelsByLocale, locale)
  const passwordToggleLabels = resolveLocaleCopy(passwordToggleLabelsByLocale, locale)
  const countryOtherValue = countryOptions[countryOptions.length - 1]
  const customEmailDomainValue = emailDomains[emailDomains.length - 1]
  const pageTitle = resolveLocaleCopy(signupTitleByLocale, locale)
  const filteredCountryOptions = countryOptions.filter((option) => option.toLowerCase().includes(countryQuery.trim().toLowerCase()))
  const duplicateStatusClass = duplicateStatus?.type === 'available' ? 'valid' : duplicateStatus ? 'invalid' : ''
  const passwordConfirmStatus = passwordConfirmValue ? (passwordValue === passwordConfirmValue ? 'valid' : 'invalid') : ''
  const passwordRules = [
    ['length', passwordValue.length >= 8],
    ['number', /\d/.test(passwordValue)],
    ['symbol', /[^A-Za-z0-9]/.test(passwordValue)],
  ]

  const setAgreement = (name, checked) => {
    setAgreements((current) => ({ ...current, [name]: checked }))
  }

  const setRequiredAgreements = (checked) => {
    setAgreements((current) => ({
      ...current,
      ...Object.fromEntries(requiredAgreementKeys.map((key) => [key, checked])),
    }))
  }

  const continueToProfile = (event) => {
    event.preventDefault()
    if (requiredAccepted) setRegisterStep('profile')
  }

  const checkDuplicateId = () => {
    const normalizedId = loginIdValue.trim().toLowerCase()
    const reservedIds = ['admin', 'noblesse', 'test', 'guest', 'buyer']

    if (!normalizedId) {
      setDuplicateStatus({ type: 'empty', message: stepCopy.duplicateEmpty })
      return
    }

    if (normalizedId.length < 4) {
      setDuplicateStatus({ type: 'short', message: stepCopy.duplicateShort })
      return
    }

    if (reservedIds.includes(normalizedId)) {
      setDuplicateStatus({ type: 'unavailable', message: stepCopy.duplicateUnavailable })
      return
    }

    setDuplicateStatus({ type: 'available', message: stepCopy.duplicateAvailable })
  }

  const renderPasswordVisual = (value, visible, keyPrefix) => {
    if (!value) return null

    return <span className={`password-visual-text ${visible ? 'is-visible' : 'is-hidden'}`} aria-hidden="true">
      {Array.from(value).map((character, index) => <span
        className="password-visual-char"
        key={`${keyPrefix}-${visible ? 'visible' : 'hidden'}-${index}-${character}`}
        style={{ animationDelay: `${index * 28}ms` }}
      >
        {visible ? character : '•'}
      </span>)}
    </span>
  }

  const submitRequest = async (event) => {
    event.preventDefault()
    if (submitStatus === 'submitting') return
    setSubmitNotice('')
    if (!requiredAccepted) return

    const passwordInput = event.currentTarget.elements.password
    const passwordConfirmInput = event.currentTarget.elements.passwordConfirm
    passwordConfirmInput.setCustomValidity('')

    if (passwordInput.value !== passwordConfirmInput.value) {
      passwordConfirmInput.setCustomValidity(passwordMismatch)
      passwordConfirmInput.reportValidity()
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const emailLocal = String(formData.get('emailLocal') || '').trim()
    const selectedEmailDomain = String(formData.get('emailDomain') || '').trim()
    const emailCustomDomain = String(formData.get('emailCustomDomain') || '').trim()
    const finalEmailDomain = selectedEmailDomain === customEmailDomainValue ? emailCustomDomain : selectedEmailDomain
    const email = emailLocal && finalEmailDomain ? `${emailLocal}@${finalEmailDomain}` : ''
    const country = selectedCountry === countryOtherValue
      ? String(formData.get('countryOther') || '').trim()
      : String(formData.get('country') || selectedCountry || '').trim()
    const agreementSnapshot = buildAgreementSnapshot(agreements)

    if (dataMode !== 'mock') {
      setSubmitStatus('submitting')
      try {
        await registerBuyer({
          email,
          password: passwordInput.value,
          profile: {
            email,
            companyName: formData.get('companyName'),
            contactName: formData.get('name') || formData.get('contactName'),
            country,
            preferredLanguage: locale,
            phone: formData.get('phone'),
            messengerType: formData.get('messengerType'),
            messengerId: formData.get('messengerId'),
            salesChannel: formData.get('salesChannel'),
            businessNumber: formData.get('businessNumber'),
            requestMemo: formData.get('requestMemo'),
            agreements: agreementSnapshot,
          },
        })
        navigate(toLocalePath('/approval-pending'))
      } catch (error) {
        setSubmitNotice(error?.message || 'Unable to send buyer registration inquiry.')
        setSubmitStatus('idle')
      }
      return
    }

    setSubmitStatus('submitting')
    setViewerState('pending')
    navigate(toLocalePath('/approval-pending'))
  }

  const renderProfileField = ([label, name, type, placeholder, fieldClass = '', helperKey]) => {
    if (type === 'country') {
      return <label className={fieldClass} key={name}>
        {label}
        <span className={`register-country-combo ${countryOpen ? 'is-open' : ''}`}>
          <input
            autoComplete="country-name"
            name={name}
            onBlur={() => window.setTimeout(() => setCountryOpen(false), 120)}
            onChange={(event) => {
              setCountryQuery(event.target.value)
              setSelectedCountry(event.target.value)
              setCountryOpen(true)
            }}
            onFocus={() => setCountryOpen(true)}
            placeholder={placeholder}
            required
            type="text"
            value={countryQuery}
          />
          <button aria-label="Open country list" onMouseDown={(event) => event.preventDefault()} onClick={() => setCountryOpen((current) => !current)} type="button">▾</button>
          {countryOpen && <span className="register-country-menu">
            {(filteredCountryOptions.length > 0 ? filteredCountryOptions : countryOptions).map((option) => <button
              key={option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setCountryQuery(option)
                setSelectedCountry(option)
                setCountryOpen(false)
              }}
              type="button"
            >
              {option}
            </button>)}
          </span>}
        </span>
        {selectedCountry === countryOtherValue && <input
          className="register-inline-extra"
          name="countryOther"
          placeholder={profileHelpers.countryOther}
          required
          type="text"
        />}
      </label>
    }

    if (type === 'file') {
      return <label className={`full-span ${fieldClass}`.trim()} key={name}>
        <span className="field-label-with-help">
          {label}
          {helperKey && <small>{profileHelpers[helperKey]}</small>}
        </span>
        <input name={name} type="file" />
      </label>
    }

    if (type === 'id') {
      return <label className={`register-id-field ${fieldClass}`.trim()} key={name}>
        {label}
        <span className="register-id-row">
          <input
            autoComplete="username"
            name={name}
            onChange={(event) => {
              setLoginIdValue(event.target.value)
              setDuplicateStatus(null)
            }}
            placeholder={placeholder}
            required
            type="text"
            value={loginIdValue}
          />
          <button onClick={checkDuplicateId} type="button">{stepCopy.duplicateCheck}</button>
        </span>
        {duplicateStatus && <small className={`duplicate-status ${duplicateStatusClass}`}>{duplicateStatus.message}</small>}
      </label>
    }

    if (type === 'emailComposite') {
      return <label className={fieldClass} key={name}>
        {label}
        <span className="register-email-row">
          <input autoComplete="email" name="emailLocal" placeholder={placeholder} required type="text" />
          <span aria-hidden="true">@</span>
          <select defaultValue="" name="emailDomain" onChange={(event) => setEmailDomain(event.target.value)} required>
            <option disabled value="">{profileHelpers.emailDomain}</option>
            {emailDomains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
          </select>
        </span>
        {emailDomain === customEmailDomainValue && <input
          className="register-inline-extra"
          name="emailCustomDomain"
          placeholder={profileHelpers.customEmailDomain}
          required
          type="text"
        />}
      </label>
    }

    const autoComplete = name === 'password' ? 'new-password' : 'off'
    const passwordProps = name === 'password'
      ? {
          minLength: 8,
          onChange: (event) => setPasswordValue(event.target.value),
          pattern: '^(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$',
          title: profileHelpers.password,
        }
      : {}

    if (name === 'password') {
      return <label className={fieldClass} key={name}>
        <span className="password-label-row">
          <span>{label}</span>
          <ul className="password-rule-list" aria-live="polite">
            {passwordRules.map(([rule, passed]) => <li className={passed ? 'valid' : 'invalid'} key={rule}>
              <span aria-hidden="true">{passed ? '✓' : '!'}</span>
              {passwordRuleLabels[rule]}
            </li>)}
          </ul>
        </span>
        <span className="password-input-control">
          <input
            autoComplete={autoComplete}
            className="password-actual-input"
            name={name}
            placeholder={placeholder}
            required
            type={showPassword ? 'text' : 'password'}
            value={passwordValue}
            {...passwordProps}
          />
          {renderPasswordVisual(passwordValue, showPassword, 'password')}
          <button
            aria-label={showPassword ? passwordToggleLabels.hide : passwordToggleLabels.show}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        </span>
      </label>
    }

    if (name === 'passwordConfirm') {
      return <label className={fieldClass} key={name}>
        {label}
        <span className="password-input-control">
          <input
            autoComplete="new-password"
            className={passwordConfirmStatus ? `password-actual-input password-confirm-input ${passwordConfirmStatus}` : 'password-actual-input password-confirm-input'}
            name={name}
            onChange={(event) => setPasswordConfirmValue(event.target.value)}
            placeholder={placeholder}
            required
            type={showPasswordConfirm ? 'text' : 'password'}
            value={passwordConfirmValue}
          />
          {renderPasswordVisual(passwordConfirmValue, showPasswordConfirm, 'password-confirm')}
          <button
            aria-label={showPasswordConfirm ? passwordToggleLabels.hide : passwordToggleLabels.show}
            onClick={() => setShowPasswordConfirm((current) => !current)}
            type="button"
          >
            {showPasswordConfirm ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        </span>
      </label>
    }

    return <label className={fieldClass} key={name}>
      {label}
      <input autoComplete={autoComplete} name={name} placeholder={placeholder} required type={type} {...passwordProps} />
      {helperKey && <small className="field-helper">{profileHelpers[helperKey]}</small>}
    </label>
  }

  return <main className="content auth-page">
    <section className="account-panel auth-panel wide register-locale-motion" key={`register-${locale}-${registerStep}`}>
      <h1>{pageTitle}</h1>
      {registerStep === 'agreements' ? <form className="auth-form" onSubmit={continueToProfile}>
        <section className="agreement-section" aria-label={t.agreementsTitle}>
          <label className="agreement-required-all">
            <input checked={requiredAllAccepted} data-testid="agreement-all" onChange={(event) => setRequiredAgreements(event.target.checked)} type="checkbox" />
            <span>
              <strong>{t.allAgree}</strong>
              <small>{stepCopy.requiredOnly}</small>
            </span>
          </label>

          {registerAgreementSummaries.map((agreement) => <AgreementRow
            agreement={agreement}
            checked={agreements[agreement.key] === true}
            key={agreement.key}
            locale={locale}
            onChange={setAgreement}
          />)}

          {privacyPolicy && <details className="agreement-details privacy-policy-detail">
            <summary>{t.privacyPolicy}</summary>
            <AgreementDocument document={privacyPolicy} locale={locale} />
          </details>}

          {!requiredAccepted && <p className="agreement-warning">
            {t.warning}
            <span>{t.warningSub}</span>
          </p>}
        </section>

        <div className="account-actions agreement-actions">
          <button className="primary-action" disabled={!requiredAccepted} type="submit">{stepCopy.continue}</button>
        </div>
      </form> : <form className="auth-form" onSubmit={submitRequest}>
        <fieldset className="form-section">
          <legend>{stepCopy.infoTitle}</legend>
          <div className="register-grid">
            {profileFields.map(renderProfileField)}
          </div>
        </fieldset>
        <fieldset className="form-section">
          <legend>{stepCopy.memoTitle}</legend>
          <label>{stepCopy.memoLabel}<textarea name="requestMemo" placeholder={stepCopy.memoPlaceholder} /></label>
        </fieldset>
        <div className="approval-note">
          <strong>{t.approvalTitle}</strong>
          <span>{t.approvalBody}</span>
          <span>{t.orderDisclaimer}</span>
        </div>
        <div className="account-actions agreement-actions">
          {submitNotice && <p className="auth-notice" role="status">{submitNotice}</p>}
          <button className="primary-action" data-testid="request-buyer-access-submit" disabled={submitStatus === 'submitting'} type="submit">{submitStatus === 'submitting' ? `${stepCopy.submit}...` : stepCopy.submit}</button>
        </div>
      </form>}
    </section>
  </main>
}
