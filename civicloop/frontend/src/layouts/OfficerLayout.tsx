import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ClipboardList, MapPin, LogOut, Wrench } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function OfficerLayout() {
  const { name, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          <span className="font-bold">CivicLoop — Field Officer</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-blue-200">{name}</span>
          <button onClick={() => { clearAuth(); navigate('/login') }} className="text-blue-300 hover:text-white">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <nav className="bg-white border-t border-gray-200 px-4 py-2 flex justify-around sticky bottom-0 z-50">
        <NavLink to="/officer" end className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-xs font-medium ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
          <ClipboardList size={20} />
          <span>Assignments</span>
        </NavLink>
        <NavLink to="/public" className="flex flex-col items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800">
          <MapPin size={20} />
          <span>Public Map</span>
        </NavLink>
      </nav>
    </div>
  )
}
