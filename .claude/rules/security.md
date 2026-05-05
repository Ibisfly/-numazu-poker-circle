---
name: セキュリティルール
description: Firestoreセキュリティ・ACL・認証に関するセキュリティ要件
type: security-rules
scope: firestore.rules, src/**
---

## ロールベースアクセス制御

- Firestore の ACL は `firestore.rules` で実装する
- クライアント側のロールチェック（`user.role === 'admin'`）は **UX 用途のみ**。実際の保護はルールで行う
- 管理者ロールの付与・変更は管理者のみ可能（`users/{uid}.role` の直接変更はルールで禁止）

## ユーザーステータス

- `status: pending` のユーザーはアプリ機能にアクセス不可（`RequireAuth` でガード）
- `status: disabled` / `rejected` は即座にログアウト扱い
- `status` フィールドはユーザー自身が変更不可（`firestore.rules` で制御）

## ポイント操作の整合性

- ポイントの付与・消費はすべて `pointLogs` への記録とセットで行う（バッチ書き込み）
- 消費前に必ず残高チェックを実施する
- 手動調整には必ず理由（`description`）を記録する

## Firestore セキュリティルールの原則

1. デフォルト拒否（`allow` がない限り拒否）
2. `isActiveUser()` で `status: active` チェックを含める
3. 管理者操作は `isAdmin()` でガード
4. ユーザー自身のデータ変更は変更可能フィールドを明示的に制限する

## 機密情報

- Firebase 設定キーは `.env` で管理し `.gitignore` に含める
- `.env` をコミットしない
