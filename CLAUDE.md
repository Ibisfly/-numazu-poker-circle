# BLACK SWAN — ポーカーサークル管理アプリ

## プロジェクト概要

**BLACK SWAN Poker Circle** のメンバー管理・ポイント運営・マッチ管理を一元化する Web アプリケーション。
サークル体験の DX 化とエンゲージメント向上を目的とする。

**対象規模**: 一般メンバー 20〜50名 / 管理者 2〜3名  
**スコープ**: シングルサークル（将来のマルチテナント化のため `circleId` フィールドは設計段階から保持）

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 18 + TypeScript (Vite) |
| スタイリング | Tailwind CSS（ダーク基調・モバイルファースト） |
| バックエンド | Firebase Auth / Firestore / Hosting |
| リアルタイム | Firestore `onSnapshot` |

## ディレクトリ構成

```
src/
├── components/
│   ├── auth/       # RequireAuth（認証ガード）
│   ├── layout/     # AppShell・BottomNav
│   └── ui/         # FeatherIcon 等の共通コンポーネント
├── contexts/       # AuthContext（Firebase Auth + User doc の統合）
├── lib/
│   ├── firebase/   # config・auth・firestore（全 DB 操作）
│   ├── hooks/      # useAuth
│   └── achievements.ts  # 実績マスタ（ハードコード）
├── pages/
│   ├── auth/       # LoginPage・RegisterPage・PendingPage
│   ├── member/     # 一般会員向け 9 画面
│   └── admin/      # 管理者向け 8 画面
└── types/          # Firestore ドキュメント型定義
```

## ページ遷移フロー

```
[未ログイン] → /login
  └─ Google サインイン
      ├─ users/{uid} 未存在 → /register（プロフィール作成）
      │     └─ 作成 → status: pending → /pending
      │           └─ 管理者承認 → / (ホーム)
      └─ users/{uid} 存在かつ active → / (ホーム)

[一般メンバー] /（ホーム）
  ├─ /card         … 会員証 QR
  ├─ /ranking      … 累計/年間タブ
  ├─ /matches      … マッチ一覧
  │    └─ /matches/:matchId … 詳細・エントリー
  ├─ /shop         … アイテム購入
  ├─ /profile      … プロフィール・ポイント履歴・実績・特典
  ├─ /achievements … 全実績一覧
  └─ /notifications … 通知センター

[管理者] /admin（ダッシュボード）
  ├─ /admin/members    … 承認・拒否・権限変更
  ├─ /admin/scan       … QR スキャン来店付与
  ├─ /admin/events     … イベント作成
  ├─ /admin/tournament … トーナメント結果入力
  ├─ /admin/matches    … マッチ作成・精算
  ├─ /admin/shop       … アイテム CRUD・特典管理
  └─ /admin/points     … 手動ポイント調整
```

## 認証・権限

- **認証方式**: Google サインインのみ（`firebase/auth` + `GoogleAuthProvider`）
- **ステータス**: `pending` → 管理者承認 → `active`（`rejected` / `disabled` も存在）
- **ロール制御**: Firestore `users/{uid}.role`（`"admin"` / `"member"`）
- **管理者の初期設定**: Firebase Console から `role: "admin"` を直接書き込み

## ポイントシステム

- 通貨表記: `pt` ではなく 🪶（羽アイコン）
- ポイントは永続・マイナスなし
- 消費前に必ず残高チェック（`purchaseItem` / エントリー処理内）
- 全増減は `pointLogs` コレクションに記録（`type`: attendance / tournament / match / shop / manual）

## Firestore 操作の原則

詳細は `.claude/rules/firebase.md` を参照。

- 複数コレクションをまたぐ書き込みは必ず `writeBatch` を使用
- ランキング・通知は `onSnapshot` でリアルタイム更新
- ポイント増減は `increment()` で書き込む（read-modify-write 禁止）

## コンプライアンスルール

コード変更時は `.claude/rules/` の該当ルールを必ず確認すること。

| ファイル | 対象 |
|---|---|
| `security.md` | Firestore セキュリティルール・ACL |
| `firebase.md` | Firebase 操作パターン |
| `error-handling.md` | エラー処理方針 |
| `conventions.md` | コーディング規約・命名規則 |

## 開発コマンド

```bash
npm install          # 依存関係インストール
npm run dev          # 開発サーバー起動（port 5173）
npm run build        # プロダクションビルド
npm run preview      # ビルド結果のプレビュー
firebase deploy      # Firebase Hosting にデプロイ
firebase deploy --only firestore:rules  # ルールのみデプロイ
```

## 環境変数

`.env.example` をコピーして `.env` を作成し、Firebase プロジェクトの設定値を記入すること。

## 将来拡張（スコープ外）

- マルチサークル対応（SaaS 化）
- プッシュ通知（FCM）
- ブラックスワン飛距離アニメーション（ウィッシュリスト）
- カスタムアイコン（Firebase Storage）

## 外部タイマーアプリ連携（設計メモ）

**現状の拡張ポイント：**
- `Match.timerAppUrl?: string` — 外部タイマーアプリのセッションURLを記録するフィールド（実装済み）
- 管理マッチ画面の `TimerAppSection` コンポーネントがURL管理UIを担当
- メンバーのマッチ詳細でURLが設定されている場合にリンクボタンを表示

**連携を深めるために必要な作業：**
```
現状（フェーズ1・実装済み）:
  管理者が外部アプリのURLを手動貼り付け → ワンタップで開くだけ

フェーズ2（URLパラメータ連携）:
  外部アプリが ?players=N&entryFee=100 等のURLパラメータを受け付ければ
  createTimerAppUrl(match) 関数で自動生成できる
  → MatchesAdminPage.tsx の TimerAppSection に「セッション自動作成」ボタンを追加

フェーズ3（双方向同期）:
  外部アプリがAPIを公開、またはFirestoreプロジェクトを共有する場合
  → settleMatch() と連携してトーナメント結果を自動取込み可能
  → src/lib/firebase/timerAppSync.ts を新規作成して分離実装を推奨
```

**参考リポジトリ:** https://github.com/Kujo-n/ALLin-Timer
- 実績マスタの管理者編集
