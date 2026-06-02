import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { createUser, isPlayerNameTaken } from '@/lib/firebase/firestore'
import { logOut } from '@/lib/firebase/auth'
import { SwanAvatar } from '@/components/ui/SwanAvatar'

export const RegisterPage = () => {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState('')
  const [bio, setBio] = useState('')
  const [isBeginner, setIsBeginner] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) return
    setError('')

    const trimmed = playerName.trim()
    if (!trimmed) { setError('プレイヤーネームを入力してください'); return }
    if (trimmed.length > 20) { setError('プレイヤーネームは20文字以内にしてください'); return }

    setLoading(true)
    try {
      const taken = await isPlayerNameTaken(trimmed)
      if (taken) { setError('このプレイヤーネームは既に使用されています'); return }
      await createUser(firebaseUser.uid, { playerName: trimmed, bio: bio.slice(0, 100), isBeginner })
      navigate('/pending', { replace: true })
    } catch {
      setError('登録に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-swan-black flex flex-col px-6 py-12">
      <div className="mb-8">
        <SwanAvatar size={48} className="mb-3" />
        <h1 className="text-xl font-bold text-swan-accent mb-1">プロフィール作成</h1>
        <p className="text-swan-sub text-sm">NUMAZU POKER CIRCLEへようこそ。プロフィールを設定してください。</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium mb-2 text-swan-text">
            プレイヤーネーム <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            placeholder="例: BlackJack"
            className="w-full bg-swan-card border border-swan-border rounded-lg px-4 py-3 text-swan-text placeholder-swan-sub focus:outline-none focus:border-swan-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-swan-text">
            ひとこと <span className="text-swan-sub text-xs">（任意・100文字以内）</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={100}
            rows={3}
            placeholder="自己紹介など..."
            className="w-full bg-swan-card border border-swan-border rounded-lg px-4 py-3 text-swan-text placeholder-swan-sub focus:outline-none focus:border-swan-accent resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setIsBeginner(!isBeginner)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              isBeginner ? 'bg-swan-accent' : 'bg-swan-muted'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                isBeginner ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </div>
          <span className="text-sm text-swan-text">初心者マーク</span>
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-swan-accent text-black font-bold py-3 rounded-lg hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? '登録中...' : '登録する'}
        </button>

        <button
          type="button"
          onClick={() => logOut()}
          className="text-swan-sub text-sm underline text-center"
        >
          ログアウト
        </button>
      </form>
    </div>
  )
}
