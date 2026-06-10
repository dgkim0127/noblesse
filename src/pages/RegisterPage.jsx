import { FileText } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import {
  areRequiredAgreementsAccepted,
  buildAgreementSnapshot,
  getInitialAgreements,
} from '../services'
import { useLocalePath } from '../utils/locale'

const approvalHelper = 'Buyer Approval이 완료되면 승인 바이어 가격, MOQ, Inquiry List, Request Quote 기능을 사용할 수 있습니다.'

const buyerFields = [
  ['Email', 'email', 'email'],
  ['Password', 'password', 'password'],
  ['Company Name', 'companyName', 'text'],
  ['Contact Name', 'contactName', 'text'],
  ['Country', 'country', 'text'],
  ['Preferred Language', 'preferredLanguage', 'text'],
]

const contactFields = [
  ['Phone', 'phone', 'tel'],
  ['Messenger Type', 'messengerType', 'text'],
  ['Messenger ID', 'messengerId', 'text'],
]

const businessFields = [
  ['Sales Channel', 'salesChannel', 'text'],
  ['Business Number', 'businessNumber', 'text'],
]

const agreementDetails = {
  termsOfService: {
    title: 'Terms of Service',
    titleKo: '이용약관 동의',
    viewLabel: 'View Terms',
    body: [
      'Noblesse Piercing is a B2B catalog website for global buyers.',
      'Products, prices, MOQ, and Request Quote features are provided for approved buyers.',
      'Request Quote is not a final order.',
      'Final pricing, stock, lead time, and shipping conditions are confirmed by Noblesse.',
    ],
    bodyKo: [
      'Noblesse Piercing은 글로벌 바이어를 위한 B2B 카탈로그 웹사이트입니다.',
      '상품, 가격, MOQ, 견적 요청 기능은 승인된 바이어에게 제공됩니다.',
      '견적 요청은 최종 확정 거래가 아닙니다.',
      '최종 단가, 재고, 납기, 배송 조건은 Noblesse 확인 후 안내됩니다.',
    ],
  },
  privacyCollectionUse: {
    title: 'Privacy Collection and Use',
    titleKo: '개인정보 수집 및 이용 동의',
    viewLabel: 'View Privacy Notice',
    body: [
      'Purpose: Buyer access review, company verification, contact, market assignment, Request Quote processing.',
      'Collected items: Email, password, company name, contact name, country, preferred language, phone, messenger type, messenger ID, sales channel, business number, request memo.',
      'Retention: Retained while buyer account is active, or as required for business/legal record keeping.',
      'Right to refuse: You may refuse consent, but buyer access request cannot be processed without required information.',
    ],
    bodyKo: [
      '목적: 바이어 접근 권한 검토, 회사 확인, 연락, 마켓 배정, 견적 요청 처리.',
      '수집 항목: 이메일, 비밀번호, 회사명, 담당자명, 국가, 선호 언어, 전화번호, 메신저 종류, 메신저 ID, 판매 채널, 사업자 번호, 요청 메모.',
      '보유 기간: 바이어 계정이 활성 상태인 동안 또는 업무/법적 기록 보관에 필요한 기간 동안 보관됩니다.',
      '동의 거부 권리: 동의를 거부할 수 있으나 필수 정보 없이는 바이어 신청을 처리할 수 없습니다.',
    ],
  },
  marketingUpdates: {
    title: 'Marketing and New Arrival Updates',
    titleKo: '마케팅 및 신상품 안내 수신 동의',
    viewLabel: 'View Marketing Notice',
    body: [
      'Purpose: New product, catalog, collection, event, and buyer update notices.',
      'Channels: Email, messenger, or other submitted contact channels.',
      'Optional: You may refuse marketing consent and still request buyer access.',
    ],
    bodyKo: [
      '목적: 신상품, 카탈로그, 컬렉션, 이벤트, 바이어 업데이트 안내.',
      '채널: 이메일, 메신저 또는 제출한 기타 연락 채널.',
      '선택 항목: 마케팅 수신 동의를 거부해도 바이어 신청은 가능합니다.',
    ],
  },
}

function FieldGroup({ title, children }) {
  return <fieldset className="form-section">
    <legend>{title}</legend>
    <div className="register-grid">{children}</div>
  </fieldset>
}

function AgreementDetails({ agreementKey }) {
  const detail = agreementDetails[agreementKey]

  return <details className="agreement-details">
    <summary>{detail.viewLabel}</summary>
    <div>
      <strong>{detail.titleKo}</strong>
      <small>{detail.title}</small>
      <ul>
        {detail.bodyKo.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <ul>
        {detail.body.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </div>
  </details>
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { setViewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const [agreements, setAgreements] = useState(getInitialAgreements)
  const requiredAccepted = areRequiredAgreementsAccepted(agreements)
  const allAccepted = Object.values(agreements).every(Boolean)

  const setAgreement = (name, checked) => {
    setAgreements((current) => ({ ...current, [name]: checked }))
  }

  const setAllAgreements = (checked) => {
    setAgreements({
      termsOfService: checked,
      privacyCollectionUse: checked,
      marketingUpdates: checked,
    })
  }

  const submitRequest = (event) => {
    event.preventDefault()
    if (!requiredAccepted) return

    const agreementSnapshot = buildAgreementSnapshot(agreements)
    void agreementSnapshot

    setViewerState('pending')
    navigate(toLocalePath('/approval-pending'))
  }

  return <main className="content auth-page">
    <section className="account-panel auth-panel wide">
      <FileText size={25} />
      <p className="eyebrow">BUYER ACCESS</p>
      <h1>Request access to Approved Buyer Price</h1>
      <p>Submit your buyer information for Noblesse review. This mock form routes to the pending state before real authentication is connected.</p>
      <p className="approval-helper">{approvalHelper}</p>
      <form className="auth-form" onSubmit={submitRequest}>
        <FieldGroup title="Buyer Information">
          {buyerFields.map(([label, name, type]) => <label key={name}>{label}<input autoComplete="off" name={name} placeholder={label} type={type} /></label>)}
        </FieldGroup>
        <FieldGroup title="Contact Information">
          {contactFields.map(([label, name, type]) => <label key={name}>{label}<input autoComplete="off" name={name} placeholder={label} type={type} /></label>)}
        </FieldGroup>
        <FieldGroup title="Business Information">
          {businessFields.map(([label, name, type]) => <label key={name}>{label}<input autoComplete="off" name={name} placeholder={label} type={type} /></label>)}
        </FieldGroup>
        <fieldset className="form-section">
          <legend>Request Memo</legend>
          <label>Request Memo<textarea name="requestMemo" placeholder="Tell us about your store, market, or preferred piercing line." /></label>
        </fieldset>
        <div className="approval-note">
          <strong>Approval Notice</strong>
          <span>Buyer Approval is reviewed manually. Prices and Request Quote features remain locked until approval.</span>
        </div>

        <section className="agreement-section" aria-labelledby="agreement-title">
          <div className="agreement-summary">
            <div>
              <p className="eyebrow">AGREEMENTS</p>
              <h2 id="agreement-title">약관 및 개인정보 동의</h2>
              <span>Legal text is a placeholder for version 1. Final operating terms and privacy policy must be reviewed before launch.</span>
            </div>
            <label className="agreement-card agreement-row agreement-all">
              <input checked={allAccepted} onChange={(event) => setAllAgreements(event.target.checked)} type="checkbox" />
              <span>
                <strong>전체 동의</strong>
                <small>Agree to all</small>
              </span>
            </label>
          </div>

          <div className="agreement-card agreement-row required">
            <label>
              <input checked={agreements.termsOfService} onChange={(event) => setAgreement('termsOfService', event.target.checked)} type="checkbox" />
              <span>
                <strong>[필수] 이용약관 동의</strong>
                <small>[Required] Terms of Service</small>
              </span>
            </label>
            <AgreementDetails agreementKey="termsOfService" />
          </div>

          <div className="agreement-card agreement-row required">
            <label>
              <input checked={agreements.privacyCollectionUse} onChange={(event) => setAgreement('privacyCollectionUse', event.target.checked)} type="checkbox" />
              <span>
                <strong>[필수] 개인정보 수집 및 이용 동의</strong>
                <small>[Required] Privacy Collection and Use</small>
              </span>
            </label>
            <AgreementDetails agreementKey="privacyCollectionUse" />
          </div>

          <div className="agreement-card agreement-row optional">
            <label>
              <input checked={agreements.marketingUpdates} onChange={(event) => setAgreement('marketingUpdates', event.target.checked)} type="checkbox" />
              <span>
                <strong>[선택] 마케팅 및 신상품 안내 수신 동의</strong>
                <small>[Optional] Marketing and New Arrival Updates</small>
              </span>
            </label>
            <AgreementDetails agreementKey="marketingUpdates" />
          </div>

          {!requiredAccepted && <p className="agreement-warning">
            Please agree to the required terms to request buyer access.
            <span>거래처 승인 요청을 위해 필수 약관에 동의해주세요.</span>
          </p>}
        </section>

        <div className="account-actions">
          <button className="primary-action" disabled={!requiredAccepted} type="submit">Request Buyer Access</button>
          <Link className="secondary-action" to={toLocalePath('/login')}>Back to Login</Link>
        </div>
      </form>
    </section>
  </main>
}
