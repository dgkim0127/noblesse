import { FileText } from 'lucide-react'
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
    eyebrow: '회원 신청',
    title: '노블레스 회원 신청',
    intro: '기본 정보를 남겨주시면 Noblesse가 확인해드립니다.',
    helper: '확인 후 회원가, 최소 수량, 문의 리스트, 견적 문의 기능을 사용할 수 있습니다.',
    noticeTitle: '신청 전 확인해주세요',
    noticeItems: [
      '회원 정보는 담당자가 직접 확인합니다.',
      '회원가는 확인 후 볼 수 있습니다.',
      '견적 문의는 최종 확정이 아닙니다.',
      '최종 견적은 Noblesse 확인 후 안내합니다.',
    ],
    groups: { buyer: '회원 정보', contact: '연락처 정보', business: '비즈니스 정보', memo: '요청 메모' },
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
      requestMemo: '요청 메모',
    },
    memoPlaceholder: '운영 중인 스토어, 주요 시장, 관심 있는 피어싱 라인을 알려주세요.',
    approvalTitle: '확인 안내',
    approvalBody: '회원 정보는 담당자가 직접 확인합니다. 확인 전까지 가격과 견적 문의 기능은 잠겨 있습니다.',
    agreementsEyebrow: '약관',
    agreementsTitle: '약관 및 개인정보 동의',
    agreementsIntro: '회원 신청에는 필수 약관 3개 동의가 필요합니다. 마케팅 안내 수신은 선택입니다.',
    allAgree: '전체 동의',
    allAgreeSub: '필수 및 선택 항목에 모두 동의',
    required: '[필수]',
    optional: '[선택]',
    viewDetails: '자세히 보기',
    privacyPolicy: '개인정보 처리방침 보기',
    warning: '회원 신청을 위해 필수 약관을 모두 동의해주세요.',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '회원 신청하기',
    back: '로그인으로 돌아가기',
  },
  en: {
    eyebrow: 'MEMBER REQUEST',
    title: 'Noblesse Member Request',
    intro: 'Leave your basic company details and Noblesse will review them.',
    helper: 'After review, you can view member prices, minimum quantity, inquiry list, and quote inquiry features.',
    noticeTitle: 'Before you apply',
    noticeItems: [
      'Member details are reviewed by the Noblesse team.',
      'Member prices open after review.',
      'Quote inquiry is not a final confirmation.',
      'Final quote is confirmed by Noblesse.',
    ],
    groups: { buyer: 'Member Information', contact: 'Contact Information', business: 'Business Information', memo: 'Request Memo' },
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
      requestMemo: 'Request Memo',
    },
    memoPlaceholder: 'Tell us about your store, market, or preferred piercing line.',
    approvalTitle: 'Review Notice',
    approvalBody: 'Member information is reviewed manually. Prices and quote inquiry features remain locked until review is complete.',
    agreementsEyebrow: 'AGREEMENTS',
    agreementsTitle: 'Terms and privacy consent',
    agreementsIntro: 'Member request requires acceptance of three required agreement items. Marketing updates are optional.',
    allAgree: 'Agree to all',
    allAgreeSub: 'Agree to all required and optional items',
    required: '[Required]',
    optional: '[Optional]',
    viewDetails: 'View details',
    privacyPolicy: 'View Privacy Policy',
    warning: 'Please agree to all required terms to request access.',
    warningSub: 'All required items must be checked before submitting.',
    submit: 'Request Membership',
    back: 'Back to Login',
  },
  jp: {
    eyebrow: '会員申請',
    title: 'Noblesse 会員申請',
    intro: '基本情報を入力すると、Noblesseが確認します。',
    helper: '確認後、会員価格、最小数量、お問い合わせリスト、見積相談をご利用いただけます。',
    noticeTitle: '申請前にご確認ください',
    noticeItems: [
      '会員情報は担当者が確認します。',
      '会員価格は確認後にご覧いただけます。',
      '見積相談は最終確定ではありません。',
      '最終見積はNoblesse確認後にご案内します。',
    ],
    groups: { buyer: '会員情報', contact: '連絡先情報', business: '事業者情報', memo: 'リクエストメモ' },
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
      requestMemo: 'リクエストメモ',
    },
    memoPlaceholder: '運営中のストア、主な市場、関心のあるピアスラインを入力してください。',
    approvalTitle: '確認案内',
    approvalBody: '会員情報は担当者が確認します。確認前は価格と見積相談機能は利用できません。',
    agreementsEyebrow: '規約',
    agreementsTitle: '規約および個人情報同意',
    agreementsIntro: '会員申請には3つの必須同意が必要です。マーケティング案内の受信は任意です。',
    allAgree: 'すべて同意',
    allAgreeSub: '必須および任意項目にすべて同意',
    required: '[必須]',
    optional: '[任意]',
    viewDetails: '詳細を見る',
    privacyPolicy: '個人情報処理方針を見る',
    warning: '会員申請のため、必須規約にすべて同意してください。',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '会員申請',
    back: 'ログインへ戻る',
  },
  cn: {
    eyebrow: '会员申请',
    title: 'Noblesse 会员申请',
    intro: '留下基本公司信息后，Noblesse 会进行确认。',
    helper: '确认后，可查看会员价格、最小数量、咨询清单和报价咨询功能。',
    noticeTitle: '申请前请确认',
    noticeItems: [
      '会员信息将由工作人员确认。',
      '会员价格会在确认后开放。',
      '报价咨询不是最终确认。',
      '最终报价由 Noblesse 确认后提供。',
    ],
    groups: { buyer: '会员信息', contact: '联系方式', business: '业务信息', memo: '申请备注' },
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
      requestMemo: '申请备注',
    },
    memoPlaceholder: '请填写您的店铺、主要市场或感兴趣的穿孔产品线。',
    approvalTitle: '审核说明',
    approvalBody: '会员信息将由工作人员确认。确认前，价格和报价咨询功能将保持锁定。',
    agreementsEyebrow: '条款',
    agreementsTitle: '条款及个人信息同意',
    agreementsIntro: '申请会员权限需要同意3项必选条款。营销及新品通知为可选项。',
    allAgree: '全部同意',
    allAgreeSub: '同意所有必选及可选项目',
    required: '[必选]',
    optional: '[可选]',
    viewDetails: '查看详情',
    privacyPolicy: '查看隐私政策',
    warning: '请同意所有必选条款后再申请会员权限。',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '提交会员申请',
    back: '返回登录',
  },
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
    <details className="agreement-details">
      <summary>{t.viewDetails}</summary>
      <AgreementDocument document={agreement} locale={locale} />
    </details>
  </div>
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { setViewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const t = registerCopy[locale] ?? registerCopy.kr
  const [agreements, setAgreements] = useState(getInitialAgreements)
  const agreementSummaries = getAgreementSummaryForRegister()
  const privacyPolicy = getAgreementDocument('privacy_policy')
  const requiredAccepted = areRequiredAgreementsAccepted(agreements)
  const allAccepted = agreementSummaries.every((agreement) => agreements[agreement.key] === true)

  const setAgreement = (name, checked) => {
    setAgreements((current) => ({ ...current, [name]: checked }))
  }

  const setAllAgreements = (checked) => {
    setAgreements(Object.fromEntries(agreementSummaries.map((agreement) => [agreement.key, checked])))
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
      <FileText size={25} />
      <p className="eyebrow">{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <div className="buyer-access-intro">
        <p>{t.intro}</p>
        <p className="approval-helper">{t.helper}</p>
      </div>
      <aside className="buyer-access-notice" aria-label={t.noticeTitle}>
        <strong>{t.noticeTitle}</strong>
        <ul>
          {t.noticeItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </aside>
      <form className="auth-form" onSubmit={submitRequest}>
        <FieldGroup title={t.groups.buyer}>
          {fieldGroups.buyer.map(renderField)}
        </FieldGroup>
        <FieldGroup title={t.groups.contact}>
          {fieldGroups.contact.map(renderField)}
        </FieldGroup>
        <FieldGroup title={t.groups.business}>
          {fieldGroups.business.map(renderField)}
        </FieldGroup>
        <fieldset className="form-section">
          <legend>{t.groups.memo}</legend>
          <label>{t.fields.requestMemo}<textarea name="requestMemo" placeholder={t.memoPlaceholder} /></label>
        </fieldset>
        <div className="approval-note">
          <strong>{t.approvalTitle}</strong>
          <span>{t.approvalBody}</span>
        </div>

        <section className="agreement-section" aria-labelledby="agreement-title">
          <div className="agreement-summary">
            <div>
              <p className="eyebrow">{t.agreementsEyebrow}</p>
              <h2 id="agreement-title">{t.agreementsTitle}</h2>
              <span>{t.agreementsIntro}</span>
            </div>
            <label className="agreement-card agreement-row agreement-all">
              <input checked={allAccepted} data-testid="agreement-all" onChange={(event) => setAllAgreements(event.target.checked)} type="checkbox" />
              <span>
                <strong>{t.allAgree}</strong>
                <small>{t.allAgreeSub}</small>
              </span>
            </label>
          </div>

          {agreementSummaries.map((agreement) => <AgreementRow
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
          <button className="primary-action" data-testid="request-buyer-access-submit" disabled={!requiredAccepted} type="submit">{t.submit}</button>
          <Link className="secondary-action" to={toLocalePath('/login')}>{t.back}</Link>
        </div>
      </form>
    </section>
  </main>
}
