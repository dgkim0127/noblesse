import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import {
  areRequiredAgreementsAccepted,
  buildAgreementSnapshot,
  getAgreementDocument,
  getAgreementSummaryForRegister,
  getInitialAgreements,
} from '../services'
import { useLocalePath } from '../utils/locale'

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

const primaryContactEmail = 'dgkim0127@gmail.com'

const contactEmailNotes = {
  kr: `급한 거래 문의는 {email} 으로도 남겨주세요.`,
  en: `For urgent trade inquiries, you can also email {email}.`,
  jp: `お急ぎの取引先お問い合わせは {email} でも受け付けています。`,
  cn: `如需紧急贸易咨询，也可以发送邮件至 {email}。`,
}

const fieldGroups = {
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
    ['아이디', 'loginId', 'text', '아이디'],
    ['비밀번호', 'password', 'password', '비밀번호'],
    ['업체명', 'companyName', 'text', '업체명 또는 상호'],
    ['담당자명', 'contactName', 'text', '담당자명'],
    ['연락처', 'contact', 'text', '이메일 또는 전화번호'],
    ['국가/지역', 'country', 'text', '예: KR, JP, US'],
  ],
  en: [
    ['ID', 'loginId', 'text', 'ID'],
    ['Password', 'password', 'password', 'Password'],
    ['Company', 'companyName', 'text', 'Company or shop name'],
    ['Contact name', 'contactName', 'text', 'Contact name'],
    ['Contact', 'contact', 'text', 'Email or phone'],
    ['Country / Region', 'country', 'text', 'e.g. KR, JP, US'],
  ],
  jp: [
    ['ID', 'loginId', 'text', 'ID'],
    ['パスワード', 'password', 'password', 'パスワード'],
    ['会社名', 'companyName', 'text', '会社名または店舗名'],
    ['担当者名', 'contactName', 'text', '担当者名'],
    ['連絡先', 'contact', 'text', 'メールまたは電話番号'],
    ['国 / 地域', 'country', 'text', '例: KR, JP, US'],
  ],
  cn: [
    ['ID', 'loginId', 'text', 'ID'],
    ['密码', 'password', 'password', '密码'],
    ['公司名称', 'companyName', 'text', '公司或店铺名称'],
    ['联系人', 'contactName', 'text', '联系人'],
    ['联系方式', 'contact', 'text', '邮箱或电话'],
    ['国家 / 地区', 'country', 'text', '例如: KR, JP, US'],
  ],
}

const registerStepCopy = {
  kr: {
    continue: '동의하고 정보 입력하기',
    infoTitle: '정보 입력',
    memoTitle: '문의 내용',
    memoLabel: '문의 내용',
    memoPlaceholder: '관심 제품, 예상 수량, 판매 지역 등 필요한 내용만 간단히 적어주세요.',
    backToAgreements: '동의 항목 다시 보기',
    requiredOnly: '필수 항목에만',
  },
  en: {
    continue: 'Agree and enter information',
    infoTitle: 'Information',
    memoTitle: 'Inquiry memo',
    memoLabel: 'Inquiry memo',
    memoPlaceholder: 'Briefly add products, quantity, market, or trade notes.',
    backToAgreements: 'Back to agreements',
    requiredOnly: 'Required items only',
  },
  jp: {
    continue: '同意して情報を入力',
    infoTitle: '情報入力',
    memoTitle: 'お問い合わせ内容',
    memoLabel: 'お問い合わせ内容',
    memoPlaceholder: '気になる商品、数量、販売地域などを簡単に入力してください。',
    backToAgreements: '同意項目に戻る',
    requiredOnly: '必須項目のみ',
  },
  cn: {
    continue: '同意后填写信息',
    infoTitle: '填写信息',
    memoTitle: '咨询内容',
    memoLabel: '咨询内容',
    memoPlaceholder: '请简单填写感兴趣的产品、预计数量、销售地区等。',
    backToAgreements: '返回同意项目',
    requiredOnly: '仅必填项目',
  },
}

function FieldGroup({ title, children }) {
  return <fieldset className="form-section">
    <legend>{title}</legend>
    <div className="register-grid">{children}</div>
  </fieldset>
}

function AgreementDocument({ document, locale }) {
  const useEnglish = locale !== 'kr'

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

function AgreementRow({ agreement, checked, locale, onChange, t }) {
  const labelPrefix = agreement.required ? t.required : t.optional

  return <div className={`agreement-card agreement-row ${agreement.required ? 'required' : 'optional'}`}>
    <label>
      <input checked={checked} data-agreement-key={agreement.key} onChange={(event) => onChange(agreement.key, event.target.checked)} type="checkbox" />
      <span>
        <strong>{labelPrefix} {locale === 'kr' ? agreement.titleKo : agreement.titleEn}</strong>
        <small>{locale === 'kr' ? agreement.titleEn : agreement.titleKo}</small>
        <em className="agreement-version">version: {agreement.version}</em>
      </span>
    </label>
    {agreement.sections.length > 0 && <details className="agreement-details">
      <summary>{t.viewDetails}</summary>
      <AgreementDocument document={agreement} locale={locale} />
    </details>}
  </div>
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { setViewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const t = registerCopy[locale] ?? registerCopy.kr
  const contactNote = contactEmailNotes[locale] ?? contactEmailNotes.kr
  const [contactNoteBefore, contactNoteAfter = ''] = contactNote.split('{email}')
  const [agreements, setAgreements] = useState(getInitialAgreements)
  const [registerStep, setRegisterStep] = useState('agreements')
  const agreementSummaries = getAgreementSummaryForRegister()
  const registerAgreementSummaries = [ageAgreementSummary, ...agreementSummaries]
  const privacyPolicy = getAgreementDocument('privacy_policy')
  const requiredAccepted = agreements.age_confirmed === true && areRequiredAgreementsAccepted(agreements)
  const requiredAgreementKeys = registerAgreementSummaries.filter((agreement) => agreement.required).map((agreement) => agreement.key)
  const requiredAllAccepted = requiredAgreementKeys.every((key) => agreements[key] === true)
  const profileFields = profileFieldsByLocale[locale] ?? profileFieldsByLocale.kr
  const stepCopy = registerStepCopy[locale] ?? registerStepCopy.kr
  const pageTitle = locale === 'kr' ? '회원 가입' : t.title

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

  const submitRequest = (event) => {
    event.preventDefault()
    if (!requiredAccepted) return

    const agreementSnapshot = buildAgreementSnapshot(agreements)
    void agreementSnapshot

    setViewerState('pending')
    navigate(toLocalePath('/approval-pending'))
  }

  const renderField = ([name, type]) => <label key={name}>
    {t.fields[name]}
    <input autoComplete="off" name={name} placeholder={t.fields[name]} type={type} />
  </label>

  return <main className="content auth-page">
    <section className="account-panel auth-panel wide">
      <h1>{pageTitle}</h1>
      {registerStep === 'profile' && <p className="approval-helper">{contactNoteBefore}<a href={`mailto:${primaryContactEmail}`}>{primaryContactEmail}</a>{contactNoteAfter}</p>}
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
            t={t}
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
          <Link className="secondary-action" to={toLocalePath('/login')}>{t.back}</Link>
        </div>
      </form> : <form className="auth-form" onSubmit={submitRequest}>
        <fieldset className="form-section">
          <legend>{stepCopy.infoTitle}</legend>
          <div className="register-grid">
            {profileFields.map(([label, name, type, placeholder]) => <label key={name}>
              {label}
              <input autoComplete="off" name={name} placeholder={placeholder} required type={type} />
            </label>)}
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
          <button className="secondary-action" onClick={() => setRegisterStep('agreements')} type="button">{stepCopy.backToAgreements}</button>
          <button className="primary-action" data-testid="request-buyer-access-submit" type="submit">{t.submit}</button>
        </div>
      </form>}
    </section>
  </main>
}
