# タイマーアプリ統合計画

**参照リポジトリ:** https://github.com/Kujo-n/ALLin-Timer  
**ステータス:** 凍結中（着手準備完了）  
**最終確認日:** 2026-05-05

---

## 背景

NUMAZU POKER CIRCLE の管理アプリに、友人が開発した ALLin-Timer（Next.js + Firebase）の  
トーナメント運営ロジックを組み込む計画。  
現状は `Match.timerAppUrl` フィールドで外部リンクのみ対応済み（フェーズ1）。

---

## フェーズ構成

### フェーズ A — 席決めエンジンの移植（**最初に着手すべき・最も簡単**）

**内容:**  
`src/lib/services/seating/engine.ts` をそのまま移植する。  
純粋関数のみで構成されており、React・Firebase・フレームワーク依存がゼロ。

**移植先:** `src/lib/seating/engine.ts`

**提供される機能:**
- `planInitialSeating()` — 参加者を卓に均等分配（TDA準拠）
- `planLateEntrySeat()` — 遅延参加者を最少人数卓の空席に配置
- `diagnoseBalancingNeed()` — 卓間の人数差（≥2）を検出し移動候補をリスト化
- `planTableBreak()` — 最少人数卓を閉鎖し、残プレイヤーを再配置
- `planManualSeatCascade()` — ドラッグ&ドロップ時の連鎖移動計算

**作業量:** 小（コピー＋型調整のみ）

---

### フェーズ B — Firestore コレクション追加

**内容:**  
トーナメント進行用のサブコレクションを追加する。

**追加コレクション:**
```
tournaments/{tid}/players/{pid}   ← 席・バスト状態・移動履歴
tournaments/{tid}/tables/{tabid}  ← テーブル番号・閉鎖フラグ
```

**スキーマ参照:** `src/lib/firebase/schemas/player.ts` / `table.ts`（ALLin-Timer）

**Player ドキュメント構造:**
```typescript
{
  displayName: string
  uid: string
  joinedAt: Timestamp
  isBusted: boolean
  bustTime?: Timestamp
  tableNum: number | null
  seatNum: number | null
  lastMovedAt: Timestamp
  isPlayingDealer: boolean
}
```

**Table ドキュメント構造:**
```typescript
{
  tableNum: number
  isBroken: boolean
  createdAt: Timestamp
}
```

**Firestore セキュリティルール追加が必要:**  
`tournaments/{tid}/players` と `tournaments/{tid}/tables` へのアクセス制御を  
`firestore.rules` に追記する。

**作業量:** 中（スキーマ定義＋ルール追加）

---

### フェーズ C — タイマーフックの移植

**内容:**  
`src/lib/hooks/useTournamentTimer.ts` を自社版に移植する。

**提供される機能:**
- ブラインドレベルの自動進行
- 残り時間のリアルタイム表示（ms精度）
- 一時停止・再開・累積停止時間管理
- タブ非表示時の自動停止（バッテリー節約）

**差し替え箇所:**
- `subscribeTournament(tid)` → 自社 `subscribeMatch(matchId)` に対応する関数
- `advanceLevel(tid, uid)` → Firestore バッチ書き込みで実装

**ブラインド構造データ** は既存の `Match.distributionRules` ではなく、  
`Match` に `blindStructure: LevelRow[]` フィールドを追加して管理する。

```typescript
interface LevelRow {
  level: number
  durationSec: number
  sb: number
  bb: number
  ante?: number
}
```

**作業量:** 中（フック移植＋Firebase接続の差し替え）

---

### フェーズ D — 管理画面へのタイマー画面追加

**内容:**  
管理者がアプリ内でトーナメントを進行できる画面を追加する。

**新規ルート:** `/admin/matches/:matchId/timer`

**画面構成:**
- 現在のブラインドレベル表示（SB/BB/Ante）
- カウントダウンタイマー（大きく表示）
- 次のレベルプレビュー
- 一時停止・次のレベルへ ボタン
- 卓割り当て表示（フェーズA/B完了後）

**作業量:** 大（UI実装全般）

---

## 現状の接続ポイント（実装済み）

| ファイル | 内容 |
|---|---|
| `src/types/index.ts` | `Match.timerAppUrl?: string` フィールド追加済み |
| `src/pages/admin/MatchesAdminPage.tsx` | `TimerAppSection` コンポーネント：URLを貼るだけでリンクボタンが出る |
| `src/pages/member/MatchDetailPage.tsx` | 開催中マッチで `timerAppUrl` があれば「タイマーアプリで参加↗」を表示 |

---

## 再開するときの指示例

```
.claude/plans/timer-integration.md を読んで、
タイマー統合のフェーズAから始めてください
```

```
タイマー統合フェーズBのFirestoreコレクション追加を実装してください
```

---

## 参考ファイル（ALLin-Timer リポジトリ）

| ファイル | 役割 |
|---|---|
| `src/lib/services/seating/engine.ts` | 席決めエンジン（純粋関数・要移植） |
| `src/lib/services/seating/orchestrator.ts` | Firestoreトランザクション処理 |
| `src/lib/hooks/useTournamentTimer.ts` | タイマーフック |
| `src/lib/firebase/schemas/tournament.ts` | トーナメントスキーマ |
| `src/lib/firebase/schemas/player.ts` | プレイヤースキーマ |
| `src/lib/firebase/schemas/table.ts` | テーブルスキーマ |
