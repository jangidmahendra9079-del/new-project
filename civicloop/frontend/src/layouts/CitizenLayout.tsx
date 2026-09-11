import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Plus, List, MapPin, Bell, LogOut, Award } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useOfflineStore } from '@/store/offlineStore'

export default function CitizenLayout() {
  const { name, clearAuth } = useAuthStore()
  const pendingReports = useOfflineStore((s) => s.pendingReports)
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors
     ${isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-700" />
          <span className="font-bold text-gray-900">CivicLoop</span>
          {pendingReports.length > 0 && (
            <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {pendingReports.length} pending sync
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">{name}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom nav (mobile-first) */}
      <nav className="bg-white border-t border-gray-200 px-2 py-2 flex items-center justify-around sticky bottom-0 z-50 shadow-lg">
        <NavLink to="/citizen" end className={navClass}>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/citizen/report" className={navClass}>
          <div className="bg-blue-700 text-white rounded-full p-2 -mt-4 shadow-lg">
            <Plus size={22} />
          </div>
          <span>Report</span>
        </NavLink>
        <NavLink to="/citizen/reports" className={navClass}>
          <List size={20} />
          <span>My Issues</span>
        </NavLink>
        <NavLink to="/citizen/nearby" className={navClass}>
          <MapPin size={20} />
          <span>Nearby</span>
        </NavLink>
      </nav>
    </div>
  )
}
