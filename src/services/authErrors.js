import { resolveLocaleCopy } from '../utils/locale.js'

const loginErrorMessages = {
  kr: {
    config: 'Firebase 로그인 설정이 필요합니다.',
    invalidCredentials: '아이디 또는 비밀번호를 확인해 주세요.',
    accountUnavailable: '로그인은 확인됐지만 사이트 계정 정보가 없습니다. 관리자에게 문의해 주세요.',
    fallback: '로그인에 실패했습니다. 계정을 확인해주세요.',
  },
  en: {
    config: 'Firebase client configuration is required for login.',
    invalidCredentials: 'Please check your ID or password.',
    accountUnavailable: 'Login succeeded, but no site account profile was found. Contact an administrator.',
    fallback: 'Login failed. Please check your account.',
  },
  jp: {
    config: 'Firebase のログイン設定が必要です。',
    invalidCredentials: 'ID またはパスワードを確認してください。',
    accountUnavailable: 'ログインは確認できましたが、サイトのアカウント情報がありません。管理者にお問い合わせください。',
    fallback: 'ログインに失敗しました。アカウントを確認してください。',
  },
  cn: {
    config: '需要配置 Firebase 登录信息。',
    invalidCredentials: '请检查 ID 或密码。',
    accountUnavailable: '登录已成功，但找不到网站账户资料。请联系管理员。',
    fallback: '登录失败。请检查账号。',
  },
}

const invalidCredentialCodes = new Set([
  'auth/invalid-credential',
  'auth/invalid-email',
  'VALIDATION_ERROR',
  'auth/user-not-found',
  'auth/wrong-password',
])

const registrationErrorMessages = {
  kr: {
    config: '회원 가입을 위한 Firebase 설정이 필요합니다.',
    emailInUse: '이미 가입된 이메일입니다. 기존 계정으로 로그인해주세요.',
    sessionConflict: '다른 계정으로 로그인되어 있습니다. 먼저 로그아웃한 뒤 새 계정으로 가입해주세요.',
    invalidEmail: '이메일 주소를 다시 확인해주세요.',
    weakPassword: '비밀번호는 8자 이상이며 숫자와 특수문자를 포함해야 합니다.',
    network: '네트워크 연결을 확인한 뒤 다시 시도해주세요.',
    fallback: '회원 가입을 완료하지 못했습니다. 입력 정보를 확인한 뒤 다시 시도해주세요.',
  },
  en: {
    config: 'Firebase configuration is required for registration.',
    emailInUse: 'This email is already registered. Please sign in with the existing account.',
    sessionConflict: 'Another account is currently signed in. Sign out before creating a new account.',
    invalidEmail: 'Please check the email address.',
    weakPassword: 'Use at least 8 characters including a number and a symbol.',
    network: 'Check your network connection and try again.',
    fallback: 'Registration could not be completed. Check the information and try again.',
  },
  jp: {
    config: '会員登録には Firebase の設定が必要です。',
    emailInUse: 'このメールアドレスはすでに登録されています。既存のアカウントでログインしてください。',
    sessionConflict: '別のアカウントでログイン中です。ログアウトしてから新しいアカウントを登録してください。',
    invalidEmail: 'メールアドレスを確認してください。',
    weakPassword: '8文字以上で、数字と記号を含むパスワードを入力してください。',
    network: 'ネットワーク接続を確認して、もう一度お試しください。',
    fallback: '会員登録を完了できませんでした。入力内容を確認して、もう一度お試しください。',
  },
  cn: {
    config: '註冊會員需要 Firebase 設定。',
    emailInUse: '此電子郵件已註冊。請使用現有帳戶登入。',
    sessionConflict: '目前已登入其他帳戶。請先登出，再建立新帳戶。',
    invalidEmail: '請確認電子郵件地址。',
    weakPassword: '密碼須至少 8 個字元，並包含數字與特殊符號。',
    network: '請確認網路連線後再試一次。',
    fallback: '無法完成會員註冊。請確認輸入資料後再試一次。',
  },
}

const existingRegistrationCodes = new Set([
  'auth/email-already-in-use',
  'CONFLICT',
])

export function getLoginErrorMessage(error, locale = 'kr') {
  const copy = resolveLocaleCopy(loginErrorMessages, locale)
  const code = String(error?.code || '')

  if (code === 'CONFIGURATION_ERROR') return copy.config
  if (code === 'UNAUTHORIZED') return copy.accountUnavailable
  if (invalidCredentialCodes.has(code)) return copy.invalidCredentials

  return copy.fallback
}

export function isExistingRegistrationError(error) {
  return existingRegistrationCodes.has(String(error?.code || ''))
}

export function getRegistrationErrorMessage(error, locale = 'kr') {
  const copy = resolveLocaleCopy(registrationErrorMessages, locale)
  const code = String(error?.code || '')

  if (code === 'CONFIGURATION_ERROR') return copy.config
  if (isExistingRegistrationError(error)) return copy.emailInUse
  if (code === 'REGISTRATION_SESSION_CONFLICT') return copy.sessionConflict
  if (code === 'auth/invalid-email' || code === 'VALIDATION_ERROR') return copy.invalidEmail
  if (code === 'auth/weak-password') return copy.weakPassword
  if (code === 'NETWORK_ERROR' || code === 'auth/network-request-failed') return copy.network

  return copy.fallback
}
