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

## ALL IN CLOCK（内蔵ライブタイマー / トーナメント表）

`/timer` 以下は**会員アプリとは別物として設計された、ログイン不要の公開アプリ**。
外部ディーラーやゲスト参加者に Google 認証を要求せずに使わせるのが目的。

### 画面

| ルート | 内容 |
|---|---|
| `/timer` | トップ。作成導線・自分の部屋・プリセット管理 |
| `/timer/new` | タイマー作成（ストラクチャー生成・編集） |
| `/timer/new-bracket` | トーナメント表作成（ヘッズアップ / 3on3） |
| `/timer/t/:id` | ライブタイマー（閲覧は誰でも / 操作は操作キー保持者のみ） |
| `/timer/b/:id` | トーナメント表（同上） |

### 権限モデル（重要）

会員ロールでは守っていない。`firestore.rules` で以下を実装している。

- **閲覧**: `allow read: if true`（リンクを踏んだ全員が進行状況を見られるという要件）
- **操作**: `liveTimers/{id}/admins/{uid}` が存在する端末のみ
  - 操作キーは読み取り禁止の `liveTimers/{id}/secret/control` に置く
  - `admins/{uid}` の作成時に**ルール内の `get()` でキーを照合**する
    （ルール内の `get()` はセキュリティルールを迂回して読めるため、キーはクライアントに漏れない）
- 操作キーは URL の**ハッシュ**に載せる（`#k=...`）。読み取り直後に `replaceState` で消し、
  localStorage に退避する（画面共有・スクショでの漏洩防止）

**匿名サインインは「部屋を作る」「操作キーで操作権を得る」ときだけ呼ぶ。**
閲覧者に匿名アカウントを作らせると、会員アプリ側で未登録ゲスト扱いになり
`/register` に流れてしまうため、閲覧経路からは `ensureAuthUid()` を呼ばない。

### タイマーの時間管理

- 秒単位のカウントダウンは **Firestore に書かない**。`levelEndsAt`（レベル終了時刻）だけを持ち、
  各クライアントが `projectRunning()` でローカル計算する（書き込みは状態変化時のみ）
- 操作端末は `clockPings/{uid}` に `serverTimestamp` を書いて読み返し、端末時計のズレを実測補正する
- 操作端末がスリープしていても閲覧側が正しいレベルに追いつけるよう、
  `projectRunning()` は 0 を割り込んだ分を次レベルへ繰り越して前進させる
  （Firestore への書き戻しは操作権を持つ端末だけが行う）

### ファイル構成

```
src/lib/liveTimer/
├── access.ts     # 匿名認証・操作キー照合・時刻補正・URL生成
├── firestore.ts  # liveTimers / liveBrackets の CRUD と操作
├── structure.ts  # ストラクチャーの純粋関数（生成・投影・平均スタック）
├── bracket.ts    # シングルエリミネーションの純粋関数
├── presets.ts    # プリセット・部屋履歴（localStorage）
└── runtime.ts    # 効果音・Wake Lock・全画面・クリップボード
src/pages/timer/  # 5画面 + StructureEditor + shared
src/styles/timer.css  # 専用デザインシステム（Tailwind に寄せない／黒・グレー禁止）
```

### デザイン方針

会員アプリ（swan パレット・黒基調・角丸2px）とは**意図的に別の見た目**にしている。

- 背景は「カードルームのフェルト（深緑）」と「アイボリー紙」の2系統。**黒・グレーは使わない**
- 状態で画面全体の色温度が変わる（通常=緑 / 休憩=琥珀 / 残り1分=テラコッタ）
- 見出しは Bodoni Moda、数字は Oswald、日本語は Noto Sans JP
- テーマは `[data-tm-theme]`、状態は `[data-tm-phase]` で切り替える

### 会員アプリとの連携

`MatchesAdminPage` の `TimerAppSection` から、マッチの情報（タイトル・参加者数・matchId）を
クエリで引き継いで `/timer/new` に飛べる。旧来の外部タイマー（`timerAppUrl` /
`timerSessionId` / `getTimerProvisionalRankings`）はレガシーとして残してある。

**参考リポジトリ:** https://github.com/Kujo-n/ALLin-Timer
