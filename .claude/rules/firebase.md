---
name: Firebase操作パターン
description: Firestoreの読み書き・認証に関するルールとベストプラクティス
type: coding-rules
scope: src/lib/firebase/**, src/pages/**
---

## 複数コレクションの書き込み

複数ドキュメントをまたぐ書き込みは**必ず `writeBatch` を使用**すること。
ポイント付与・消費・通知送信など副作用を伴う処理はすべてバッチで原子的に行う。

```ts
// NG: 個別 setDoc を並列実行
await setDoc(...)
await updateDoc(...)

// OK: writeBatch で原子的に
const batch = writeBatch(db)
batch.set(...)
batch.update(...)
await batch.commit()
```

## ポイント増減

ポイントの増減は `increment()` を使用し、read-modify-write を禁止する。

```ts
// NG: 現在値を読んで計算して書く
const user = await getDoc(...)
await updateDoc(ref, { totalPoints: user.data().totalPoints + 50 })

// OK: increment を使う
batch.update(doc(db, 'users', uid), {
  totalPoints: increment(50),
  yearPoints: increment(50),
})
```

## リアルタイムリスナー

`onSnapshot` のアンサブスクライブは必ず返り値を `useEffect` の cleanup で実行する。

```ts
useEffect(() => {
  const unsub = onSnapshot(query(...), callback)
  return unsub  // cleanup
}, [uid])
```

## セキュリティルール

`firestore.rules` で ACL を実装する。クライアントサイドのロールチェックは UX 用途のみ（信頼しない）。
管理者専用操作はすべてサーバーサイドルールで `isAdmin()` によりガードされていること。

## 環境変数

Firebase 設定値は `VITE_FIREBASE_*` プレフィックスの環境変数から読み込む。
ハードコードは禁止。`.env` は `.gitignore` に含める。
