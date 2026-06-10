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

const approvalHelper = 'Buyer Approval이 완료되면 Approved Buyer Price, MOQ, Inquiry List, Request Quote 기능을 사용할 수 있습니다.'

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

function FieldGroup({ title, children }) {
  return <fieldset className="form-section">
    <legend>{title}</legend>
    <div className="register-grid">{children}</div>
  </fieldset>
}

function AgreementDocument({ document }) {
  return <div className="agreement-scroll">
    {document.sections.map((section) => <section key={`${document.key}-${section.headingEn}`} className="agreement-copy-section">
      <h4>{section.headingKo}</h4>
      <p>{section.bodyKo}</p>
      <h5>{section.headingEn}</h5>
      <p>{section.bodyEn}</p>
    </section>)}
  </div>
}

function AgreementRow({ agreement, checked, onChange }) {
  const labelPrefix = agreement.required ? '[필수]' : '[선택]'

  return <div className={`agreement-card agreement-row ${agreement.required ? 'required' : 'optional'}`}>
    <label>
      <input checked={checked} data-agreement-key={agreement.key} onChange={(event) => onChange(agreement.key, event.target.checked)} type="checkbox" />
      <span>
        <strong>{labelPrefix} {agreement.titleKo}</strong>
        <small>{agreement.titleEn}</small>
        <em className="agreement-version">version: {agreement.version}</em>
      </span>
    </label>
    <details className="agreement-details">
      <summary>자세히 보기 / View details</summary>
      <AgreementDocument document={agreement} />
    </details>
  </div>
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { setViewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
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
              <span>거래처 승인 요청에는 필수 약관 3개 동의가 필요합니다. 마케팅 안내 수신은 선택입니다.</span>
            </div>
            <label className="agreement-card agreement-row agreement-all">
              <input checked={allAccepted} data-testid="agreement-all" onChange={(event) => setAllAgreements(event.target.checked)} type="checkbox" />
              <span>
                <strong>전체 동의</strong>
                <small>Agree to all required and optional items</small>
              </span>
            </label>
          </div>

          {agreementSummaries.map((agreement) => <AgreementRow
            agreement={agreement}
            checked={agreements[agreement.key] === true}
            key={agreement.key}
            onChange={setAgreement}
          />)}

          {privacyPolicy && <details className="agreement-details privacy-policy-detail">
            <summary>개인정보 처리방침 보기 / View Privacy Policy</summary>
            <AgreementDocument document={privacyPolicy} />
          </details>}

          {!requiredAccepted && <p className="agreement-warning">
            Please agree to all required terms to request buyer access.
            <span>거래처 승인 요청을 위해 필수 약관을 모두 동의해주세요.</span>
          </p>}
        </section>

        <div className="account-actions agreement-actions">
          <button className="primary-action" data-testid="request-buyer-access-submit" disabled={!requiredAccepted} type="submit">Request Buyer Access</button>
          <Link className="secondary-action" to={toLocalePath('/login')}>Back to Login</Link>
        </div>
      </form>
    </section>
  </main>
}
