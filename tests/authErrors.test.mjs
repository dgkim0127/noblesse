import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getLoginErrorMessage,
  getRegistrationErrorMessage,
  isExistingRegistrationError,
} from '../src/services/authErrors.js'

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

test('registration duplicate email error is localized instead of exposing Firebase text', () => {
  const error = { code: 'auth/email-already-in-use', message: 'Firebase: Error (auth/email-already-in-use).' }

  assert.equal(isExistingRegistrationError(error), true)
  assert.match(getRegistrationErrorMessage(error, 'kr'), /이미 가입된 이메일/)
  assert.doesNotMatch(getRegistrationErrorMessage(error, 'kr'), /Firebase|email-already-in-use/)
})

test('registration session conflict asks the buyer to sign out first', () => {
  assert.match(
    getRegistrationErrorMessage({ code: 'REGISTRATION_SESSION_CONFLICT' }, 'kr'),
    /로그아웃/
  )
})

test('registration duplicate guidance is localized', () => {
  const error = { code: 'CONFLICT' }

  assert.match(getRegistrationErrorMessage(error, 'en'), /already registered/i)
  assert.match(getRegistrationErrorMessage(error, 'jp'), /すでに登録/)
  assert.match(getRegistrationErrorMessage(error, 'zh-TW'), /已註冊/)
})
