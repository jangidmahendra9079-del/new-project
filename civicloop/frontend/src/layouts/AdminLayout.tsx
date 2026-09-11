import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, Users, Building2, FileText, Settings, LogOut, MapPin, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function AdminLayout() {
  const { name, role, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = role === 'super_admin'

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full
     ${isActive ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'}`

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 hidden md:flex">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-lg">CivicLoop</span>
          </div>
          <span className="text-xs text-slate-400">Admin Panel</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/admin" end className={navClass}>
            <BarChart3 size={18} /> Dashboard
          </NavLink>
          <NavLink to="/admin/issues" className={navClass}>
            <AlertTriangle size={18} /> Issues
          </NavLink>
          <NavLink to="/admin/analytics" className={navClass}>
            <BarChart3 size={18} /> Analytics
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/users" className={navClass}>
                <Users size={18} /> Users
              </NavLink>
              <NavLink to="/admin/departments" className={navClass}>
                <Building2 size={18} /> Departments
              </NavLink>
              <NavLink to="/admin/audit" className={navClass}>
                <FileText size={18} /> Audit Logs
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2 px-3">{name}</div>
          <button
            onClick={() => { clearAuth(); navigate('/login') }}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full px-3 py-2 rounded-lg hover:bg-slate-700">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <span className="font-bold">CivicLoop Admin</span>
          <button onClick={() => { clearAuth(); navigate('/login') }}>
            <LogOut size={18} className="text-slate-300" />
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
