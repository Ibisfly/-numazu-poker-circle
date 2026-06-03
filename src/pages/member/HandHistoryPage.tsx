import { AppShell } from '@/components/layout/AppShell'
import { Clock } from '@/components/ui/Icons'

export const HandHistoryPage = () => {
  return (
    <AppShell title="ハンド履歴">
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-swan-card border border-swan-border flex items-center justify-center">
          <Clock size={40} className="text-swan-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-swan-text mb-2">Coming Soon</h2>
          <p className="text-swan-sub text-sm">
            ハンド履歴機能は現在開発中です
          </p>
          <p className="text-swan-muted text-xs mt-2">
            過去のハンドを振り返り、プレイを分析できるようになります
          </p>
        </div>
      </div>
    </AppShell>
  )
}
