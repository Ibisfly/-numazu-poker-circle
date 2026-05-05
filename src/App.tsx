import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { RequireAuth } from '@/components/auth/RequireAuth'

// Auth
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { PendingPage } from '@/pages/auth/PendingPage'

// Member
import { HomePage } from '@/pages/member/HomePage'
import { CardPage } from '@/pages/member/CardPage'
import { RankingPage } from '@/pages/member/RankingPage'
import { MatchListPage } from '@/pages/member/MatchListPage'
import { MatchDetailPage } from '@/pages/member/MatchDetailPage'
import { ShopPage } from '@/pages/member/ShopPage'
import { ProfilePage } from '@/pages/member/ProfilePage'
import { AchievementsPage } from '@/pages/member/AchievementsPage'
import { NotificationsPage } from '@/pages/member/NotificationsPage'
import { MembersDirectoryPage } from '@/pages/member/MembersDirectoryPage'
import { MemberProfilePage } from '@/pages/member/MemberProfilePage'

// Admin
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { MembersPage } from '@/pages/admin/MembersPage'
import { ScanPage } from '@/pages/admin/ScanPage'
import { EventsPage } from '@/pages/admin/EventsPage'
import { TournamentPage } from '@/pages/admin/TournamentPage'
import { MatchesAdminPage } from '@/pages/admin/MatchesAdminPage'
import { ShopAdminPage } from '@/pages/admin/ShopAdminPage'
import { PointsPage } from '@/pages/admin/PointsPage'

export const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending" element={<PendingPage />} />

        {/* ── Member (requires active status) ── */}
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/card" element={<RequireAuth><CardPage /></RequireAuth>} />
        <Route path="/ranking" element={<RequireAuth><RankingPage /></RequireAuth>} />
        <Route path="/matches" element={<RequireAuth><MatchListPage /></RequireAuth>} />
        <Route path="/matches/:matchId" element={<RequireAuth><MatchDetailPage /></RequireAuth>} />
        <Route path="/shop" element={<RequireAuth><ShopPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/achievements" element={<RequireAuth><AchievementsPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/members" element={<RequireAuth><MembersDirectoryPage /></RequireAuth>} />
        <Route path="/members/:uid" element={<RequireAuth><MemberProfilePage /></RequireAuth>} />

        {/* ── Admin (requires admin role) ── */}
        <Route path="/admin" element={<RequireAuth requireAdmin><AdminDashboardPage /></RequireAuth>} />
        <Route path="/admin/members" element={<RequireAuth requireAdmin><MembersPage /></RequireAuth>} />
        <Route path="/admin/scan" element={<RequireAuth requireAdmin><ScanPage /></RequireAuth>} />
        <Route path="/admin/events" element={<RequireAuth requireAdmin><EventsPage /></RequireAuth>} />
        <Route path="/admin/tournament" element={<RequireAuth requireAdmin><TournamentPage /></RequireAuth>} />
        <Route path="/admin/matches" element={<RequireAuth requireAdmin><MatchesAdminPage /></RequireAuth>} />
        <Route path="/admin/shop" element={<RequireAuth requireAdmin><ShopAdminPage /></RequireAuth>} />
        <Route path="/admin/points" element={<RequireAuth requireAdmin><PointsPage /></RequireAuth>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
)
