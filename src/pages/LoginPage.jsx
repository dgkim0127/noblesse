import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { getLoginErrorMessage } from '../services/authErrors'
import { useLocalePath } from '../utils/locale'

const loginPageCopy = {
  kr: {
    eyebrow: '거래처 로그인',
    summary: '승인된 거래처는 거래 조건, 견적 리스트, 견적 요청 기능을 사용할 수 있습니다. 견적 요청은 최종 주문이 아닙니다.',
    identifier: '아이디',
    identifierPlaceholder: '아이디',
    password: '비밀번호',
    passwordPlaceholder: '비밀번호',
    autoLogin: '자동 로그인',
    submit: '로그인',
    guest: '비회원으로 둘러보기',
    register: '회원 가입',
    showPassword: '비밀번호 보기',
    hidePassword: '비밀번호 숨기기',
  },
  en: {
    eyebrow: 'Buyer login',
    summary: 'Approved buyers can view trade terms, inquiry lists, and request quotes. Quote requests are not final orders.',
    identifier: 'ID',
    identifierPlaceholder: 'ID',
    password: 'Password',
    passwordPlaceholder: 'Password',
    autoLogin: 'Auto login',
    submit: 'Login',
    guest: 'Browse as guest',
    register: 'Sign up',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  jp: {
    eyebrow: '取引先ログイン',
    summary: '承認済みの取引先は、取引条件、見積もりリスト、見積もり依頼機能を利用できます。見積もり依頼は最終注文ではありません。',
    identifier: 'ID',
    identifierPlaceholder: 'ID',
    password: 'パスワード',
    passwordPlaceholder: 'パスワード',
    autoLogin: '自動ログイン',
    submit: 'ログイン',
    guest: 'ゲストとして見る',
    register: '会員登録',
    showPassword: 'パスワードを表示',
    hidePassword: 'パスワードを非表示',
  },
  cn: {
    eyebrow: '客户登录',
    summary: '已批准的客户可以查看交易条件、询价列表并提交报价请求。报价请求不是最终订单。',
    identifier: 'ID',
    identifierPlaceholder: 'ID',
    password: '密码',
    passwordPlaceholder: '密码',
    autoLogin: '自动登录',
    submit: '登录',
    guest: '以访客身份浏览',
    register: '注册',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
  },
}

const brandKoreanName = '귀족'
const brandLanguageLabel = '귀족 / Noblesse'

export function LoginPage() {
  const navigate = useNavigate()
  const { dataMode, setViewerState, signIn } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const copy = loginPageCopy[locale] ?? loginPageCopy.kr
  const isMockMode = dataMode === 'mock'
  const [loginNotice, setLoginNotice] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const loginAsApprovedBuyer = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    try {
      await signIn({
        identifier: formData.get('identifier'),
        password: formData.get('password'),
        remember,
      })
      navigate(toLocalePath('/'))
    } catch (error) {
      setLoginNotice(getLoginErrorMessage(error, locale))
    }
  }

  const browseAsGuest = () => {
    if (isMockMode) setViewerState('guest')
    navigate(toLocalePath('/products'))
  }

  return <main className="content auth-page">
    <section className="account-panel auth-panel">
      <LogIn size={25} />
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>LOGIN</h1>
      <div className="brand-mini">
        <strong>{brandKoreanName}</strong>
        <span>{brandLanguageLabel}</span>
      </div>
      <p>{copy.summary}</p>
      <form className="auth-form" onSubmit={loginAsApprovedBuyer}>
        <div className="login-id-group">
          <label>{copy.identifier}
            <input autoComplete="username" name="identifier" placeholder={copy.identifierPlaceholder} type="text" />
          </label>
          <label className="auto-login-check">
            <input checked={remember} name="autoLogin" onChange={(event) => setRemember(event.target.checked)} type="checkbox" />
            <span>{copy.autoLogin}</span>
          </label>
        </div>
        <label>{copy.password}
          <span className="login-password-control">
            <input
              autoComplete="current-password"
              name="password"
              placeholder={copy.passwordPlaceholder}
              type={showPassword ? 'text' : 'password'}
            />
            <button
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              className="login-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        {loginNotice && <p className="auth-notice" role="status">{loginNotice}</p>}
        <button className="primary-action" type="submit">{copy.submit}</button>
      </form>
      <div className="auth-links">
        <button className="text-action" type="button" onClick={browseAsGuest}>{copy.guest}</button>
        <Link to={toLocalePath('/register')}>{copy.register} <ArrowRight size={15} /></Link>
      </div>
    </section>
  </main>
}
