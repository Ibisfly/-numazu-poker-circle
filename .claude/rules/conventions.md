---
name: コーディング規約・命名規則
description: ファイル構成・命名・スタイリングに関する規約
type: coding-rules
scope: src/**
---

## コンポーネント

- ページコンポーネントは `src/pages/{auth|member|admin}/` に配置し、`PascalCasePage.tsx` で命名
- 再利用コンポーネントは `src/components/{layout|ui|auth}/` に配置
- named export を使用（`export const Foo = ...`）。default export は使わない

## 命名

- 型は `PascalCase`（`User`, `PointLog`, `Match`）
- Firebase 操作関数は動詞始まり camelCase（`subscribeUser`, `addPointLog`, `recordAttendance`）
- フック名は `use` 始まり（`useAuth`）

## スタイリング

- Tailwind CSS のユーティリティクラスのみ使用
- カスタムカラーは `tailwind.config.js` の `swan` パレットを使用
  - `swan-black` / `swan-dark` / `swan-card` / `swan-border` / `swan-muted`
  - `swan-accent`（ゴールド系：CTA・ハイライト）
  - `swan-text` / `swan-sub`（テキスト）
- モバイルファースト設計。`max-w-md mx-auto` でセンタリング

## ポイント表示

- ポイントは `🪶` アイコンを使用。`pt` 表記は禁止
- 数値は `toLocaleString()` で3桁カンマ区切り表示

## 型定義

- Firestore ドキュメント型はすべて `src/types/index.ts` に集約
- `Timestamp` 型は `firebase/firestore` からインポート。`Date` に変換は `.toDate()` を使用

## コメント

- コメントは「なぜ」を書く。「何をしているか」はコードで読める場合は不要
- TODO は `// TODO:` プレフィックスで明記

## テスト

- 初期リリースはテストなし（将来: Vitest + Testing Library）
- ビジネスロジック（ポイント計算・実績判定）は純粋関数化して後からテスト追加できるよう設計する
