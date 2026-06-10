import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { agreementDocuments } from '../content/agreements'

const fields = [
  {
    title: '기본 정보',
    items: [
      ['이메일', 'email', 'email'],
      ['비밀번호', 'password', 'password'],
      ['회사명', 'companyName', 'text'],
      ['담당자명', 'contactName', 'text'],
      ['국가', 'country', 'text'],
      ['희망 언어', 'preferredLanguage', 'text'],
    ],
  },
  {
    title: '연락처 정보',
    items: [
      ['전화번호', 'phone', 'tel'],
      ['메신저 종류', 'messengerType', 'text'],
      ['메신저 ID', 'messengerId', 'text'],
    ],
  },
  {
    title: '도매 회원 정보',
    items: [
      ['판매 채널', 'salesChannel', 'text'],
      ['사업자 번호', 'businessNumber', 'text'],
    ],
  },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const { setViewerState } = useCommerce()

  const submitRequest = (event) => {
    event.preventDefault()
    setViewerState('pending')
    navigate('/approval-pending')
  }

  return <main className="content auth-page"><section className="account-panel auth-panel wide"><FileText size={25} /><p className="eyebrow">회원가입</p><h1>귀족 회원가입</h1><p className="auth-subtitle">피어싱 도매 카탈로그를 둘러보고, 도매 회원 승인을 신청해보세요.</p><p>회원가입 후 상품 카탈로그를 확인할 수 있으며, 도매 회원 승인 완료 시 회원가, MOQ, Inquiry List, Request Quote 기능을 사용할 수 있습니다.</p><p className="auth-support">Create your Noblesse Piercing account and request wholesale buyer access. Approved members can view buyer-only prices, MOQ, Inquiry List, and Request Quote features.</p><div className="approval-note"><strong>가입 전 안내</strong><ol><li>회원가입 직후에는 승인 대기 상태로 시작됩니다.</li><li>회원가는 도매 회원 승인 후 확인할 수 있습니다.</li><li>견적 요청은 최종 주문이 아닙니다.</li><li>최종 가격, 재고, 납기, 배송 조건은 Noblesse 확인 후 안내됩니다.</li></ol><small>Request Quote is not a final order. Final price, stock, lead time, and shipping conditions are confirmed by Noblesse.</small></div><form className="auth-form register-grid" onSubmit={submitRequest}>{fields.map((group) => <fieldset className="form-section" key={group.title}><legend>{group.title}</legend>{group.items.map(([label, name, type]) => <label key={name}>{label}<input autoComplete="off" name={name} placeholder={label} type={type} /></label>)}</fieldset>)}<fieldset className="form-section full-span"><legend>요청 메모</legend><label>요청 메모<textarea name="requestMemo" placeholder="운영 중인 매장, 판매 국가, 관심 피어싱 라인을 간단히 적어주세요." /></label></fieldset><fieldset className="form-section full-span agreement-section"><legend>약관 동의</legend>{agreementDocuments.map((agreement) => <label className="agreement-check" key={agreement.key}><input required={agreement.required} type="checkbox" /><span>{agreement.titleKo}<small>{agreement.required ? '필수' : '선택'} · {agreement.titleEn}</small></span></label>)}</fieldset><button className="primary-action full-span" type="submit">회원가입 신청</button></form></section></main>
}
