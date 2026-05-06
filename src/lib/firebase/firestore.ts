import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDocs,
  addDoc,
} from 'firebase/firestore'
import { db } from './config'
import type {
  User,
  Event,
  PointLog,
  Match,
  Item,
  UserItem,
  UserAchievement,
  Notification,
  PointLogType,
} from '@/types'

// ── Users ──────────────────────────────────────────────────────────────────

export const getUser = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as User) : null
}

export const createUser = (uid: string, data: Partial<User>) =>
  setDoc(doc(db, 'users', uid), {
    uid,
    bio: '',
    isBeginner: false,
    role: 'member',
    status: 'pending',
    totalPoints: 0,   // 累計（獲得のみ）
    yearPoints: 0,    // 年間（獲得のみ）
    ownedPoints: 0,   // 保有（現在残高）
    createdAt: serverTimestamp(),
    ...data,
  })

export const updateUser = (uid: string, data: Partial<User>) =>
  updateDoc(doc(db, 'users', uid), data as Record<string, unknown>)

export const subscribeUser = (uid: string, cb: (u: User | null) => void) =>
  onSnapshot(doc(db, 'users', uid), (snap) =>
    cb(snap.exists() ? (snap.data() as User) : null)
  )

export const isPlayerNameTaken = async (name: string): Promise<boolean> => {
  const q = query(collection(db, 'users'), where('playerName', '==', name))
  const snap = await getDocs(q)
  return !snap.empty
}

// ── Rankings ───────────────────────────────────────────────────────────────

export const subscribeRanking = (
  field: 'totalPoints' | 'yearPoints',
  cb: (users: User[]) => void
) =>
  onSnapshot(
    query(
      collection(db, 'users'),
      where('status', '==', 'active'),
      orderBy(field, 'desc')
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as User))
  )

// ── Point Logs ─────────────────────────────────────────────────────────────

export const subscribePointLogs = (
  uid: string,
  cb: (logs: PointLog[]) => void
) =>
  onSnapshot(
    query(
      collection(db, 'pointLogs'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PointLog)))
  )

export const addPointLog = async (
  uid: string,
  amount: number,
  type: PointLogType,
  description: string,
  createdBy: string,
  relatedId?: string
) => {
  const batch = writeBatch(db)
  const logRef = doc(collection(db, 'pointLogs'))
  batch.set(logRef, {
    uid,
    type,
    amount,
    description,
    relatedId: relatedId ?? null,
    createdAt: serverTimestamp(),
    createdBy,
  })
  // 保有は常に増減。累計・年間は獲得（正）のみカウント
  const pointUpdates: Record<string, unknown> = {
    ownedPoints: increment(amount),
  }
  if (amount > 0) {
    pointUpdates.totalPoints = increment(amount)
    pointUpdates.yearPoints = increment(amount)
  }
  batch.update(doc(db, 'users', uid), pointUpdates)
  await batch.commit()
}

// ── Events ─────────────────────────────────────────────────────────────────

export const subscribeEvents = (cb: (events: Event[]) => void) =>
  onSnapshot(
    query(collection(db, 'events'), orderBy('date', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)))
  )

export const createEvent = (data: Omit<Event, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'events'), { ...data, createdAt: serverTimestamp() })

// ── Matches ────────────────────────────────────────────────────────────────

export const subscribeMatches = (cb: (matches: Match[]) => void) =>
  onSnapshot(
    query(collection(db, 'matches'), orderBy('scheduledAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)))
  )

export const subscribeMatch = (matchId: string, cb: (m: Match | null) => void) =>
  onSnapshot(doc(db, 'matches', matchId), (snap) =>
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Match) : null)
  )

export const createMatch = (data: Omit<Match, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'matches'), { ...data, createdAt: serverTimestamp() })

export const updateMatch = (matchId: string, data: Partial<Match>) =>
  updateDoc(doc(db, 'matches', matchId), data as Record<string, unknown>)

export const deleteMatch = (matchId: string) =>
  deleteDoc(doc(db, 'matches', matchId))

// ── Shop ───────────────────────────────────────────────────────────────────

export const subscribeItems = (cb: (items: Item[]) => void) =>
  onSnapshot(
    query(collection(db, 'items'), orderBy('createdAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item)))
  )

export const subscribeUserItems = (
  uid: string,
  cb: (items: UserItem[]) => void
) =>
  onSnapshot(
    query(collection(db, 'userItems'), where('uid', '==', uid)),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserItem)))
  )

// 装飾品（永続）の購入
export const purchaseItem = async (
  uid: string,
  item: Item,
  currentPoints: number
) => {
  if (currentPoints < item.cost) throw new Error('残高不足')
  const batch = writeBatch(db)
  const userItemRef = doc(collection(db, 'userItems'))
  batch.set(userItemRef, {
    uid,
    itemId: item.id,
    category: item.category,
    purchasedAt: serverTimestamp(),
    usedAt: null,
    equipped: false,
  })
  const logRef = doc(collection(db, 'pointLogs'))
  batch.set(logRef, {
    uid,
    type: 'shop',
    amount: -item.cost,
    description: `${item.name} を購入`,
    relatedId: item.id,
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  // ショップ購入は保有のみ減少（累計・年間は変えない）
  batch.update(doc(db, 'users', uid), {
    ownedPoints: increment(-item.cost),
  })
  await batch.commit()
}

// 特典（消費アイテム）を指定枚数購入
export const purchaseBenefitItem = async (
  uid: string,
  item: Item,
  quantity: number,
  currentPoints: number
) => {
  const totalCost = item.cost * quantity
  if (currentPoints < totalCost) throw new Error('残高不足')
  const batch = writeBatch(db)

  // 枚数分 userItem を個別作成
  for (let i = 0; i < quantity; i++) {
    batch.set(doc(collection(db, 'userItems')), {
      uid,
      itemId: item.id,
      category: item.category,
      purchasedAt: serverTimestamp(),
      usedAt: null,
      equipped: false,
    })
  }

  const logRef = doc(collection(db, 'pointLogs'))
  batch.set(logRef, {
    uid,
    type: 'shop',
    amount: -totalCost,
    description: `${item.name} ×${quantity} を購入`,
    relatedId: item.id,
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  batch.update(doc(db, 'users', uid), {
    ownedPoints: increment(-totalCost),
  })
  await batch.commit()
}

// ── Achievements ───────────────────────────────────────────────────────────

export const subscribeUserAchievements = (
  uid: string,
  cb: (items: UserAchievement[]) => void
) =>
  onSnapshot(
    query(collection(db, 'userAchievements'), where('uid', '==', uid)),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserAchievement)))
  )

export const unlockAchievement = async (uid: string, achievementId: string) => {
  const existing = await getDocs(
    query(
      collection(db, 'userAchievements'),
      where('uid', '==', uid),
      where('achievementId', '==', achievementId)
    )
  )
  if (!existing.empty) return
  const batch = writeBatch(db)
  batch.set(doc(collection(db, 'userAchievements')), {
    uid,
    achievementId,
    unlockedAt: serverTimestamp(),
  })
  const notifRef = doc(collection(db, 'notifications'))
  batch.set(notifRef, {
    uid,
    type: 'achievement',
    message: `実績「${achievementId}」を解除しました！`,
    isRead: false,
    createdAt: serverTimestamp(),
  })
  await batch.commit()
}

// ── Notifications ──────────────────────────────────────────────────────────

export const subscribeNotifications = (
  uid: string,
  cb: (notifs: Notification[]) => void
) =>
  onSnapshot(
    query(
      collection(db, 'notifications'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    ),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)))
  )

export const markNotificationRead = (notifId: string) =>
  updateDoc(doc(db, 'notifications', notifId), { isRead: true })

export const markAllNotificationsRead = async (uid: string) => {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('uid', '==', uid),
      where('isRead', '==', false)
    )
  )
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }))
  await batch.commit()
}

// ── Admin: Members ─────────────────────────────────────────────────────────

export const subscribePendingUsers = (cb: (users: User[]) => void) =>
  onSnapshot(
    query(collection(db, 'users'), where('status', '==', 'pending')),
    (snap) => cb(snap.docs.map((d) => d.data() as User))
  )

export const subscribeAllUsers = (cb: (users: User[]) => void) =>
  onSnapshot(
    query(collection(db, 'users'), orderBy('createdAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => d.data() as User))
  )

export const approveUser = async (uid: string, _adminUid: string) => {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid), { status: 'active' })
  const notifRef = doc(collection(db, 'notifications'))
  batch.set(notifRef, {
    uid,
    type: 'approval',
    message: 'メンバー承認が完了しました。NUMAZU POKER CIRCLEへようこそ！',
    isRead: false,
    createdAt: serverTimestamp(),
  })
  await batch.commit()
}

export const rejectUser = (uid: string) =>
  updateDoc(doc(db, 'users', uid), { status: 'rejected' })

export const disableUser = (uid: string) =>
  updateDoc(doc(db, 'users', uid), { status: 'disabled' })

export const changeUserRole = (uid: string, role: 'admin' | 'member') =>
  updateDoc(doc(db, 'users', uid), { role })

// ── Admin: Attendance Scan ─────────────────────────────────────────────────

export const recordAttendance = async (
  eventId: string,
  scannedUid: string,
  pointAwarded: number,
  adminUid: string
) => {
  const existing = await getDocs(
    query(
      collection(db, 'attendances'),
      where('eventId', '==', eventId),
      where('uid', '==', scannedUid)
    )
  )
  if (!existing.empty) throw new Error('既にスキャン済みです')

  const batch = writeBatch(db)
  const attendRef = doc(collection(db, 'attendances'))
  batch.set(attendRef, {
    eventId,
    uid: scannedUid,
    pointAwarded,
    scannedAt: serverTimestamp(),
  })
  const logRef = doc(collection(db, 'pointLogs'))
  batch.set(logRef, {
    uid: scannedUid,
    type: 'attendance',
    amount: pointAwarded,
    description: '来店ポイント',
    relatedId: eventId,
    createdAt: serverTimestamp(),
    createdBy: adminUid,
  })
  batch.update(doc(db, 'users', scannedUid), {
    totalPoints: increment(pointAwarded),
    yearPoints: increment(pointAwarded),
    ownedPoints: increment(pointAwarded),
  })
  const notifRef = doc(collection(db, 'notifications'))
  batch.set(notifRef, {
    uid: scannedUid,
    type: 'point_awarded',
    message: `来店ポイント ${pointAwarded}pt が付与されました！`,
    isRead: false,
    createdAt: serverTimestamp(),
  })
  await batch.commit()
}

// ── Admin: Item CRUD ───────────────────────────────────────────────────────

export const createItem = (data: Omit<Item, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'items'), { ...data, createdAt: serverTimestamp() })

export const updateItem = (itemId: string, data: Partial<Item>) =>
  updateDoc(doc(db, 'items', itemId), data as Record<string, unknown>)

export const deleteItem = (itemId: string) =>
  deleteDoc(doc(db, 'items', itemId))

export const markItemUsed = (userItemId: string) =>
  updateDoc(doc(db, 'userItems', userItemId), {
    usedAt: serverTimestamp(),
  })

// ── Avatar color ───────────────────────────────────────────────────────────

export const equipAvatarColor = (uid: string, color: string) =>
  updateDoc(doc(db, 'users', uid), { avatarColor: color })

export const equipFrame = (uid: string, frameStyle: string | null) =>
  updateDoc(doc(db, 'users', uid), { equippedFrame: frameStyle })

export const equipOverlay = (uid: string, overlayId: string | null) =>
  updateDoc(doc(db, 'users', uid), { equippedOverlay: overlayId })

export const equipTitle = (uid: string, title: string, tier: string) =>
  updateDoc(doc(db, 'users', uid), { equippedTitle: title, equippedTitleTier: tier })

export const unequipTitle = (uid: string) =>
  updateDoc(doc(db, 'users', uid), { equippedTitle: null, equippedTitleTier: null })

// ── Admin: Match Settlement ────────────────────────────────────────────────

export const settleMatch = async (
  match: Match,
  rankings: { uid: string; rank: number }[],
  adminUid: string
) => {
  const batch = writeBatch(db)

  const resultRef = doc(collection(db, 'matchResults'))
  const rankingWithPoints = rankings.map(({ uid, rank }) => {
    const rule = match.distributionRules.find((r) => r.rank === rank)
    const earnedPoints = rule ? rule.points : 0
    return { uid, rank, earnedPoints }
  })

  batch.set(resultRef, {
    matchId: match.id,
    rankings: rankingWithPoints,
    settledAt: serverTimestamp(),
  })
  batch.update(doc(db, 'matches', match.id), { status: 'finished' })

  for (const { uid, rank, earnedPoints } of rankingWithPoints) {
    if (earnedPoints > 0) {
      const logRef = doc(collection(db, 'pointLogs'))
      batch.set(logRef, {
        uid,
        type: 'match',
        amount: earnedPoints,
        description: `${match.title} ${rank}位 賞金`,
        relatedId: match.id,
        createdAt: serverTimestamp(),
        createdBy: adminUid,
      })
      batch.update(doc(db, 'users', uid), {
        totalPoints: increment(earnedPoints),
        yearPoints: increment(earnedPoints),
        ownedPoints: increment(earnedPoints),
      })
    }
    const notifRef = doc(collection(db, 'notifications'))
    batch.set(notifRef, {
      uid,
      type: 'match_result',
      message: `${match.title} が終了しました。${rank}位 / 獲得 ${earnedPoints}pt`,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  }

  await batch.commit()
}

// ── Achievement Config（管理者が設定する報酬）─────────────────────────────

export interface AchievementReward {
  achievementId: string
  rewardType?: 'title' | 'item'
  rewardTitleText?: string
  rewardTitleTier?: string
  rewardItemId?: string
  updatedBy?: string
}

export const subscribeAchievementConfigs = (cb: (configs: AchievementReward[]) => void) =>
  onSnapshot(collection(db, 'achievementConfigs'), (snap) =>
    cb(snap.docs.map((d) => ({ achievementId: d.id, ...d.data() } as AchievementReward)))
  )

export const saveAchievementConfig = (config: AchievementReward, adminUid: string) => {
  // Firestore は undefined を書き込めないため、値が存在するフィールドだけを明示的に渡す
  const data: Record<string, unknown> = {
    achievementId: config.achievementId,
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  }
  if (config.rewardType)      data.rewardType      = config.rewardType
  if (config.rewardTitleText) data.rewardTitleText = config.rewardTitleText
  if (config.rewardTitleTier) data.rewardTitleTier = config.rewardTitleTier
  if (config.rewardItemId)    data.rewardItemId    = config.rewardItemId
  return setDoc(doc(db, 'achievementConfigs', config.achievementId), data)
}

// 実績を解除＋報酬を自動付与
export const unlockAchievementWithReward = async (uid: string, achievementId: string, achievementName: string) => {
  // 既解除チェック
  const existing = await getDocs(
    query(collection(db, 'userAchievements'), where('uid', '==', uid), where('achievementId', '==', achievementId))
  )
  if (!existing.empty) return false  // 既解除

  const batch = writeBatch(db)

  // 実績レコード
  batch.set(doc(collection(db, 'userAchievements')), {
    uid, achievementId, unlockedAt: serverTimestamp(),
  })

  // 通知
  const notifRef = doc(collection(db, 'notifications'))
  batch.set(notifRef, {
    uid, type: 'achievement',
    message: `実績「${achievementName}」を解除しました！`,
    isRead: false, createdAt: serverTimestamp(),
  })

  // 報酬チェック
  const configSnap = await getDoc(doc(db, 'achievementConfigs', achievementId))
  if (configSnap.exists()) {
    const config = configSnap.data() as AchievementReward
    if (config.rewardType === 'title' && config.rewardTitleText) {
      batch.update(doc(db, 'users', uid), {
        equippedTitle: config.rewardTitleText,
        equippedTitleTier: config.rewardTitleTier ?? 'common',
      })
    }
    if (config.rewardType === 'item' && config.rewardItemId) {
      const itemRef = doc(collection(db, 'userItems'))
      batch.set(itemRef, {
        uid, itemId: config.rewardItemId, category: 'cosmetic',
        purchasedAt: serverTimestamp(), usedAt: null, equipped: false,
      })
    }
  }

  await batch.commit()
  return true  // 新規解除
}

// 実績条件チェック（イベント後に呼び出す）
export const checkAndUnlockAchievements = async (uid: string) => {
  const [logsSnap, achievedSnap, userItemsSnap, resultsSnap, matchesSnap, userSnap] = await Promise.all([
    getDocs(query(collection(db, 'pointLogs'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'userAchievements'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'userItems'), where('uid', '==', uid))),
    getDocs(collection(db, 'matchResults')),
    getDocs(collection(db, 'matches')),
    getDoc(doc(db, 'users', uid)),
  ])

  const alreadyUnlocked = new Set(achievedSnap.docs.map((d) => d.data().achievementId as string))
  const logs = logsSnap.docs.map((d) => d.data())
  const userItemsData = userItemsSnap.docs.map((d) => d.data())
  const userData = userSnap.data()
  const matchMap = new Map(matchesSnap.docs.map((d) => [d.id, d.data()]))

  const attendanceCount = logs.filter((l) => l.type === 'attendance').length
  const shopPurchaseCount = userItemsData.length
  const totalPoints = userData?.totalPoints ?? 0

  let tournamentEntries = 0, tournamentWins = 0, tournamentTop3 = 0, tournamentConsecutiveWins = 0
  let matchEntries = 0, matchWins = 0

  for (const doc of resultsSnap.docs) {
    const result = doc.data()
    const match = matchMap.get(result.matchId)
    if (!match) continue

    if (match.matchCategory === 'ring') {
      const cb: { uid: string }[] = result.cashbacks ?? []
      if (cb.find((c) => c.uid === uid)) matchEntries++
      const ranks: { uid: string; rank: number }[] = result.rankings ?? []
      const e = ranks.find((r) => r.uid === uid)
      if (e?.rank === 1) matchWins++
    } else {
      const rankings: { uid: string; rank: number; earnedPoints: number }[] = result.rankings ?? []
      const e = rankings.find((r) => r.uid === uid)
      if (e) {
        tournamentEntries++
        if (e.rank === 1) { tournamentWins++; tournamentConsecutiveWins++ } else tournamentConsecutiveWins = 0
        if (e.earnedPoints > 0) tournamentTop3++
      }
    }
  }

  const CONDITIONS: { id: string; name: string; met: boolean }[] = [
    { id: 'first_attendance',  name: 'はじめの一羽',   met: attendanceCount >= 1 },
    { id: 'regular_10',        name: '常連の翼',       met: attendanceCount >= 10 },
    { id: 'legend_30',         name: '伝説の黒鳥',     met: attendanceCount >= 30 },
    { id: 'tournament_first',  name: 'フライトビギナー', met: tournamentEntries >= 1 },
    { id: 'podium',            name: '表彰台',          met: tournamentTop3 >= 1 },
    { id: 'champion',          name: '王者の羽',        met: tournamentWins >= 1 },
    { id: 'consecutive_win',   name: '連覇の飛翔',      met: tournamentConsecutiveWins >= 2 },
    { id: 'match_debut',       name: 'マッチデビュー',  met: matchEntries >= 1 },
    { id: 'match_hunter',      name: 'ハンター',         met: matchWins >= 1 },
    { id: 'collector',         name: 'コレクター',      met: shopPurchaseCount >= 5 },
    { id: 'millionaire',       name: '大富豪の羽',      met: totalPoints >= 10000 },
  ]

  const unlocked: string[] = []
  for (const c of CONDITIONS) {
    if (c.met && !alreadyUnlocked.has(c.id)) {
      const isNew = await unlockAchievementWithReward(uid, c.id, c.name)
      if (isNew) unlocked.push(c.id)
    }
  }
  return unlocked
}

// ── Admin: Ring Game Settlement ────────────────────────────────────────────

export const settleRingGame = async (
  match: Match,
  cashbacks: { uid: string; amount: number }[],
  adminUid: string
) => {
  const batch = writeBatch(db)

  const resultRef = doc(collection(db, 'matchResults'))
  batch.set(resultRef, {
    matchId: match.id,
    cashbacks,
    settledAt: serverTimestamp(),
  })
  batch.update(doc(db, 'matches', match.id), { status: 'finished' })

  for (const { uid, amount } of cashbacks) {
    if (amount > 0) {
      const logRef = doc(collection(db, 'pointLogs'))
      batch.set(logRef, {
        uid,
        type: 'match',
        amount,
        description: `${match.title} キャッシュバック`,
        relatedId: match.id,
        createdAt: serverTimestamp(),
        createdBy: adminUid,
      })
      batch.update(doc(db, 'users', uid), {
        totalPoints: increment(amount),
        yearPoints:  increment(amount),
        ownedPoints: increment(amount),
      })
    }
    const notifRef = doc(collection(db, 'notifications'))
    batch.set(notifRef, {
      uid,
      type: 'match_result',
      message: `${match.title} が終了しました。キャッシュバック: ${amount}pt`,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  }

  await batch.commit()
}

export { Timestamp, serverTimestamp }
