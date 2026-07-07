import { useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { subscribeActiveUsers } from '@/lib/firebase/firestore'

// ハンド履歴記録ツール（HandLog）は public/handlog/ の静的アプリとして同梱。
// ハンドデータは端末の localStorage に保存され、Firestore には送信されない。
// 登録メンバーの uid + playerName を名簿として渡す。HandLog 側は会員を uid で
// 紐付けて記録・集計し、表示と検索には登録名を使う（改名しても同一人物として追跡）。
export const HandHistoryPage = () => {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const membersRef = useRef<{ uid: string; name: string }[]>([])

  const sendMembers = () => {
    frameRef.current?.contentWindow?.postMessage(
      { type: 'hl-members', members: membersRef.current },
      window.location.origin
    )
  }

  useEffect(() => {
    return subscribeActiveUsers((users) => {
      membersRef.current = users
        .map((u) => ({ uid: u.uid, name: u.playerName }))
        .filter((m) => m.uid && m.name)
      // iframe 読み込み前に購読が先に完了した場合に備え、起動時に読む localStorage にも書く
      try {
        localStorage.setItem('hl2_members', JSON.stringify(membersRef.current))
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
