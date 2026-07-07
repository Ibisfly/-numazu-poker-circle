import { useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { subscribeActiveUsers } from '@/lib/firebase/firestore'

// ハンド履歴記録ツール（HandLog）は public/handlog/ の静的アプリとして同梱。
// ハンドデータは端末の localStorage に保存され、Firestore には送信されない。
// 登録メンバーの playerName のみを名簿として渡し、名前入力の候補に使う。
export const HandHistoryPage = () => {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const namesRef = useRef<string[]>([])

  const sendMembers = () => {
    frameRef.current?.contentWindow?.postMessage(
      { type: 'hl-members', names: namesRef.current },
      window.location.origin
    )
  }

  useEffect(() => {
    return subscribeActiveUsers((users) => {
      namesRef.current = users.map((u) => u.playerName).filter(Boolean)
      // iframe 読み込み前に購読が先に完了した場合に備え、起動時に読む localStorage にも書く
      try {
        localStorage.setItem('hl2_members', JSON.stringify(namesRef.current))
      } catch {
        // quota 超過時は候補なしで続行（記録機能自体には影響しない）
      }
      sendMembers()
    })
  }, [])

  return (
    <AppShell title="ハンド履歴">
      <iframe
        ref={frameRef}
        src="/handlog/index.html"
        title="ハンド履歴記録"
        onLoad={sendMembers}
        className="block w-full -mx-4 -mb-20 border-0"
        style={{
          width: 'calc(100% + 2rem)',
          height: 'calc(100dvh - 3.5rem - 4rem)',
        }}
      />
    </AppShell>
  )
}
