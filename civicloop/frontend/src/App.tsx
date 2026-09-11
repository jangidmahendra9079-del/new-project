import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/store/authStore'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Public
import PublicDashboard from '@/pages/public/PublicDashboard'

// Citizen
import CitizenLayout from '@/layouts/CitizenLayout'
import CitizenDashboard from '@/pages/citizen/CitizenDashboard'
import ReportIssuePage from '@/pages/citizen/ReportIssuePage'
import MyReportsPage from '@/pages/citizen/MyReportsPage'
import NearbyIssuesPage from '@/pages/citizen/NearbyIssuesPage'
import IssueDetailPage from '@/pages/citizen/IssueDetailPage'

// Officer
import OfficerLayout from '@/layouts/OfficerLayout'
import OfficerDashboard from '@/pages/officer/OfficerDashboard'
import OfficerAssignmentDetail from '@/pages/officer/OfficerAssignmentDetail'

// Admin
import AdminLayout from '@/layouts/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminIssues from '@/pages/admin/AdminIssues'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminDepartments from '@/pages/admin/AdminDepartments'
import AdminAuditLogs from '@/pages/admin/AdminAuditLogs'
import AdminAnalytics from '@/pages/admin/AdminAnalytics'

// Guards
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { isAuthenticated, role } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />
  return <>{children}</>
}

function RoleRedirect() {
  const { isAuthenticated, role } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/public" replace />
  if (role === 'citizen') return <Navigate to="/citizen" replace />
  if (role === 'field_officer') return <Navigate to="/officer" replace />
  if (role === 'department_officer' || role === 'super_admin') return <Navigate to="/admin" replace />
  return <Navigate to="/public" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Public (no auth) */}
      <Route path="/public" element={<PublicDashboard />} />

      {/* Citizen */}
      <Route path="/citizen" element={
        <ProtectedRoute roles={['citizen', 'super_admin']}>
          <CitizenLayout />
        </ProtectedRoute>
      }>
        <Route index element={<CitizenDashboard />} />
        <Route path="report" element={<ReportIssuePage />} />
        <Route path="reports" element={<MyReportsPage />} />
        <Route path="nearby" element={<NearbyIssuesPage />} />
        <Route path="issue/:id" element={<IssueDetailPage />} />
      </Route>

      {/* Officer */}
      <Route path="/officer" element={
        <ProtectedRoute roles={['field_officer', 'department_officer', 'super_admin']}>
          <OfficerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<OfficerDashboard />} />
        <Route path="assignment/:id" element={<OfficerAssignmentDetail />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['department_officer', 'super_admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="issues" element={<AdminIssues />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="departments" element={<AdminDepartments />} />
        <Route path="audit" element={<AdminAuditLogs />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
