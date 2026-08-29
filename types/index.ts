export type Plan = 'free' | 'pro'
export type ProjectStatus = 'idea' | 'dev' | 'live' | 'archived'
export type PaymentProvider = 'manual' | 'stripe' | 'paddle' | 'lemonsqueezy' | 'gumroad'

export interface Profile {
  id: string
  email: string
  slug: string | null
  plan: Plan
  stripe_customer_id: string | null
  is_admin: boolean
  created_at: string
}

export interface Feedback {
  id: string
  user_id: string
  message: string
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  status: ProjectStatus
  color: string
  mrr: number
  users_count: number
  payment_provider: PaymentProvider
  stripe_product_id: string | null
  price: number | null
  launch_month: string | null
  created_at: string
}

export interface RevenueHistory {
  id: string
  project_id: string
  month: string
  mrr: number
}

export interface PublicSettings {
  user_id: string
  is_public: boolean
}

export interface DashboardData {
  profile: Profile
  projects: Project[]
  totalMRR: number
  revenueHistory: { month: string; mrr: number }[]
}
