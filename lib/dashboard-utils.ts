// Dashboard utility functions for formatting and calculations

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount)
}

export const formatPhoneNumber = (number: string): string => {
  const cleaned = number.replace(/\D/g, '')
  
  // US/Canada format
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  // International format fallback
  if (cleaned.length > 10) {
    return `+${cleaned.slice(0, -10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`
  }
  
  // Local format
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  return number
}

export const formatDate = (date: string | Date, locale: string = 'et-EE'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale)
}

export const formatDateTime = (date: string | Date, locale: string = 'et-EE'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString(locale)
}

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  const secs = Math.floor((minutes % 1) * 60)
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  } else if (mins > 0) {
    return `${mins}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export const calculatePercentageChange = (current: number, previous: number): {
  percentage: number
  direction: 'up' | 'down' | 'same'
  formatted: string
} => {
  if (previous === 0) {
    return {
      percentage: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'same',
      formatted: current > 0 ? '+100%' : '0%'
    }
  }
  
  const percentage = ((current - previous) / previous) * 100
  const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'same'
  const formatted = percentage > 0 ? `+${percentage.toFixed(1)}%` : `${percentage.toFixed(1)}%`
  
  return { percentage, direction, formatted }
}

export const getStatusColor = (status: string, isExpiringSoon?: boolean): string => {
  if (isExpiringSoon) return 'bg-orange-100 text-orange-800 border-orange-200'
  
  switch (status.toLowerCase()) {
    case 'active':
    case 'aktiivne':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'suspended':
    case 'peatatud':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'cancelled':
    case 'tühistatud':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'closed':
    case 'suletud':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'expired':
    case 'aegunud':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200'
  }
}

export const getStatusText = (status: string, locale: string = 'et'): string => {
  if (locale === 'et') {
    switch (status.toLowerCase()) {
      case 'active': return 'Aktiivne'
      case 'suspended': return 'Peatatud'
      case 'cancelled': return 'Tühistatud'
      case 'closed': return 'Suletud'
      case 'expired': return 'Aegunud'
      default: return status
    }
  }
  
  return status
}

export const calculateCostBreakdown = (data: any): {
  voice: number
  sms: number
  mms: number
  recording: number
  rental: number
  total: number
} => {
  return {
    voice: data.totalVoiceCost || 0,
    sms: data.totalSmsCost || 0,
    mms: data.totalMmsCost || 0,
    recording: data.totalRecordingCost || 0,
    rental: data.totalRentalCost || 0,
    total: data.totalCost || 0
  }
}

export const generateChartColors = (): string[] => {
  return [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
    '#ec4899', // pink
    '#6b7280'  // gray
  ]
}

export const aggregateUsageByPeriod = (
  data: any[], 
  period: 'daily' | 'weekly' | 'monthly'
): any[] => {
  // Group data by the specified period
  const grouped: { [key: string]: any } = {}
  
  data.forEach(item => {
    const date = new Date(item.date || item.createdAt)
    let key: string
    
    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0]
        break
      case 'weekly':
        const week = getWeekNumber(date)
        key = `${date.getFullYear()}-W${week}`
        break
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
    }
    
    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        voiceCalls: 0,
        voiceMinutes: 0,
        voiceCost: 0,
        sms: 0,
        smsCost: 0,
        mms: 0,
        mmsCost: 0,
        totalCost: 0
      }
    }
    
    // Aggregate the values
    grouped[key].voiceCalls += item.voiceCalls || 0
    grouped[key].voiceMinutes += item.voiceMinutes || 0
    grouped[key].voiceCost += item.voiceCost || 0
    grouped[key].sms += item.sms || 0
    grouped[key].smsCost += item.smsCost || 0
    grouped[key].mms += item.mms || 0
    grouped[key].mmsCost += item.mmsCost || 0
    grouped[key].totalCost += item.totalCost || 0
  })
  
  return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period))
}

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export const generateMonthOptions = (monthsBack: number = 12): Array<{value: string, label: string}> => {
  const options = []
  const now = new Date()
  
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = date.toISOString().substr(0, 7) // YYYY-MM format
    const label = date.toLocaleDateString('et-EE', { year: 'numeric', month: 'long' })
    options.push({ value, label })
  }
  
  return options
}

export const calculateDaysRemaining = (endDate: string | Date): {
  days: number
  isExpiringSoon: boolean
  isExpired: boolean
} => {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return {
    days: Math.max(0, days),
    isExpiringSoon: days <= 7 && days > 0,
    isExpired: days <= 0
  }
}

export const formatUsageLabel = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'voice': return 'Kõned'
    case 'sms': return 'SMS'
    case 'mms': return 'MMS'
    case 'recording': return 'Salvestused'
    case 'rental': return 'Üür'
    default: return type
  }
}

export const exportToCSV = (data: any[], filename: string): void => {
  if (!data.length) return
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header]
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    }).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToJSON = (data: any, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
} 