import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AchievementProvider } from '@/contexts/AchievementContext'
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
import { GuidePage } from '@/pages/member/GuidePage'
import { BingoPage } from '@/pages/member/BingoPage'
import { HandHistoryPage } from '@/pages/member/HandHistoryPage'

// Admin
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { MembersPage } from '@/pages/admin/MembersPage'
import { ScanPage } from '@/pages/admin/ScanPage'
import { EventsPage } from '@/pages/admin/EventsPage'
import { TournamentPage } from '@/pages/admin/TournamentPage'
import { MatchesAdminPage } from '@/pages/admin/MatchesAdminPage'
import { ShopAdminPage } from '@/pages/admin/ShopAdminPage'
import { PointsPage } from '@/pages/admin/PointsPage'
import { AchievementsAdminPage } from '@/pages/admin/AchievementsAdminPage'
import { BingoAdminPage } from '@/pages/admin/BingoAdminPage'
import { BingoStampPage } from '@/pages/admin/BingoStampPage'
import { TitlesAdminPage } from '@/pages/admin/TitlesAdminPage'

// Live Timer / Bracket（ログイン不要の公開アプリ）
// 会員が使わない画面なので、本体バンドルに載せず遅延読み込みにする
const TimerLandingPage = lazy(() => import('@/pages/timer/TimerLandingPage').then((m) => ({ default: m.TimerLandingPage })))
const TimerNewPage     = lazy(() => import('@/pages/timer/TimerNewPage').then((m) => ({ default: m.TimerNewPage })))
const TimerLivePage    = lazy(() => import('@/pages/timer/TimerLivePage').then((m) => ({ default: m.TimerLivePage })))
const BracketNewPage   = lazy(() => import('@/pages/timer/BracketNewPage').then((m) => ({ default: m.BracketNewPage })))
const BracketLivePage  = lazy(() => import('@/pages/timer/BracketLivePage').then((m) => ({ default: m.BracketLivePage })))

/** 遅延読み込み中も背景色が本体アプリの黒に落ちないよう、緑地のプレースホルダを出す */
const TimerRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense
    fallback={
      <div style={{ minHeight: '100vh', background: 'radial-gradient(120% 90% at 50% 0%, #106d53, #0d5843 42%, #073a2d 100%)' }} />
    }
  >
    {children}
  </Suspense>
)

export const App = () => (
  <BrowserRouter>
    <AuthProvider>
    <AchievementProvider>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending" element={<PendingPage />} />

        {/* ── Live Timer / Bracket（ログイン不要・リンクを知っている全員が閲覧可）── */}
        <Route path="/timer" element={<TimerRoute><TimerLandingPage /></TimerRoute>} />
        <Route path="/timer/new" element={<TimerRoute><TimerNewPage /></TimerRoute>} />
        <Route path="/timer/new-bracket" element={<TimerRoute><BracketNewPage /></TimerRoute>} />
        <Route path="/timer/t/:id" element={<TimerRoute><TimerLivePage /></TimerRoute>} />
        <Route path="/timer/b/:id" element={<TimerRoute><BracketLivePage /></TimerRoute>} />

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
        <Route path="/guide" element={<RequireAuth><GuidePage /></RequireAuth>} />
        <Route path="/bingo" element={<RequireAuth><BingoPage /></RequireAuth>} />
        <Route path="/hands" element={<RequireAuth><HandHistoryPage /></RequireAuth>} />

        {/* ── Admin (requires admin role) ── */}
        <Route path="/admin" element={<RequireAuth requireAdmin><AdminDashboardPage /></RequireAuth>} />
        <Route path="/admin/members" element={<RequireAuth requireAdmin><MembersPage /></RequireAuth>} />
        <Route path="/admin/scan" element={<RequireAuth requireAdmin><ScanPage /></RequireAuth>} />
        <Route path="/admin/events" element={<RequireAuth requireAdmin><EventsPage /></RequireAuth>} />
        <Route path="/admin/tournament" element={<RequireAuth requireAdmin><TournamentPage /></RequireAuth>} />
        <Route path="/admin/matches" element={<RequireAuth requireAdmin><MatchesAdminPage /></RequireAuth>} />
        <Route path="/admin/shop" element={<RequireAuth requireAdmin><ShopAdminPage /></RequireAuth>} />
        <Route path="/admin/points" element={<RequireAuth requireAdmin><PointsPage /></RequireAuth>} />
        <Route path="/admin/achievements" element={<RequireAuth requireAdmin><AchievementsAdminPage /></RequireAuth>} />
        <Route path="/admin/bingo" element={<RequireAuth requireAdmin><BingoAdminPage /></RequireAuth>} />
        <Route path="/admin/bingo/stamp" element={<RequireAuth requireAdmin><BingoStampPage /></RequireAuth>} />
        <Route path="/admin/titles" element={<RequireAuth requireAdmin><TitlesAdminPage /></RequireAuth>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AchievementProvider>
    </AuthProvider>
  </BrowserRouter>
)
