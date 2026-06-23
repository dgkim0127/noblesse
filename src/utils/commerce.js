import { formatCurrency } from '../config/currency.js'

export const formatMoney = (value, currency = 'USD', options = {}) => formatCurrency(value, currency, options)
