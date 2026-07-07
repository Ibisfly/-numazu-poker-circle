import { AppShell } from '@/components/layout/AppShell'

// ハンド履歴記録ツール（HandLog）は public/handlog/ の静的アプリとして同梱。
// データは端末の localStorage に保存され、Firestore には送信されない。
export const HandHistoryPage = () => {
  return (
    <AppShell title="ハンド履歴">
      <iframe
        src="/handlog/index.html"
        title="ハンド履歴記録"
        className="block w-full -mx-4 -mb-20 border-0"
        style={{
          width: 'calc(100% + 2rem)',
          height: 'calc(100dvh - 3.5rem - 4rem)',
        }}
      />
    </AppShell>
  )
}
