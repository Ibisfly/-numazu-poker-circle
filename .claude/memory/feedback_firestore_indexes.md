---
name: feedback-firestore-indexes
description: Firestoreで複合クエリを追加する際は必ずインデックスを確認・追加する
metadata:
  type: feedback
---

Firestoreで `where()` + `orderBy()` を使う複合クエリを追加・変更した場合、必ず `firestore.indexes.json` を確認・更新すること。

**Why:** 2026-05-14に `userBingoCards` のクエリが `assignedAt` を使っているのにインデックスが `purchasedAt` のままで、ビンゴカードが表示されない問題が発生した。インデックス不一致はサイレントに失敗するため発見が遅れる。

**How to apply:**
1. `subscribe*` や `getDocs` で `where` + `orderBy` を使う関数を追加/変更したら、`firestore.indexes.json` を確認
2. フィールド名が一致しているか確認（特にタイムスタンプ系: `createdAt`, `assignedAt`, `purchasedAt` など）
3. 新規インデックスを追加したら `firebase deploy --only firestore:indexes` を実行
4. インデックス構築には数分かかるため、デプロイ後すぐに動作確認しても失敗する可能性がある

**命名規則の統一案:**
- 作成日時: `createdAt`
- 配布/付与日時: `assignedAt`
- 購入日時: `purchasedAt`
- 使用日時: `usedAt`

[[conventions]]
