import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'

interface RequireAuthProps {
  children: ReactNode
  requireAdmin?: boolean
}

export const RequireAuth = ({ children, requireAdmin = false }: RequireAuthProps) => {
  const { firebaseUser, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-swan-black flex items-center justify-center">
        <div className="text-swan-sub animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!firebaseUser) return <Navigate to="/login" replace />

  if (!user) return <Navigate to="/register" replace />

  if (user.status === 'pending') return <Navigate to="/pending" replace />

  if (user.status === 'rejected' || user.status === 'disabled') {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user.role !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}
