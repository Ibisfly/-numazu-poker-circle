import { useAuth } from '@/lib/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { BeginnerIcon } from '@/components/ui/Icons'
import { SwanAvatar, DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { QRCodeSVG } from 'qrcode.react'

export const CardPage = () => {
  const { user, firebaseUser } = useAuth()
  if (!user || !firebaseUser) return null

  const memberNumber = firebaseUser.uid.slice(0, 8).toUpperCase()

  return (
    <AppShell title="会員証">
      <div className="py-8 flex flex-col items-center">
        <div className="w-full max-w-xs bg-gradient-to-br from-swan-card to-[#1e1e1e] border border-swan-border rounded-2xl overflow-hidden shadow-2xl">
          {/* カードヘッダー */}
          <div className="bg-gradient-to-r from-black to-swan-muted px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-swan-accent font-bold tracking-widest text-sm">NUMAZU POKER</p>
              <p className="text-swan-sub text-xs">CIRCLE</p>
            </div>
            <SwanAvatar color={user.avatarColor ?? DEFAULT_AVATAR_COLOR} size={36} showCard={false} />
          </div>

          {/* QRコード */}
          <div className="flex justify-center py-6 bg-white mx-6 my-4 rounded-xl">
            <QRCodeSVG
              value={firebaseUser.uid}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>

          {/* 会員情報 */}
          <div className="px-6 pb-6 space-y-3">
            <div>
              <p className="text-swan-sub text-xs mb-0.5">PLAYER NAME</p>
              <p className="text-swan-text font-bold text-lg flex items-center gap-2">
                {user.playerName}
                {user.isBeginner && <BeginnerIcon size={18} />}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-swan-sub text-xs mb-0.5">MEMBER NO.</p>
                <p className="text-swan-text font-mono text-sm"># {memberNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-swan-sub text-xs mb-0.5">POINTS</p>
                <p className="text-swan-accent font-bold flex items-center gap-1 justify-end">
                  <FeatherIcon size={14} />
                  {(user.ownedPoints ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-swan-sub text-xs mt-6 text-center px-4">
          管理者のスキャナーにQRコードを提示して来店ポイントを受け取ってください
        </p>
      </div>
    </AppShell>
  )
}
