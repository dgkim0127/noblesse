export function getInquiryKey(inquiry) {
  return inquiry?.inquiryId || inquiry?.id || inquiry?.inquiryNumber || ''
}

export function getInquiryRoutePath(inquiry) {
  const inquiryKey = getInquiryKey(inquiry)
  return inquiryKey ? `/my-inquiries/${encodeURIComponent(inquiryKey)}` : '/my-inquiries'
}
