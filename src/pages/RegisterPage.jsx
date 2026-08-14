import { FileText } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import {
  areRequiredAgreementsAccepted,
  buildAgreementSnapshot,
  getHybridGatewayErrorMessage,
  getAgreementDocument,
  getAgreementSummaryForRegister,
  getInitialAgreements,
  registerBuyerAccount,
  registerHybridBuyer,
} from '../services'
import { useLocalePath } from '../utils/locale'

const registerCopy = {
  kr: {
    eyebrow: '회원 신청',
    title: '노블레스 회원 신청',
    intro: '기본 정보를 남겨주시면 Noblesse가 확인해드립니다.',
    helper: '확인 후 회원가, 최소 수량, 문의 리스트, 견적 문의 기능을 사용할 수 있습니다.',
    noticeTitle: '신청 전 확인해주세요',
    noticeItems: [
      '회원 정보는 담당자가 직접 확인합니다.',
      '회원가는 확인 후 볼 수 있습니다.',
      '견적 문의는 최종 확정이 아닙니다.',
      '최종 견적은 Noblesse 확인 후 안내합니다.',
    ],
    groups: { buyer: '회원 정보', contact: '연락처 정보', business: '비즈니스 정보', memo: '요청 메모' },
    fields: {
      email: '이메일',
      password: '비밀번호',
      companyName: '회사명',
      contactName: '담당자명',
      country: '국가',
      preferredLanguage: '선호 언어',
      phone: '전화번호',
      messengerType: '메신저 종류',
      messengerId: '메신저 ID',
      salesChannel: '판매 채널',
      businessNumber: '사업자 번호',
      requestMemo: '요청 메모',
    },
    memoPlaceholder: '운영 중인 스토어, 주요 시장, 관심 있는 피어싱 라인을 알려주세요.',
    approvalTitle: '확인 안내',
    approvalBody: '회원 정보는 담당자가 직접 확인합니다. 확인 전까지 가격과 견적 문의 기능은 잠겨 있습니다.',
    agreementsEyebrow: '약관',
    agreementsTitle: '약관 및 개인정보 동의',
    agreementsIntro: '회원 신청에는 필수 약관 3개 동의가 필요합니다. 마케팅 안내 수신은 선택입니다.',
    allAgree: '전체 동의',
    allAgreeSub: '필수 및 선택 항목에 모두 동의',
    required: '[필수]',
    optional: '[선택]',
    viewDetails: '자세히 보기',
    privacyPolicy: '개인정보 처리방침 보기',
    warning: '회원 신청을 위해 필수 약관을 모두 동의해주세요.',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '회원 신청하기',
    back: '로그인으로 돌아가기',
  },
  en: {
    eyebrow: 'BUYER ACCESS REQUEST',
    title: 'Noblesse Partner Access Request',
    intro: 'Submit your company details so Noblesse can review your profile.',
    helper: 'Reviewed members can access member prices, MOQ, Inquiry List, and Request Quote.',
    noticeTitle: 'Before you request access',
    noticeItems: [
      'Member approval is reviewed manually.',
      'Member prices are available after approval.',
      'Quote inquiry is not a final confirmation.',
      'Final quote is confirmed by Noblesse.',
    ],
    groups: { buyer: 'Member Information', contact: 'Contact Information', business: 'Business Information', memo: 'Request Memo' },
    fields: {
      email: 'Email',
      password: 'Password',
      companyName: 'Company Name',
      contactName: 'Contact Name',
      country: 'Country',
      preferredLanguage: 'Preferred Language',
      phone: 'Phone',
      messengerType: 'Messenger Type',
      messengerId: 'Messenger ID',
      salesChannel: 'Sales Channel',
      businessNumber: 'Business Number',
      requestMemo: 'Request Memo',
    },
    memoPlaceholder: 'Tell us about your store, market, or preferred piercing line.',
    approvalTitle: 'Approval Notice',
    approvalBody: 'Member information is reviewed manually. Prices and quote inquiry features remain locked until review is complete.',
    agreementsEyebrow: 'AGREEMENTS',
    agreementsTitle: 'Terms and privacy consent',
    agreementsIntro: 'Partner access request requires acceptance of three required agreement items. Marketing updates are optional.',
    allAgree: 'Agree to all',
    allAgreeSub: 'Agree to all required and optional items',
    required: '[Required]',
    optional: '[Optional]',
    viewDetails: 'View details',
    privacyPolicy: 'View Privacy Policy',
    warning: 'Please agree to all required terms to request access.',
    warningSub: 'All required items must be checked before submitting.',
    submit: 'Request Access',
    back: 'Back to Login',
  },
  jp: {
    eyebrow: '取引先承認申請',
    title: 'Noblesse 会員承認申請',
    intro: '取引先情報をご提出いただくと、Noblesseが会員プロフィールを確認します。',
    helper: '承認後、会員価格、最小数量、Inquiry List、Request Quoteをご利用いただけます。',
    noticeTitle: '申請前にご確認ください',
    noticeItems: [
      '取引先承認は手動で確認します。',
      '会員価格は承認後に確認できます。',
      'Request Quoteは最終注文ではありません。',
      '最終見積はNoblesse確認後にご案内します。',
    ],
    groups: { buyer: '会員情報', contact: '連絡先情報', business: '事業者情報', memo: 'リクエストメモ' },
    fields: {
      email: 'メールアドレス',
      password: 'パスワード',
      companyName: '会社名',
      contactName: '担当者名',
      country: '国',
      preferredLanguage: '希望言語',
      phone: '電話番号',
      messengerType: 'メッセンジャー種別',
      messengerId: 'メッセンジャーID',
      salesChannel: '販売チャネル',
      businessNumber: '事業者番号',
      requestMemo: 'リクエストメモ',
    },
    memoPlaceholder: '運営中のストア、主な市場、関心のあるピアスラインを入力してください。',
    approvalTitle: '承認案内',
    approvalBody: '会員承認は手動で確認されます。承認前は価格とRequest Quote機能は利用できません。',
    agreementsEyebrow: '規約',
    agreementsTitle: '規約および個人情報同意',
    agreementsIntro: '取引先承認申請には3つの必須同意が必要です。マーケティング案内の受信は任意です。',
    allAgree: 'すべて同意',
    allAgreeSub: '必須および任意項目にすべて同意',
    required: '[必須]',
    optional: '[任意]',
    viewDetails: '詳細を見る',
    privacyPolicy: '個人情報処理方針を見る',
    warning: '取引先承認申請のため、必須規約にすべて同意してください。',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '会員申請',
    back: 'ログインへ戻る',
  },
  cn: {
    eyebrow: '会员权限申请',
    title: 'Noblesse 会员权限申请',
    intro: '提交公司资料后，Noblesse 将审核您的会员资料。',
    helper: '审核通过后，可使用会员价格、最小数量、Inquiry List 和 Request Quote。',
    noticeTitle: '申请前请确认',
    noticeItems: [
      '会员审批将由人工审核。',
      '会员价格会在审批后开放。',
      'Request Quote 不是最终订单。',
      '最终报价由 Noblesse 确认后提供。',
    ],
    groups: { buyer: '会员信息', contact: '联系方式', business: '业务信息', memo: '申请备注' },
    fields: {
      email: '邮箱',
      password: '密码',
      companyName: '公司名称',
      contactName: '联系人',
      country: '国家',
      preferredLanguage: '首选语言',
      phone: '电话',
      messengerType: '通讯工具类型',
      messengerId: '通讯工具 ID',
      salesChannel: '销售渠道',
      businessNumber: '营业登记号',
      requestMemo: '申请备注',
    },
    memoPlaceholder: '请填写您的店铺、主要市场或感兴趣的穿孔产品线。',
    approvalTitle: '审核说明',
    approvalBody: '会员资质将由人工审核。审核通过前，价格和 Request Quote 功能将保持锁定。',
    agreementsEyebrow: '条款',
    agreementsTitle: '条款及个人信息同意',
    agreementsIntro: '申请会员权限需要同意3项必选条款。营销及新品通知为可选项。',
    allAgree: '全部同意',
    allAgreeSub: '同意所有必选及可选项目',
    required: '[必选]',
    optional: '[可选]',
    viewDetails: '查看详情',
    privacyPolicy: '查看隐私政策',
    warning: '请同意所有必选条款后再申请会员权限。',
    warningSub: 'Please agree to all required terms to request access.',
    submit: '提交会员申请',
    back: '返回登录',
  },
}

const fieldGroups = {
  buyer: [
    ['email', 'email'],
    ['password', 'password'],
    ['companyName', 'text'],
    ['contactName', 'text'],
    ['country', 'text'],
    ['preferredLanguage', 'text'],
  ],
  contact: [
    ['phone', 'tel'],
    ['messengerType', 'text'],
    ['messengerId', 'text'],
  ],
  business: [
    ['salesChannel', 'text'],
    ['businessNumber', 'text'],
  ],
}

function FieldGroup({ title, children }) {
  return <fieldset className="form-section">
    <legend>{title}</legend>
    <div className="register-grid">{children}</div>
  </fieldset>
}

const localizedAgreementContent = {
  jp: {
    terms_of_service: {
      title: '貴族 利用規約',
      headings: [
        '第1条 目的',
        '第2条 用語の定義',
        '第3条 主要用語',
        '第4条 規約の掲示および改定',
        '第5条 会社情報および告知',
        '第6条 サービスの提供',
        '第7条 サービスの変更および中断',
        '第8条 会員登録および取引先確認申請',
        '第9条 会員審査およびアクセス権限',
        '第10条 退会および利用資格の制限',
        '第11条 商品情報および画像',
        '第12条 価格情報の制限',
        '第13条 管理者見積および最終見積',
        '第14条 取引確認および案内',
        '第15条 利用者の義務',
        '第16条 禁止行為',
        '第17条 知的財産権',
        '第18条 個人情報',
        '第19条 免責事項',
        '第20条 通知',
        '第21条 紛争および準拠法',
        '第22条 準拠法',
        '第23条 施行日',
        '第24条 改定案内',
      ],
      bodies: [
        '本規約は、貴族が提供する国内・海外B2Bピアスカタログ、会員登録、取引先確認、商品情報閲覧、問い合わせリスト、見積依頼および関連案内サービスの利用条件を定めます。',
        '「サイト」は貴族が運営するウェブサイトを意味します。「利用者」は訪問者または会員を意味し、「バイヤー」は取引先確認を申請または承認された事業者・担当者を意味します。',
        '商品はカタログに掲載されるピアス関連商品を意味します。問い合わせリストと見積依頼は取引検討のための手続きであり、最終注文または決済ではありません。',
        '貴族は本規約をサイトまたは会員登録画面に掲示できます。運営方針、法令、サービス構成の変更により規約を改定する場合があります。',
        '貴族はサイト、メール、メッセンジャー、告知領域を通じてサービス運営情報を案内できます。事業者情報、連絡先、個人情報保護責任者情報は運営前に最終確認します。',
        '貴族は商品画像、基本商品情報、カテゴリー、コレクション、取引先確認、承認状態案内、承認後価格表示、問い合わせリスト、見積依頼、マイ問い合わせ確認機能を提供できます。',
        '商品供給条件、画像更新、カタログ構成、価格表示方式、見積手続き、市場別方針、システム点検または運営上の必要により、サービスの一部を変更または一時中断できます。',
        '会員はID、会社名、担当者名、国、希望言語、連絡先、メッセンジャー、販売チャネル、事業情報、要望メモを提出して取引先確認を申請できます。',
        '貴族は提出情報を確認した後、承認、保留、ブロック、または追加確認を求めることができます。承認済みバイヤーのみ価格情報、問い合わせリスト、見積依頼機能を利用できます。',
        '会員はサービス利用中止またはアカウント削除を求めることができます。虚偽情報、無断価格共有、不正アクセス、システム悪用、方針違反が確認された場合、アクセス権限を制限できます。',
        '商品画像と説明は取引検討のためのカタログ情報です。画面色、素材感、サイズ印象は端末環境や撮影条件により実物と異なる場合があります。',
        '価格情報は承認済みバイヤーにのみ表示できます。ゲストおよび審査中の利用者は承認後価格、市場別価格、詳細MOQ、見積依頼機能にアクセスできません。',
        '管理者見積は在庫、単価、リードタイム、配送条件などを確認した後に案内する見積基準です。これは担当者確認後に確定されます。',
        '取引条件、数量、納期、配送、輸出可否は担当者確認後に案内されます。見積依頼は最終注文、決済、または自動注文確定ではありません。',
        '利用者は正確な情報を提出し、アカウントを安全に管理し、承認後価格や取引条件を無断で共有してはなりません。',
        '虚偽情報の提出、不正アクセス、サービスの妨害、無断価格共有、権限外利用、他者情報の使用、法令または運営方針に反する行為は禁止されます。',
        'サイトのデザイン、ロゴ、商品説明、画像、文章、画面構成などの権利は貴族または正当な権利者に帰属します。無断複製や商業利用は禁止されます。',
        '個人情報の収集、利用、保管、破棄、委託、第三者提供、権利行使については別途個人情報処理方針に従います。',
        '貴族は合理的な範囲で正確な情報提供に努めますが、商品供給状況、画像差異、外部通信障害、利用者の誤入力などにより発生する損害について責任が制限される場合があります。',
        '重要な案内はサイト、メール、メッセンジャー、告知領域など合理的な方法で通知できます。',
        'サービス利用に関する紛争は当事者間の協議により解決することを原則とし、必要な場合は関連法令および管轄基準に従います。',
        '本規約およびサービス利用に関する解釈は、適用可能な韓国法および関連規定を基準とします。',
        '本規約はサイトに掲示された日または会員登録手続きで同意した日から効力を有します。',
        '規約の重要な変更がある場合、貴族はサイトまたは別途連絡手段を通じて事前または事後に案内できます。',
      ],
    },
    buyer_terms: {
      title: 'B2Bバイヤー規約',
      headings: [
        '第1条 B2B会員規約の目的',
        '第2条 会員審査基準',
        '第3条 提出情報の正確性',
        '第4条 国および市場別価格',
        '第5条 会員価格の条件',
        '第6条 MOQおよび数量条件',
        '第7条 価格変更',
        '第8条 見積依頼の性質',
        '第9条 価格スナップショット',
        '第10条 管理者見積',
        '第11条 最終見積および非確定状態',
        '第12条 在庫・リードタイム・配送',
        '第13条 輸出および国別制限',
        '第14条 見積調整',
        '第15条 アクセス制限および承認取消',
        '第16条 データ誤りおよびバイヤー責任',
        '第17条 不正利用およびアカウント制限',
        '第18条 紛争および問い合わせ',
      ],
      bodies: [
        '本規約は、B2Bバイヤーの登録、審査、承認後価格確認、問い合わせリスト、見積依頼、担当者確認に関する基準を定めます。',
        '貴族は会社情報、担当者情報、販売チャネル、国、言語、市場、取引目的などを基準に取引先確認を行います。',
        'バイヤーは提出する情報を正確かつ最新に維持する責任があります。不正確な情報により審査保留またはアクセス制限が発生する場合があります。',
        '価格、通貨、MOQ、取引条件は国、地域、市場、輸出可否により異なる場合があります。',
        '承認後価格は承認済みバイヤーにのみ案内されます。公開画面の価格または参考情報は最終見積ではありません。',
        'MOQは商品、サイズ、カラー、市場、在庫状況により異なります。実際の可能数量は担当者確認後に案内されます。',
        '価格は為替、材料費、在庫、輸送条件、供給状況により変更される場合があります。',
        '見積依頼は取引検討のための問い合わせであり、最終注文、決済、または自動発注ではありません。',
        '価格スナップショットは見積依頼時点の参考価格であり、最終見積または保証価格ではありません。',
        '管理者見積は担当者が在庫、単価、数量、納期、配送条件を確認した後に案内する見積情報です。',
        '最終見積は管理者確認後に成立します。画面上の推定合計、単価、数量情報は確認前の参考情報です。',
        '在庫、制作可能数量、リードタイム、配送方法、輸出可否は商品および地域ごとに変わる場合があります。',
        '一部商品は輸出、地域、素材、規制、配送条件により販売または案内が制限される場合があります。',
        '見積内容は数量、カラー、サイズ、配送条件、在庫、為替、素材費により調整される場合があります。',
        '虚偽情報、不正アクセス、価格無断共有、アカウント共有、方針違反が確認された場合、承認を取り消すかアクセスを制限できます。',
        'バイヤーは提出情報、選択数量、商品オプション、連絡先情報の正確性を確認する責任があります。',
        'サービスの不正利用、他者アカウント利用、権限外アクセス、システム悪用はアカウント制限の対象です。',
        '取引条件または見積に関する問い合わせは貴族の指定連絡先を通じて行い、紛争は協議および関連法令に従って処理します。',
      ],
    },
    privacy_collection_use: {
      title: '個人情報の収集・利用同意',
      headings: ['第1条 収集項目', '第2条 収集および利用目的', '第3条 保管および利用期間', '第4条 同意拒否の権利', '第5条 同意拒否時の不利益'],
      bodies: [
        '貴族は会員登録、取引先確認、問い合わせ対応のため、ID、会社名、担当者名、国、言語、連絡先、メッセンジャー、事業情報、要望内容を収集できます。',
        '収集した情報は会員確認、B2B取引可否の審査、問い合わせおよび見積対応、サービス運営案内のために利用されます。',
        '個人情報は利用目的の達成、退会、または関連法令で定める期間まで保管され、その後安全に破棄されます。',
        '利用者は個人情報の収集・利用に同意しない権利があります。ただし必須項目への同意を拒否すると会員登録や取引先確認が制限される場合があります。',
        '必須同意を拒否する場合、承認後価格確認、問い合わせリスト、見積依頼などB2B取引関連機能を利用できません。',
      ],
    },
    marketing_updates: {
      title: 'マーケティング情報受信同意',
      headings: ['第1条 受信チャネル', '第2条 任意同意および撤回', '第3条 受信情報', '第4条 送信方法および問い合わせ'],
      bodies: [
        '貴族は同意した利用者に対し、メール、メッセンジャー、サイト内案内などを通じて新商品、カタログ、取引案内を送信できます。',
        'マーケティング情報の受信同意は任意であり、利用者はいつでも同意を撤回できます。',
        '受信情報には新商品、コレクション、カタログ更新、B2B取引案内、イベント性のない運営案内が含まれる場合があります。',
        '送信方法と問い合わせ先はサービス画面または指定連絡先で案内され、撤回後は法令上必要な案内を除きマーケティング送信を停止します。',
      ],
    },
    privacy_policy: {
      title: '個人情報処理方針',
      headings: [
        '第1条 処理目的',
        '第2条 個人情報項目',
        '第3条 収集方法',
        '第4条 保管および利用期間',
        '第5条 破棄手続きおよび方法',
        '第6条 第三者提供',
        '第7条 処理委託',
        '第8条 国外移転',
        '第9条 利用者の権利',
        '第10条 権利行使方法',
        '第11条 Cookieおよびアクセス情報',
        '第12条 安全管理措置',
        '第13条 14歳未満の児童',
        '第14条 個人情報保護責任者',
        '第15条 救済手続き',
        '第16条 方針変更',
        '第17条 施行日および確認事項',
      ],
      bodies: [
        '貴族は会員登録、取引先確認、商品問い合わせ、見積対応、サービス運営、法令上の義務履行のため個人情報を処理します。',
        '処理項目にはID、会社名、担当者名、連絡先、国、希望言語、メッセンジャー情報、事業情報、問い合わせ内容、アクセス情報が含まれます。',
        '個人情報は会員登録フォーム、問い合わせフォーム、見積依頼、メール、メッセンジャー、サービス利用過程を通じて収集されます。',
        '個人情報は利用目的の達成、退会、同意撤回、または法令上必要な期間まで保管されます。',
        '保管期間が終了した個人情報は復元できない方法で安全に破棄し、電子ファイルは削除、紙文書は裁断または廃棄します。',
        '貴族は法令に基づく場合または利用者の同意がある場合を除き、個人情報を第三者に提供しません。',
        'サービス運営上必要な場合、配送、システム管理、問い合わせ対応など一部業務を委託することがあり、委託先と内容は必要に応じて案内します。',
        '国外移転が必要な場合、移転先、項目、目的、保管期間、安全措置を事前に案内し、必要な同意を受けます。',
        '利用者は個人情報の閲覧、訂正、削除、処理停止、同意撤回を求めることができます。',
        '権利行使は指定連絡先またはサービス画面を通じて申請でき、貴族は本人確認後、合理的な期間内に対応します。',
        '貴族はサービス改善、セキュリティ、アクセス管理のためCookieおよびアクセス情報を利用する場合があります。',
        '貴族は個人情報を保護するため、アクセス制御、暗号化、権限管理、保管期間管理など必要な安全措置を行います。',
        '貴族のB2Bサービスは14歳未満の児童を対象としていません。14歳未満の利用者は会員登録できません。',
        '個人情報保護責任者および問い合わせ窓口は運営前に最終確認し、サービス画面または方針で案内します。',
        '個人情報侵害に関する相談または救済は貴族の問い合わせ窓口または関連公的機関を通じて行えます。',
        '本方針は法令、サービス構造、運営方針の変更により改定される場合があり、重要な変更はサイトで案内します。',
        '本方針はprivacy-policy-v1.0として施行され、正式運営前に責任者情報、委託、国外移転、問い合わせ窓口を最終確認します。',
      ],
    },
  },
  cn: {
    terms_of_service: {
      title: '贵族使用条款',
      headings: [
        '第1条 目的',
        '第2条 术语定义',
        '第3条 主要术语',
        '第4条 条款公示与修订',
        '第5条 公司信息与通知',
        '第6条 服务提供',
        '第7条 服务变更与中断',
        '第8条 会员注册与交易方审核申请',
        '第9条 会员审核与访问权限',
        '第10条 退会与资格限制',
        '第11条 商品信息与图片',
        '第12条 价格信息限制',
        '第13条 管理员报价与最终报价',
        '第14条 交易确认与说明',
        '第15条 用户义务',
        '第16条 禁止行为',
        '第17条 知识产权',
        '第18条 个人信息',
        '第19条 免责声明',
        '第20条 通知',
        '第21条 争议与准据法',
        '第22条 准据法',
        '第23条 生效日',
        '第24条 修订说明',
      ],
      bodies: [
        '本条款规定贵族提供的国内及海外B2B穿孔饰品目录、会员注册、交易方审核、商品信息浏览、咨询清单、报价请求及相关说明服务的使用条件。',
        '“网站”指贵族运营的网站。“用户”指访问者或会员。“买家”指申请或获得交易方审核的企业或负责人。',
        '商品指目录中展示的穿孔饰品及相关商品。咨询清单和报价请求仅用于交易洽谈，并非最终订单或付款。',
        '贵族可以在网站或注册页面公示本条款。因运营政策、法律法规或服务结构变化，条款可能被修订。',
        '贵族可以通过网站、电子邮件、通讯工具或公告区域提供服务运营信息。企业信息、联系方式及个人信息保护负责人信息将在运营前最终确认。',
        '贵族可以提供商品图片、基本商品信息、分类、系列、交易方审核、审核状态说明、批准后价格显示、咨询清单、报价请求及我的咨询确认功能。',
        '因商品供应、图片更新、目录结构、价格显示方式、报价流程、市场政策、系统维护或运营需要，服务的部分内容可能变更或临时中断。',
        '会员可以提交ID、公司名称、联系人姓名、国家、首选语言、联系方式、通讯工具、销售渠道、业务信息及请求备注，申请交易方审核。',
        '贵族在审核提交信息后，可以批准、保留、阻止或要求补充确认。只有已批准买家可以使用价格信息、咨询清单和报价请求功能。',
        '会员可以请求停止服务或删除账户。如发现虚假信息、未经授权共享价格、不正当访问、系统滥用或违反政策，贵族可以限制访问权限。',
        '商品图片和说明是用于交易审核的目录信息。屏幕颜色、材质感和尺寸感可能因设备环境或拍摄条件而与实物不同。',
        '价格信息仅向已批准买家显示。访客和审核中用户不能访问批准后价格、市场价格、详细MOQ或报价请求功能。',
        '管理员报价是负责人确认库存、单价、交期和配送条件后提供的报价基准。',
        '交易条件、数量、交期、配送和出口可否将在负责人确认后说明。报价请求不是最终订单、付款或自动下单。',
        '用户应提交准确的信息，安全管理账户，不得未经授权共享批准后价格或交易条件。',
        '禁止提交虚假信息、不正当访问、妨碍服务、未经授权共享价格、越权使用、使用他人信息以及违反法律或运营政策的行为。',
        '网站设计、标识、商品说明、图片、文字和页面结构等权利属于贵族或合法权利人，禁止未经授权复制或商业使用。',
        '个人信息的收集、使用、保存、销毁、委托处理、第三方提供和权利行使，适用另行公布的个人信息处理政策。',
        '贵族会在合理范围内努力提供准确的信息，但因商品供应、图片差异、外部通信故障或用户输入错误等导致的损害，责任可能受到限制。',
        '重要说明可通过网站、电子邮件、通讯工具或公告区域等合理方式通知。',
        '与服务使用相关的争议原则上由当事人协商解决，必要时依据相关法律法规和管辖标准处理。',
        '本条款及服务使用相关解释以适用的韩国法律及相关规定为准。',
        '本条款自网站公示之日或会员在注册流程中同意之日起生效。',
        '条款发生重要变更时，贵族可以通过网站或其他联系方式事前或事后进行说明。',
      ],
    },
    buyer_terms: {
      title: 'B2B买家条款',
      headings: [
        '第1条 B2B会员条款目的',
        '第2条 会员审核标准',
        '第3条 提交信息的准确性',
        '第4条 国家与市场价格',
        '第5条 会员价格条件',
        '第6条 MOQ与数量条件',
        '第7条 价格变更',
        '第8条 报价请求性质',
        '第9条 价格快照',
        '第10条 管理员报价',
        '第11条 最终报价与非确定状态',
        '第12条 库存、交期与配送',
        '第13条 出口与国家限制',
        '第14条 报价调整',
        '第15条 访问限制与批准取消',
        '第16条 数据错误与买家责任',
        '第17条 滥用与账户限制',
        '第18条 争议与咨询',
      ],
      bodies: [
        '本条款规定B2B买家的注册、审核、批准后价格确认、咨询清单、报价请求及负责人确认相关标准。',
        '贵族根据公司信息、负责人信息、销售渠道、国家、语言、市场和交易目的等进行交易方审核。',
        '买家有责任确保提交信息准确且保持最新。信息不准确可能导致审核保留或访问限制。',
        '价格、货币、MOQ和交易条件可能因国家、地区、市场和出口可否而不同。',
        '批准后价格仅向已批准买家说明。公开页面的价格或参考信息不是最终报价。',
        'MOQ会因商品、尺寸、颜色、市场和库存状态而不同。实际可供数量将在负责人确认后说明。',
        '价格可能因汇率、材料成本、库存、运输条件和供应状态而变更。',
        '报价请求是用于交易洽谈的咨询，并非最终订单、付款或自动下单。',
        '价格快照是报价请求时点的参考价格，不是最终报价或保证价格。',
        '管理员报价是负责人确认库存、单价、数量、交期和配送条件后提供的报价信息。',
        '最终报价在管理员确认后成立。页面中的预估合计、单价、数量信息仅为确认前参考。',
        '库存、可制作数量、交期、配送方式和出口可否可能因商品和地区而变化。',
        '部分商品可能因出口、地区、材质、法规或配送条件而限制销售或说明。',
        '报价内容可能因数量、颜色、尺寸、配送条件、库存、汇率和材料成本而调整。',
        '如发现虚假信息、不正当访问、未经授权共享价格、共享账户或违反政策，贵族可以取消批准或限制访问。',
        '买家有责任确认提交信息、选择数量、商品选项和联系方式的准确性。',
        '不正当使用服务、使用他人账户、越权访问或滥用系统可能导致账户限制。',
        '交易条件或报价相关咨询应通过贵族指定联系方式进行，争议按照协商和相关法律处理。',
      ],
    },
    privacy_collection_use: {
      title: '个人信息收集与使用同意',
      headings: ['第1条 收集项目', '第2条 收集与使用目的', '第3条 保存与使用期间', '第4条 拒绝同意的权利', '第5条 拒绝同意的影响'],
      bodies: [
        '贵族可为会员注册、交易方审核和咨询处理，收集ID、公司名称、负责人姓名、国家、语言、联系方式、通讯工具、业务信息和请求内容。',
        '收集的信息用于会员确认、B2B交易可否审核、咨询及报价处理、服务运营说明。',
        '个人信息保存至使用目的达成、退会或相关法律规定的期限届满后，并在之后安全销毁。',
        '用户有权拒绝个人信息的收集与使用。但拒绝必填项目同意时，会员注册或交易方审核可能受限。',
        '拒绝必填同意时，无法使用批准后价格确认、咨询清单、报价请求等B2B交易相关功能。',
      ],
    },
    marketing_updates: {
      title: '营销信息接收同意',
      headings: ['第1条 接收渠道', '第2条 自愿同意与撤回', '第3条 接收信息', '第4条 发送方式与咨询'],
      bodies: [
        '贵族可向同意的用户通过电子邮件、通讯工具或站内说明发送新品、目录和交易相关说明。',
        '营销信息接收同意为自愿同意，用户可随时撤回。',
        '接收信息可能包括新品、系列、目录更新、B2B交易说明及非活动性质的运营说明。',
        '发送方式和咨询窗口将在服务页面或指定联系方式中说明，撤回后除法律必要通知外将停止营销发送。',
      ],
    },
    privacy_policy: {
      title: '个人信息处理政策',
      headings: [
        '第1条 处理目的',
        '第2条 个人信息项目',
        '第3条 收集方法',
        '第4条 保存与使用期间',
        '第5条 销毁流程与方法',
        '第6条 第三方提供',
        '第7条 处理委托',
        '第8条 境外转移',
        '第9条 用户权利',
        '第10条 权利行使方法',
        '第11条 Cookie与访问信息',
        '第12条 安全措施',
        '第13条 14岁以下儿童',
        '第14条 个人信息保护负责人',
        '第15条 救济程序',
        '第16条 政策变更',
        '第17条 生效日与确认事项',
      ],
      bodies: [
        '贵族为会员注册、交易方审核、商品咨询、报价处理、服务运营及履行法律义务而处理个人信息。',
        '处理项目包括ID、公司名称、负责人姓名、联系方式、国家、首选语言、通讯工具信息、业务信息、咨询内容和访问信息。',
        '个人信息通过会员注册表、咨询表、报价请求、电子邮件、通讯工具和服务使用过程收集。',
        '个人信息保存至使用目的达成、退会、撤回同意或法律要求的期间届满。',
        '保存期间结束的个人信息将以无法恢复的方式安全销毁，电子文件删除，纸质文件粉碎或废弃。',
        '除法律依据或用户同意外，贵族不会向第三方提供个人信息。',
        '服务运营需要时，可能将配送、系统管理、咨询处理等部分业务委托给第三方，委托对象和内容将按需说明。',
        '需要境外转移时，将事先说明接收方、项目、目的、保存期间和安全措施，并取得必要同意。',
        '用户可以请求查看、更正、删除、停止处理或撤回个人信息同意。',
        '权利行使可通过指定联系方式或服务页面申请，贵族在确认本人后于合理期间内处理。',
        '贵族可能为服务改善、安全和访问管理使用Cookie及访问信息。',
        '贵族通过访问控制、加密、权限管理、保存期间管理等必要措施保护个人信息。',
        '贵族的B2B服务不面向14岁以下儿童，14岁以下用户不能注册会员。',
        '个人信息保护负责人及咨询窗口将在运营前最终确认，并通过服务页面或政策说明。',
        '个人信息侵害相关咨询或救济可通过贵族咨询窗口或相关公共机构进行。',
        '本政策可能因法律、服务结构或运营方针变化而修订，重要变更将在网站说明。',
        '本政策以privacy-policy-v1.0施行，正式运营前将最终确认负责人信息、委托、境外转移和咨询窗口。',
      ],
    },
  },
}

function getAgreementTitle(agreement, locale) {
  if (locale === 'kr') return agreement.titleKo
  if (locale === 'en') return agreement.titleEn
  return localizedAgreementContent[locale]?.[agreement.key]?.title ?? agreement.titleEn
}

function getAgreementSectionText(document, section, locale, index) {
  if (locale === 'kr') {
    return {
      heading: section.headingKo,
      body: section.bodyKo,
      secondaryHeading: section.headingEn,
      secondaryBody: section.bodyEn,
    }
  }

  if (locale === 'en') {
    return {
      heading: section.headingEn,
      body: section.bodyEn,
    }
  }

  const localizedDocument = localizedAgreementContent[locale]?.[document.key]

  return {
    heading: localizedDocument?.headings?.[index] ?? section.headingEn,
    body: localizedDocument?.bodies?.[index] ?? section.bodyEn,
  }
}
function AgreementDocument({ document, locale }) {
  return <div className="agreement-scroll">
    {document.sections.map((section, index) => {
      const localizedSection = getAgreementSectionText(document, section, locale, index)

      return <section key={`${document.key}-${section.headingEn}`} className="agreement-copy-section">
        <h4>{localizedSection.heading}</h4>
        <p>{localizedSection.body}</p>
        {locale === 'kr' && <>
          <h5>{localizedSection.secondaryHeading}</h5>
          <p>{localizedSection.secondaryBody}</p>
        </>}
      </section>
    })}
  </div>
}

function AgreementRow({ agreement, checked, locale, onChange, t }) {
  const labelPrefix = agreement.required ? t.required : t.optional
  const agreementTitle = getAgreementTitle(agreement, locale)
  const secondaryTitle = agreement.titleEn

  return <div className={`agreement-card agreement-row ${agreement.required ? 'required' : 'optional'}`}>
    <label>
      <input checked={checked} data-agreement-key={agreement.key} onChange={(event) => onChange(agreement.key, event.target.checked)} type="checkbox" />
      <span>
        <strong>{labelPrefix} {agreementTitle}</strong>
        <small>{secondaryTitle}</small>
        <em className="agreement-version">version: {agreement.version}</em>
      </span>
    </label>
    <details className="agreement-details">
      <summary>{t.viewDetails}</summary>
      <AgreementDocument document={agreement} locale={locale} />
    </details>
  </div>
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { isHybridMode, refreshCommerce, setViewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const t = registerCopy[locale] ?? registerCopy.kr
  const [agreements, setAgreements] = useState(getInitialAgreements)
  const agreementSummaries = getAgreementSummaryForRegister()
  const privacyPolicy = getAgreementDocument('privacy_policy')
  const requiredAccepted = areRequiredAgreementsAccepted(agreements)
  const allAccepted = agreementSummaries.every((agreement) => agreements[agreement.key] === true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setAgreement = (name, checked) => {
    setAgreements((current) => ({ ...current, [name]: checked }))
  }

  const setAllAgreements = (checked) => {
    setAgreements(Object.fromEntries(agreementSummaries.map((agreement) => [agreement.key, checked])))
  }

  const submitRequest = async (event) => {
    event.preventDefault()
    if (!requiredAccepted) return

    const agreementSnapshot = buildAgreementSnapshot(agreements)
    if (isHybridMode) {
      const form = new FormData(event.currentTarget)
      setSubmitting(true)
      setError('')
      try {
        await registerBuyerAccount(String(form.get('email') || ''), String(form.get('password') || ''))
        await registerHybridBuyer({
          companyName: form.get('companyName'),
          contactName: form.get('contactName'),
          country: form.get('country'),
          preferredLanguage: form.get('preferredLanguage'),
          phone: form.get('phone'),
          messengerType: form.get('messengerType'),
          messengerId: form.get('messengerId'),
          salesChannel: form.get('salesChannel'),
          businessNumber: form.get('businessNumber'),
          requestMemo: form.get('requestMemo'),
          agreements: agreementSnapshot,
        })
        await refreshCommerce()
        navigate(toLocalePath('/approval-pending'))
      } catch (nextError) {
        setError(getHybridGatewayErrorMessage(nextError))
      } finally {
        setSubmitting(false)
      }
      return
    }

    setViewerState('pending')
    navigate(toLocalePath('/approval-pending'))
  }

  const renderField = ([name, type]) => <label key={name}>
    {t.fields[name]}
    <input autoComplete={name === 'email' ? 'email' : name === 'password' ? 'new-password' : 'off'} minLength={name === 'password' ? 8 : undefined} name={name} placeholder={t.fields[name]} required={['email', 'password', 'companyName', 'contactName', 'country', 'preferredLanguage', 'phone'].includes(name)} type={type} />
  </label>

  return <main className="content auth-page">
    <section className="account-panel auth-panel wide">
      <FileText size={25} />
      <p className="eyebrow">{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <div className="buyer-access-intro">
        <p>{t.intro}</p>
        <p className="approval-helper">{t.helper}</p>
      </div>
      <aside className="buyer-access-notice" aria-label={t.noticeTitle}>
        <strong>{t.noticeTitle}</strong>
        <ul>
          {t.noticeItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </aside>
      <form className="auth-form" onSubmit={submitRequest}>
        <FieldGroup title={t.groups.buyer}>
          {fieldGroups.buyer.map(renderField)}
        </FieldGroup>
        <FieldGroup title={t.groups.contact}>
          {fieldGroups.contact.map(renderField)}
        </FieldGroup>
        <FieldGroup title={t.groups.business}>
          {fieldGroups.business.map(renderField)}
        </FieldGroup>
        <fieldset className="form-section">
          <legend>{t.groups.memo}</legend>
          <label>{t.fields.requestMemo}<textarea name="requestMemo" placeholder={t.memoPlaceholder} /></label>
        </fieldset>
        <div className="approval-note">
          <strong>{t.approvalTitle}</strong>
          <span>{t.approvalBody}</span>
        </div>

        <section className="agreement-section" aria-labelledby="agreement-title">
          <div className="agreement-summary">
            <div>
              <p className="eyebrow">{t.agreementsEyebrow}</p>
              <h2 id="agreement-title">{t.agreementsTitle}</h2>
              <span>{t.agreementsIntro}</span>
            </div>
            <label className="agreement-card agreement-row agreement-all">
              <input checked={allAccepted} data-testid="agreement-all" onChange={(event) => setAllAgreements(event.target.checked)} type="checkbox" />
              <span>
                <strong>{t.allAgree}</strong>
                <small>{t.allAgreeSub}</small>
              </span>
            </label>
          </div>

          {agreementSummaries.map((agreement) => <AgreementRow
            agreement={agreement}
            checked={agreements[agreement.key] === true}
            key={agreement.key}
            locale={locale}
            onChange={setAgreement}
            t={t}
          />)}

          {privacyPolicy && <details className="agreement-details privacy-policy-detail">
            <summary>{t.privacyPolicy}</summary>
            <AgreementDocument document={privacyPolicy} locale={locale} />
          </details>}

          {!requiredAccepted && <p className="agreement-warning">
            {t.warning}
            <span>{t.warningSub}</span>
          </p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>

        <div className="account-actions agreement-actions">
          <button className="primary-action" data-testid="request-buyer-access-submit" disabled={!requiredAccepted || submitting} type="submit">{submitting ? 'Submitting…' : t.submit}</button>
          <Link className="secondary-action" to={toLocalePath('/login')}>{t.back}</Link>
        </div>
      </form>
    </section>
  </main>
}
