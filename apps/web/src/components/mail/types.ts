export type MailType = 'system' | 'battle_report' | 'guild' | 'event'

export interface MailReward {
  type: 'mineral' | 'energy' | 'gem' | 'unit' | 'item'
  label: string
  amount: number
  icon: string
}

export interface Mail {
  id: string
  type: MailType
  title: string
  preview: string
  body: string
  sender: string
  sentAt: string
  isRead: boolean
  isSelected?: boolean
  rewards?: MailReward[]
  expiresAt?: string
}
