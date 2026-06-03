import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, FileText, MessageSquare, Activity,
  ShieldCheck, Loader2, AlertTriangle,
} from 'lucide-react'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { formatDistanceToNow } from 'date-fns'

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="glass-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-3xl font-bold font-display">{value ?? '—'}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/admin/stats')).data,
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data,
  })

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: async () => (await api.get('/admin/documents')).data,
  })

  if (!user?.is_admin) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-400">Admin privileges required.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <ShieldCheck size={18} className="text-violet-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">Platform overview</p>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="flex items-center gap-2 text-slate-500 mb-8">
          <Loader2 size={16} className="animate-spin" /> Loading stats…
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total Users" value={stats?.total_users} color="bg-primary-600/15 text-primary-400" />
          <StatCard icon={FileText} label="Documents" value={stats?.total_documents} color="bg-emerald-600/15 text-emerald-400" />
          <StatCard icon={MessageSquare} label="Messages" value={stats?.total_messages} color="bg-yellow-600/15 text-yellow-400" />
          <StatCard icon={Activity} label="Chat Sessions" value={stats?.total_chat_sessions} color="bg-violet-600/15 text-violet-400" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users table */}
        <div className="glass-card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary-400" /> Recent Users
          </h2>
          {usersLoading ? (
            <Loader2 size={16} className="animate-spin text-slate-500" />
          ) : (
            <div className="space-y-2">
              {(users as any[]).slice(0, 10).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-300 flex-shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.username}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <span className={`badge text-xs ${u.is_active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="badge bg-white/5 text-slate-400 text-xs">{u.plan}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents table */}
        <div className="glass-card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FileText size={16} className="text-emerald-400" /> Recent Documents
          </h2>
          {docsLoading ? (
            <Loader2 size={16} className="animate-spin text-slate-500" />
          ) : (
            <div className="space-y-2">
              {(documents as any[]).slice(0, 10).map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <FileText size={14} className="text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.original_name}</p>
                    <p className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`badge text-xs ${
                    d.status === 'ready'
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : d.status === 'processing'
                        ? 'bg-yellow-400/10 text-yellow-400'
                        : 'bg-red-400/10 text-red-400'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
