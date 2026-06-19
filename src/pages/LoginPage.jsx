import { useState } from 'react'
import { ArrowRight, LogIn } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

const brandKoreanName = '귀족'
const brandLanguageLabel = '귀족 / Noblesse'

export function LoginPage() {
  const navigate = useNavigate()
  const { dataMode, setViewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const isMockMode = dataMode === 'mock'
  const [loginNotice, setLoginNotice] = useState('')

  const loginAsApprovedBuyer = (event) => {
    event.preventDefault()
    if (!isMockMode) {
      setLoginNotice('Release mode requires server-side authentication. Preview login is disabled.')
      return
    }
    setViewerState('approved')
    navigate(toLocalePath('/account'))
  }

  const browseAsGuest = () => {
    if (isMockMode) setViewerState('guest')
    navigate(toLocalePath('/products'))
  }

  return <main className="content auth-page">
    <section className="account-panel auth-panel">
      <LogIn size={25} />
      <p className="eyebrow">거래처 로그인</p>
      <h1>Noblesse 거래처 전용 접근</h1>
      <div className="brand-mini">
        <strong>{brandKoreanName}</strong>
        <span>{brandLanguageLabel}</span>
      </div>
      <p>확인된 거래처는 거래 조건, 문의 리스트, 견적 문의 기능을 사용할 수 있습니다. 견적 문의는 최종 주문이 아닙니다.</p>
      <form className="auth-form" onSubmit={loginAsApprovedBuyer}>
        <label>이메일<input autoComplete="email" name="email" placeholder="이메일" type="email" /></label>
        <label>비밀번호<input autoComplete="current-password" name="password" placeholder="비밀번호" type="password" /></label>
        {loginNotice && <p className="auth-notice" role="status">{loginNotice}</p>}
        <button className="primary-action" type="submit">로그인</button>
      </form>
      <div className="auth-links">
        <button className="text-action" type="button" onClick={browseAsGuest}>비회원으로 둘러보기</button>
        <Link to={toLocalePath('/register')}>거래처 문의 <ArrowRight size={15} /></Link>
      </div>
    </section>
  </main>
}
