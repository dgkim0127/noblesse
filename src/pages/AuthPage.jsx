import { BadgeCheck, FileUp, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithEmail, registerMemberApplication } from '../services/authService'

export function AuthPage({ mode }) {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', companyName: '', contactName: '', phone: '', businessNumber: '', country: 'Japan' })
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    try {
      if (mode === 'login') await loginWithEmail(form)
      else await registerMemberApplication({ email: form.email, password: form.password, application: { companyName: form.companyName, contactName: form.contactName, phone: form.phone, businessNumber: form.businessNumber, country: form.country }, documentFile })
      navigate(mode === 'login' ? '/' : '/account')
    } catch (error) { setMessage(error.message) }
  }
  const isRegister = mode === 'register'
  return <main className="auth-page"><section className="auth-intro"><Link to="/" className="brand-lockup"><div className="brand-mark">貴</div><div><strong>귀족</strong><span>KIZOKU Jewelry</span></div></Link><h1>{isRegister ? '거래처 회원 신청' : '회원 로그인'}</h1><p>승인 거래처 회원에게 회원가, MOQ, 주문 요청 기능을 제공합니다.</p><div><BadgeCheck size={18} />관리자 확인 후 승인</div></section><form className="auth-form" onSubmit={submit}><h2>{isRegister ? '사업자 정보를 입력해주세요.' : '이메일로 로그인하세요.'}</h2><input required name="email" type="email" placeholder="이메일" value={form.email} onChange={update} /><input required name="password" type="password" placeholder="비밀번호" value={form.password} onChange={update} />{isRegister && <><input required name="companyName" placeholder="상호" value={form.companyName} onChange={update} /><input required name="contactName" placeholder="담당자 이름" value={form.contactName} onChange={update} /><input required name="phone" placeholder="연락처" value={form.phone} onChange={update} /><input required name="businessNumber" placeholder="사업자 번호" value={form.businessNumber} onChange={update} /><select name="country" value={form.country} onChange={update}><option>Japan</option><option>Korea</option><option>Other</option></select><label className="file-input"><FileUp size={17} />사업자 증빙 첨부<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} /></label></>} {message && <small>{message}</small>}<button type="submit"><LogIn size={17} />{isRegister ? '회원 신청 제출' : '로그인'}</button><Link to={isRegister ? '/login' : '/register'}>{isRegister ? '이미 계정이 있습니다.' : '거래처 회원 신청하기'}</Link></form></main>
}
