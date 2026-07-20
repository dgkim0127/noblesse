import assert from 'node:assert/strict'
import test from 'node:test'
import { getLoginErrorMessage } from '../src/services/authErrors.js'

test('Firebase credential errors keep the credential guidance', () => {
  assert.equal(
    getLoginErrorMessage({ code: 'auth/invalid-credential' }, 'kr'),
    '아이디 또는 비밀번호를 확인해 주세요.'
  )
})

test('backend profile rejection is not reported as a wrong password', () => {
  const message = getLoginErrorMessage({ code: 'UNAUTHORIZED' }, 'kr')

  assert.match(message, /사이트 계정 정보/)
  assert.doesNotMatch(message, /비밀번호/)
})

test('backend profile rejection guidance is localized', () => {
  assert.match(getLoginErrorMessage({ code: 'UNAUTHORIZED' }, 'en'), /site account profile/i)
  assert.match(getLoginErrorMessage({ code: 'UNAUTHORIZED' }, 'jp'), /アカウント情報/)
  assert.match(getLoginErrorMessage({ code: 'UNAUTHORIZED' }, 'zh-TW'), /帳戶資料/)
})
