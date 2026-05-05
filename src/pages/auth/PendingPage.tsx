import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { logOut } from '@/lib/firebase/auth'
import { SwanAvatar } from '@/components/ui/SwanAvatar'

export const PendingPage = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (user?.status === 'active') navigate('/', { replace: true })
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-swan-black flex flex-col items-center justify-center px-6 text-center">
      <SwanAvatar size={56} className="mx-auto mb-6 opacity-40" />
      <h1 className="text-xl font-bold text-swan-accent mb-3">承認待ち</h1>
      <p className="text-swan-sub text-sm leading-relaxed mb-8">
        管理者の承認をお待ちください。
        <br />
        承認が完了するとアプリ内通知でお知らせします。
      </p>
      <div className="bg-swan-card border border-swan-border rounded-xl p-4 w-full max-w-xs mb-8">
        <p className="text-swan-sub text-xs mb-1">サークル連絡先</p>
        <p className="text-swan-text text-sm">管理者に直接お問い合わせください</p>
      </div>
      <button
        onClick={() => logOut()}
        className="text-swan-sub text-sm underline"
      >
        ログアウト
      </button>
    </div>
  )
}
