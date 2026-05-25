import {
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'

const BATCH_LIMIT = 400

async function deleteCollection(collectionName: string): Promise<number> {
  const snapshot = await getDocs(collection(db, collectionName))
  if (snapshot.empty) return 0

  let deleted = 0
  let batch = writeBatch(db)
  let batchCount = 0

  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref)
    batchCount++
    deleted++

    if (batchCount >= BATCH_LIMIT) {
      await batch.commit()
      batch = writeBatch(db)
      batchCount = 0
    }
  }

  if (batchCount > 0) {
    await batch.commit()
  }

  return deleted
}

async function resetUserPoints(): Promise<number> {
  const snapshot = await getDocs(collection(db, 'users'))
  if (snapshot.empty) return 0

  let updated = 0
  let batch = writeBatch(db)
  let batchCount = 0

  for (const docSnap of snapshot.docs) {
    batch.update(docSnap.ref, {
      totalPoints: 0,
      yearPoints: 0,
      ownedPoints: 0,
      equippedTitle: null,
      equippedTitleTier: null,
      equippedFrame: null,
      equippedOverlay: null,
      equippedPointIcon: null,
      luckyHand: null,
      luckyHandExpiry: null,
    })
    batchCount++
    updated++

    if (batchCount >= BATCH_LIMIT) {
      await batch.commit()
      batch = writeBatch(db)
      batchCount = 0
    }
  }

  if (batchCount > 0) {
    await batch.commit()
  }

  return updated
}

export async function resetAllDataForProduction(): Promise<{
  users: number
  userAchievements: number
  matchResults: number
  attendances: number
  pointLogs: number
  notifications: number
  userBingoCards: number
  userItems: number
  userTitles: number
}> {
  console.log('=== 本番運用前データリセット開始 ===')

  const results = {
    users: 0,
    userAchievements: 0,
    matchResults: 0,
    attendances: 0,
    pointLogs: 0,
    notifications: 0,
    userBingoCards: 0,
    userItems: 0,
    userTitles: 0,
  }

  console.log('1. ユーザーポイント・装備リセット中...')
  results.users = await resetUserPoints()
  console.log(`   → ${results.users}件のユーザーをリセット`)

  console.log('2. userAchievements 削除中...')
  results.userAchievements = await deleteCollection('userAchievements')
  console.log(`   → ${results.userAchievements}件削除`)

  console.log('3. matchResults 削除中...')
  results.matchResults = await deleteCollection('matchResults')
  console.log(`   → ${results.matchResults}件削除`)

  console.log('4. attendances 削除中...')
  results.attendances = await deleteCollection('attendances')
  console.log(`   → ${results.attendances}件削除`)

  console.log('5. pointLogs 削除中...')
  results.pointLogs = await deleteCollection('pointLogs')
  console.log(`   → ${results.pointLogs}件削除`)

  console.log('6. notifications 削除中...')
  results.notifications = await deleteCollection('notifications')
  console.log(`   → ${results.notifications}件削除`)

  console.log('7. userBingoCards 削除中...')
  results.userBingoCards = await deleteCollection('userBingoCards')
  console.log(`   → ${results.userBingoCards}件削除`)

  console.log('8. userItems 削除中...')
  results.userItems = await deleteCollection('userItems')
  console.log(`   → ${results.userItems}件削除`)

  console.log('9. userTitles 削除中...')
  results.userTitles = await deleteCollection('userTitles')
  console.log(`   → ${results.userTitles}件削除`)

  console.log('=== リセット完了 ===')
  return results
}
