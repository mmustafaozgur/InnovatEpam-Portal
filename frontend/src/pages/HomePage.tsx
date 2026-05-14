import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Lightbulb, PlusCircle, Users, Search, Cpu, BarChart2, Trophy, ArrowRight } from 'lucide-react'

const STAGE_CARDS = [
  {
    value: 'new_idea',
    label: 'New Idea',
    icon: Lightbulb,
    description: 'Fresh submissions awaiting review',
  },
  {
    value: 'initial_screening',
    label: 'Initial Screening',
    icon: Search,
    description: 'Ideas under initial evaluation',
  },
  {
    value: 'technical_review',
    label: 'Technical Review',
    icon: Cpu,
    description: 'Assessing technical feasibility',
  },
  {
    value: 'business_impact_assessment',
    label: 'Business Impact',
    icon: BarChart2,
    description: 'Evaluating business value',
  },
  {
    value: 'final_selection',
    label: 'Final Selection',
    icon: Trophy,
    description: 'Top ideas chosen for action',
  },
]

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/75 px-8 py-6 text-white shadow-md">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="font-heading font-bold text-2xl">
            Welcome, {user?.full_name}
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
            {user?.role}
          </span>
        </div>
        <p className="text-white/70 text-sm">
          Signed in as <span className="text-white font-medium">{user?.email}</span>
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-heading font-semibold text-xs text-slate-400 uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            to="/ideas"
            className="group flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors duration-150"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">View All Ideas</p>
              <p className="text-xs text-slate-400 mt-0.5">Browse the idea board</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary shrink-0 transition-colors" />
          </Link>

          {user?.role === 'submitter' && (
            <Link
              to="/submit"
              className="group flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-4 shadow-sm hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors duration-150"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">Submit an Idea</p>
                <p className="text-xs text-slate-400 mt-0.5">Share your innovation</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link
              to="/users"
              className="group flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-4 shadow-sm hover:border-violet-400 hover:bg-violet-50/50 transition-colors duration-150"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700 group-hover:text-violet-700 transition-colors">Manage Users</p>
                <p className="text-xs text-slate-400 mt-0.5">Administer team access</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 shrink-0 transition-colors" />
            </Link>
          )}
        </div>
      </div>

      {/* Browse by Stage */}
      <div>
        <h2 className="font-heading font-semibold text-xs text-slate-400 uppercase tracking-widest mb-3">
          Browse by Stage
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAGE_CARDS.map(({ value, label, icon: Icon, description }) => (
            <Link
              key={value}
              to={`/ideas?stage=${value}`}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors leading-tight">{label}</p>
                <p className="text-xs text-slate-400 mt-1 leading-snug">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
