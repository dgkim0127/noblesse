import { ArrowRight, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { getHybridGatewayErrorMessage, signInBuyer } from '../services'
import { useLocalePath } from '../utils/locale'

const brandKoreanName = '귀족'
const brandLanguageLabel = '피어싱 / Piercing / ピアス / 冲孔'

export function LoginPage() {
  const navigate = useNavigate()
  const { isHybridMode, refreshCommerce, setViewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loginBuyer = async (event) => {
    event.preventDefault()
    if (!isHybridMode) {
      setViewerState('approved')
      navigate(toLocalePath('/account'))
      return
    }

    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')
    try {
      await signInBuyer(String(form.get('email') || ''), String(form.get('password') || ''))
      await refreshCommerce()
      navigate(toLocalePath('/account'))
    } catch (nextError) {
      setError(getHybridGatewayErrorMessage(nextError))
    } finally {
      setSubmitting(false)
    }
  }

  const browseAsGuest = () => {
    setViewerState('guest')
    navigate(toLocalePath('/products'))
  }

  return <main className="content auth-page">
    <section className="account-panel auth-panel">
      <LogIn size={25} />
      <p className="eyebrow">BUYER LOGIN</p>
      <h1>Noblesse Buyer Access</h1>
      <div className="brand-mini">
        <strong>{brandKoreanName}</strong>
        <span>{brandLanguageLabel}</span>
      </div>
      <p>승인된 바이어는 회원가, Inquiry List, Request Quote 기능을 이용할 수 있습니다.</p>
      <form className="auth-form" onSubmit={loginBuyer}>
        <label>이메일<input autoComplete="email" name="email" placeholder="member@example.com" required type="email" /></label>
        <label>비밀번호<input autoComplete="current-password" name="password" placeholder="비밀번호" required type="password" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-action" disabled={submitting} type="submit">{submitting ? '로그인 중…' : '로그인'}</button>
      </form>
      <div className="auth-links">
        {!isHybridMode && <button className="text-action" type="button" onClick={browseAsGuest}>비회원으로 둘러보기</button>}
        <Link to={toLocalePath('/register')}>회원 신청 <ArrowRight size={15} /></Link>
      </div>
    </section>
  </main>
}
