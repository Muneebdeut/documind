import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Crown, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ProfilePage() {
  const { user } = useAuthStore()

  const planColors = {
    free: 'text-slate-400 bg-slate-400/10',
    pro: 'text-yellow-400 bg-yellow-400/10',
    enterprise: 'text-violet-400 bg-violet-400/10',
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-8">Profile</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-card mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-600/30 flex items-center justify-center text-3xl font-bold text-primary-300">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.full_name || user?.username}</h2>
              <p className="text-slate-400">@{user?.username}</p>
              <span className={`badge mt-1 ${planColors[user?.plan as keyof typeof planColors] || planColors.free}`}>
                <Crown size={10} />
                {user?.plan?.charAt(0).toUpperCase()}{user?.plan?.slice(1)} Plan
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: Mail, label: 'Email', value: user?.email },
              { icon: User, label: 'Username', value: `@${user?.username}` },
              { icon: Shield, label: 'Role', value: user?.is_admin ? 'Administrator' : 'User' },
              { icon: Calendar, label: 'Member ID', value: user?.id?.slice(0, 8) + '...' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                <Icon size={16} className="text-slate-500 flex-shrink-0" />
                <span className="text-slate-400 text-sm w-24">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="font-semibold mb-4">Plan Details</h3>
          <div className="space-y-3">
            {[
              { label: 'PDF Uploads', limit: 'Unlimited', used: '—' },
              { label: 'Max File Size', limit: '50MB', used: '—' },
              { label: 'AI Chat Messages', limit: user?.plan === 'free' ? '100/month' : 'Unlimited', used: '—' },
              { label: 'Documents Stored', limit: user?.plan === 'free' ? '10' : 'Unlimited', used: '—' },
            ].map(({ label, limit }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-slate-400">{label}</span>
                <span className="text-sm font-medium text-primary-300">{limit}</span>
              </div>
            ))}
          </div>

          {user?.plan === 'free' && (
            <div className="mt-4 p-4 bg-primary-600/10 border border-primary-500/20 rounded-xl">
              <p className="text-sm font-semibold text-primary-300 mb-1">Upgrade to Pro</p>
              <p className="text-xs text-slate-400">Get unlimited documents, messages, and priority AI processing.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
