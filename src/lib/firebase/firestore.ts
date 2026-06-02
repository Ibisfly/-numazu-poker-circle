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
  BingoCard,
  UserBingoCard,
  BingoMissionTemplate,
  EventParticipantSummary,
  TournamentResultSummary,
  RingResultSummary,
  BingoResultSummary,
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
  relatedId?: string,
  target: 'both' | 'owned' | 'total' = 'both'
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

  const pointUpdates: Record<string, unknown> = {}

  if (target === 'both') {
    pointUpdates.ownedPoints = increment(amount)
    if (amount > 0) {
      pointUpdates.totalPoints = increment(amount)
      pointUpdates.yearPoints = increment(amount)
    }
  } else if (target === 'owned') {
    pointUpdates.ownedPoints = increment(amount)
  } else if (target === 'total') {
    pointUpdates.totalPoints = increment(amount)
    pointUpdates.yearPoints = increment(amount)
  }

  if (Object.keys(pointUpdates).length > 0) {
    batch.update(doc(db, 'users', uid), pointUpdates)
  }
  await batch.commit()
}

// ── Events ─────────────────────────────────────────────────────────────────

export const subscribeEvents = (cb: (events: Event[]) => void) =>
  onSnapshot(
    query(collection(db, 'events'), orderBy('date', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)))
  )

export const createEvent = (data: Omit<Event, 'id' | 'createdAt' | 'status'>) =>
  addDoc(collection(db, 'events'), { ...data, status: 'scheduled', createdAt: serverTimestamp() })

export const updateEvent = (eventId: string, data: Partial<Omit<Event, 'id' | 'createdAt' | 'createdBy'>>) =>
  updateDoc(doc(db, 'events', eventId), data as Record<string, unknown>)

export const deleteEvent = (eventId: string) =>
  deleteDoc(doc(db, 'events', eventId))

export const startEvent = (eventId: string) =>
  updateDoc(doc(db, 'events', eventId), { status: 'active' })

export const subscribeActiveEvents = (cb: (events: Event[]) => void) =>
  onSnapshot(
    query(collection(db, 'events'), where('status', '==', 'active'), orderBy('date', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)))
  )

export const finishEvent = async (eventId: string, adminUid: string) => {
  const eventSnap = await getDoc(doc(db, 'events', eventId))
  if (!eventSnap.exists()) throw new Error('イベントが見つかりません')
  const event = { id: eventSnap.id, ...eventSnap.data() } as Event

  // 参加者（来店者）を取得
  const attendancesSnap = await getDocs(
    query(collection(db, 'attendances'), where('eventId', '==', eventId))
  )
  const participantUids = [...new Set(attendancesSnap.docs.map((d) => d.data().uid as string))]

  if (participantUids.length === 0) {
    await updateDoc(doc(db, 'events', eventId), {
      status: 'finished',
      finishedAt: serverTimestamp(),
    })
    return
  }

  // このイベントに紐づくマッチを取得
  const matchesSnap = await getDocs(
    query(collection(db, 'matches'), where('eventId', '==', eventId))
  )
  const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Match))

  // マッチ結果を取得
  const matchIds = matches.map((m) => m.id)
  const resultsSnap = matchIds.length > 0
    ? await getDocs(collection(db, 'matchResults'))
    : { docs: [] }
  type MatchResultDoc = {
    id: string
    matchId: string
    rankings?: { uid: string; rank: number; earnedPoints: number }[]
    cashbacks?: { uid: string; amount: number }[]
  }
  const matchResults: MatchResultDoc[] = resultsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MatchResultDoc))
    .filter((r) => matchIds.includes(r.matchId))

  // このイベントで配布されたビンゴカードを取得
  const bingoCardsSnap = await getDocs(
    query(collection(db, 'userBingoCards'), where('eventId', '==', eventId))
  )
  const userBingoCards = bingoCardsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as UserBingoCard))

  // バッチを分割して処理（Firestoreは500操作が上限）
  type BatchOp = { type: 'set' | 'update'; ref: ReturnType<typeof doc>; data: Record<string, unknown> }
  const operations: BatchOp[] = []

  // 未終了のビンゴカードを強制終了してポイント付与
  for (const card of userBingoCards) {
    if (card.finishedAt) continue

    const completedCellCount = card.completedCells.filter((c) => c !== 12).length
    const bingoLineCount = card.claimedBingoLines.length
    const isFullCompletion = card.completedCells.length === 25

    let totalPoints = 0
    const pointBreakdown: string[] = []

    const cellPoints = completedCellCount * card.pointsPerCell
    if (cellPoints > 0) {
      totalPoints += cellPoints
      pointBreakdown.push(`マス達成(${completedCellCount}マス): ${cellPoints}pt`)
    }
    if (bingoLineCount > 0 && card.pointsPerBingo > 0) {
      totalPoints += card.pointsPerBingo
      pointBreakdown.push(`初BINGO: ${card.pointsPerBingo}pt`)
    }
    if (isFullCompletion && (card.pointsForCompletion ?? 0) > 0) {
      totalPoints += card.pointsForCompletion ?? 0
      pointBreakdown.push(`全埋め: ${card.pointsForCompletion}pt`)
    }

    operations.push({
      type: 'update',
      ref: doc(db, 'userBingoCards', card.id),
      data: { finishedAt: serverTimestamp() },
    })

    if (totalPoints > 0) {
      operations.push({
        type: 'set',
        ref: doc(collection(db, 'pointLogs')),
        data: {
          uid: card.uid,
          type: 'manual',
          amount: totalPoints,
          description: `ビンゴ「${card.bingoCardName}」イベント終了時自動精算 (${pointBreakdown.join(' / ')})`,
          relatedId: card.id,
          createdAt: serverTimestamp(),
          createdBy: adminUid,
        },
      })
      operations.push({
        type: 'update',
        ref: doc(db, 'users', card.uid),
        data: {
          totalPoints: increment(totalPoints),
          yearPoints: increment(totalPoints),
          ownedPoints: increment(totalPoints),
        },
      })
    }
  }

  // 参加者ごとにサマリーを作成
  for (const uid of participantUids) {
    const attendance = attendancesSnap.docs.find((d) => d.data().uid === uid)
    const attendancePoints = attendance?.data().pointAwarded ?? 0

    // トーナメント成績
    const tournamentResults: TournamentResultSummary[] = []
    for (const match of matches.filter((m) => m.matchCategory === 'tournament')) {
      const result = matchResults.find((r) => r.matchId === match.id)
      if (!result || !result.rankings) continue
      const ranking = result.rankings.find((r) => r.uid === uid)
      if (ranking) {
        tournamentResults.push({
          matchId: match.id,
          title: match.title,
          rank: ranking.rank,
          earnedPoints: ranking.earnedPoints,
        })
      }
    }

    // リング成績
    const ringResults: RingResultSummary[] = []
    for (const match of matches.filter((m) => m.matchCategory === 'ring')) {
      const result = matchResults.find((r) => r.matchId === match.id)
      if (!result || !result.cashbacks) continue
      const cb = result.cashbacks.find((c) => c.uid === uid)
      if (cb) {
        const rebuyCount = match.rebuys?.[uid] ?? 0
        const rebuyFee = match.rebuyFee ?? match.entryFee
        const totalEntryFee = match.entryFee + rebuyCount * rebuyFee
        ringResults.push({
          matchId: match.id,
          title: match.title,
          entryFee: totalEntryFee,
          cashback: cb.amount,
          netPoints: cb.amount - totalEntryFee,
        })
      }
    }

    // ビンゴ成績
    const bingoResults: BingoResultSummary[] = []
    for (const card of userBingoCards.filter((c) => c.uid === uid)) {
      const completedCellCount = card.completedCells.filter((c) => c !== 12).length
      const bingoLineCount = card.claimedBingoLines.length
      const isFullCompletion = card.completedCells.length === 25

      let earnedPoints = completedCellCount * card.pointsPerCell
      if (bingoLineCount > 0) earnedPoints += card.pointsPerBingo
      if (isFullCompletion) earnedPoints += card.pointsForCompletion ?? 0

      bingoResults.push({
        bingoCardId: card.bingoCardId,
        name: card.bingoCardName,
        completedCells: completedCellCount,
        bingoCount: bingoLineCount,
        earnedPoints,
      })
    }

    const totalEarnedPoints = attendancePoints +
      tournamentResults.reduce((s, r) => s + r.earnedPoints, 0) +
      ringResults.reduce((s, r) => s + r.netPoints, 0) +
      bingoResults.reduce((s, r) => s + r.earnedPoints, 0)

    const summary: Omit<EventParticipantSummary, 'id'> = {
      eventId,
      eventTitle: event.title,
      uid,
      attendancePoints,
      tournamentResults,
      ringResults,
      bingoResults,
      totalEarnedPoints,
      isRead: false,
      createdAt: serverTimestamp() as Timestamp,
    }
    operations.push({
      type: 'set',
      ref: doc(collection(db, 'eventParticipantSummaries')),
      data: summary,
    })

    // 通知
    operations.push({
      type: 'set',
      ref: doc(collection(db, 'notifications')),
      data: {
        uid,
        type: 'point_awarded',
        message: `「${event.title}」が終了しました。本日の成績をホームで確認できます。`,
        isRead: false,
        createdAt: serverTimestamp(),
      },
    })
  }

  // イベントを終了
  operations.push({
    type: 'update',
    ref: doc(db, 'events', eventId),
    data: { status: 'finished', finishedAt: serverTimestamp() },
  })

  // バッチを450操作ごとに分割して実行
  const BATCH_LIMIT = 450
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    const chunk = operations.slice(i, i + BATCH_LIMIT)
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data)
      } else {
        batch.update(op.ref, op.data)
      }
    }
    await batch.commit()
  }
}

export const subscribeUnreadEventSummaries = (uid: string, cb: (summaries: EventParticipantSummary[]) => void) =>
  onSnapshot(
    query(
      collection(db, 'eventParticipantSummaries'),
      where('uid', '==', uid),
      where('isRead', '==', false)
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventParticipantSummary)))
  )

export const markEventSummaryAsRead = (summaryId: string) =>
  updateDoc(doc(db, 'eventParticipantSummaries', summaryId), { isRead: true })

export const subscribeUserEventSummaries = (uid: string, cb: (summaries: EventParticipantSummary[]) => void) =>
  onSnapshot(
    query(
      collection(db, 'eventParticipantSummaries'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventParticipantSummary)))
  )

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

export const subscribeAchievementStats = (
  cb: (stats: Map<string, { count: number; total: number }>) => void
) => {
  let memberUids: string[] = []
  let achievementsByUser: Map<string, string[]> = new Map()

  const recalculate = () => {
    const newStats = new Map<string, { count: number; total: number }>()
    const total = memberUids.length

    const achievementCounts = new Map<string, number>()
    for (const uid of memberUids) {
      const userAchievements = achievementsByUser.get(uid) || []
      for (const achId of userAchievements) {
        achievementCounts.set(achId, (achievementCounts.get(achId) || 0) + 1)
      }
    }

    for (const [achId, count] of achievementCounts) {
      newStats.set(achId, { count, total })
    }

    cb(newStats)
  }

  const unsub1 = onSnapshot(
    query(collection(db, 'users'), where('role', '==', 'member'), where('status', '==', 'active')),
    (snap) => {
      memberUids = snap.docs.map((d) => d.id)
      recalculate()
    }
  )

  const unsub2 = onSnapshot(
    collection(db, 'userAchievements'),
    (snap) => {
      achievementsByUser = new Map()
      for (const doc of snap.docs) {
        const data = doc.data()
        const uid = data.uid as string
        const achId = data.achievementId as string
        if (!achievementsByUser.has(uid)) {
          achievementsByUser.set(uid, [])
        }
        achievementsByUser.get(uid)!.push(achId)
      }
      recalculate()
    }
  )

  return () => {
    unsub1()
    unsub2()
  }
}

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

export const subscribeActiveUsers = (cb: (users: User[]) => void) =>
  onSnapshot(
    query(collection(db, 'users'), where('status', '==', 'active'), orderBy('playerName')),
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

// ── Lucky Hand Generation ──────────────────────────────────────────────────

const generateLuckyHand = (): string => {
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
  const pocketPairs = ranks.map(r => `${r}${r}`)
  const suitedHands: string[] = []
  for (let i = 0; i < ranks.length; i++) {
    for (let j = i + 1; j < ranks.length; j++) {
      suitedHands.push(`${ranks[i]}${ranks[j]}s`)
    }
  }
  const allHands = [...pocketPairs, ...suitedHands]
  return allHands[Math.floor(Math.random() * allHands.length)]
}

const getMidnightExpiry = (): Timestamp => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(23, 59, 59, 999)
  return Timestamp.fromDate(midnight)
}

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

  const luckyHand = generateLuckyHand()
  const luckyHandExpiry = getMidnightExpiry()

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
    luckyHand,
    luckyHandExpiry,
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

export const equipPointIcon = (uid: string, pointIconId: string | null) =>
  updateDoc(doc(db, 'users', uid), { equippedPointIcon: pointIconId })

export const equipAvatarVariant = (uid: string, variantId: string | null) =>
  updateDoc(doc(db, 'users', uid), { avatarVariant: variantId })

// カスタムハンド称号の購入（複数回購入可能）
export const purchaseCustomHandTitle = async (
  uid: string,
  item: Item,
  handValue: string,
  currentPoints: number
) => {
  if (currentPoints < item.cost) throw new Error('残高不足')
  if (!handValue.trim()) throw new Error('ハンドを入力してください')

  const batch = writeBatch(db)
  const userItemRef = doc(collection(db, 'userItems'))
  batch.set(userItemRef, {
    uid,
    itemId: item.id,
    category: item.category,
    purchasedAt: serverTimestamp(),
    usedAt: null,
    equipped: false,
    customValue: handValue.trim().toUpperCase(),
  })
  const logRef = doc(collection(db, 'pointLogs'))
  batch.set(logRef, {
    uid,
    type: 'shop',
    amount: -item.cost,
    description: `マイハンドは"${handValue.trim().toUpperCase()}" を購入`,
    relatedId: item.id,
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  batch.update(doc(db, 'users', uid), {
    ownedPoints: increment(-item.cost),
  })
  await batch.commit()
}

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

// ── Yearly Rankings ────────────────────────────────────────────────────────

export const subscribeYearlyRankings = (
  cb: (snapshots: import('@/types').YearlyRankingSnapshot[]) => void
) =>
  onSnapshot(
    query(collection(db, 'yearlyRankings'), orderBy('year', 'desc')),
    (snap) =>
      cb(snap.docs.map((d) => d.data() as import('@/types').YearlyRankingSnapshot))
  )

// 年間ランキング確定：スナップショット保存 → 1位に称号付与 → yearPoints全リセット
export const resetYearlyPoints = async (adminUid: string, year: number) => {
  const usersSnap = await getDocs(
    query(
      collection(db, 'users'),
      where('status', '==', 'active'),
      orderBy('yearPoints', 'desc')
    )
  )
  if (usersSnap.empty) return null

  const users = usersSnap.docs.map((d) => d.data() as User)
  const winner = users[0]

  const batch = writeBatch(db)

  // 年間スナップショットを保存
  batch.set(doc(db, 'yearlyRankings', String(year)), {
    year,
    rankings: users.map((u, i) => ({
      rank: i + 1,
      uid: u.uid,
      playerName: u.playerName,
      yearPoints: u.yearPoints,
    })),
    settledBy: adminUid,
    settledAt: serverTimestamp(),
  })

  // 全ユーザーの yearPoints をリセット
  for (const userDoc of usersSnap.docs) {
    batch.update(userDoc.ref, { yearPoints: 0 })
  }

  await batch.commit()

  // 1位ユーザーに年間王者実績を付与（yearPoints > 0 の場合のみ）
  if (winner.yearPoints > 0) {
    await unlockAchievementWithReward(winner.uid, 'annual_champion', '年間王者')
  }

  return { winner, totalParticipants: users.length }
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
      // 自動装備せず userTitles コレクションに保存 → プロフィールで任意に装備
      const titleRef = doc(collection(db, 'userTitles'))
      batch.set(titleRef, {
        uid,
        title: config.rewardTitleText,
        tier: config.rewardTitleTier ?? 'common',
        achievementId,
        acquiredAt: serverTimestamp(),
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

// ── User Titles（実績報酬の称号）──────────────────────────────────────────

export const subscribeUserTitles = (
  uid: string,
  cb: (titles: import('@/types').UserTitle[]) => void
) =>
  onSnapshot(
    query(collection(db, 'userTitles'), where('uid', '==', uid)),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as import('@/types').UserTitle)))
  )

// ── Rebuy / Reentry ────────────────────────────────────────────────────────

export const performRebuy = async (match: Match, uid: string) => {
  const batch = writeBatch(db)
  batch.update(doc(db, 'matches', match.id), {
    [`rebuys.${uid}`]: increment(1),
  } as Record<string, unknown>)
  const logRef = doc(collection(db, 'pointLogs'))
  batch.set(logRef, {
    uid,
    type: 'match',
    amount: -match.entryFee,
    description: `${match.title} リバイ費`,
    relatedId: match.id,
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  batch.update(doc(db, 'users', uid), {
    totalPoints: increment(-match.entryFee),
    yearPoints:  increment(-match.entryFee),
    ownedPoints: increment(-match.entryFee),
  })
  await batch.commit()
}

export const performReentry = async (match: Match, uid: string) => {
  const batch = writeBatch(db)
  batch.update(doc(db, 'matches', match.id), {
    [`reentries.${uid}`]: increment(1),
  } as Record<string, unknown>)
  const logRef = doc(collection(db, 'pointLogs'))
  batch.set(logRef, {
    uid,
    type: 'match',
    amount: -match.entryFee,
    description: `${match.title} リエントリー費`,
    relatedId: match.id,
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  batch.update(doc(db, 'users', uid), {
    totalPoints: increment(-match.entryFee),
    yearPoints:  increment(-match.entryFee),
    ownedPoints: increment(-match.entryFee),
  })
  await batch.commit()
}

// 実績条件チェック（精算・来店・購入後に呼び出す）
export const checkAndUnlockAchievements = async (uid: string) => {
  const [achievedSnap, userItemsSnap, resultsSnap, matchesSnap, userSnap, attendancesSnap] = await Promise.all([
    getDocs(query(collection(db, 'userAchievements'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'userItems'), where('uid', '==', uid))),
    getDocs(collection(db, 'matchResults')),
    getDocs(collection(db, 'matches')),
    getDoc(doc(db, 'users', uid)),
    getDocs(query(collection(db, 'attendances'), where('uid', '==', uid))),
  ])

  const alreadyUnlocked = new Set(achievedSnap.docs.map((d) => d.data().achievementId as string))
  const userData = userSnap.data()
  const matchMap = new Map(matchesSnap.docs.map((d) => [d.id, d.data()]))

  const attendanceCount = attendancesSnap.size
  const shopPurchaseCount = userItemsSnap.size
  const totalPoints = userData?.totalPoints ?? 0

  let tournamentEntries = 0
  let tournamentWins = 0
  let tournamentTop = 0
  let tournamentTotalPoints = 0
  let ringEntries = 0
  let ringEarnedTotal = 0
  let hasNearMiss = false
  let hasBigRingWin = false
  let hasBigLoss = false

  for (const resultDoc of resultsSnap.docs) {
    const result = resultDoc.data()
    const match = matchMap.get(result.matchId)
    if (!match) continue

    if (match.matchCategory === 'ring') {
      const cashbacks: { uid: string; amount: number }[] = result.cashbacks ?? []
      const userCashback = cashbacks.find((c) => c.uid === uid)
      if (!userCashback) continue
      ringEntries++
      const entryFee: number = match.entryFee ?? 0
      const net = userCashback.amount - entryFee
      if (net > 0) {
        ringEarnedTotal += net
        if (net > 1000) hasBigRingWin = true
      }
      // 1試合で1000以上のマイナス
      if (entryFee - userCashback.amount >= 1000) hasBigLoss = true
    } else {
      const rankings: { uid: string; rank: number; earnedPoints: number }[] = result.rankings ?? []
      const e = rankings.find((r) => r.uid === uid)
      if (!e) continue
      tournamentEntries++
      if (e.rank === 1) tournamentWins++
      if (e.earnedPoints > 0) {
        tournamentTop++
        tournamentTotalPoints += e.earnedPoints
      }
      // ポイント圏外の1つ下（泡沫の夢）
      const rules: { rank: number; points: number }[] = match.distributionRules ?? []
      const paidRules = rules.filter((r) => r.points > 0)
      if (paidRules.length > 0) {
        const lastPaidRank = Math.max(...paidRules.map((r) => r.rank))
        if (e.rank === lastPaidRank + 1) hasNearMiss = true
      }
    }
  }

  // annual_champion は resetYearlyPoints() 内で付与するためここでは判定しない
  const CONDITIONS: { id: string; name: string; met: boolean }[] = [
    { id: 'first_attendance',      name: 'はじめの一歩',          met: attendanceCount >= 1 },
    { id: 'regular_5',             name: '常連メンバー',           met: attendanceCount >= 5 },
    { id: 'legend_20',             name: 'いつもこの場所で',       met: attendanceCount >= 20 },
    { id: 'tournament_first',      name: 'フライトビギナー',       met: tournamentEntries >= 1 },
    { id: 'podium',                name: '表彰台',                 met: tournamentTop >= 1 },
    { id: 'champion',              name: 'Champion',               met: tournamentWins >= 1 },
    { id: 'trophy_collector',      name: 'トロフィーコレクター',   met: tournamentWins >= 3 },
    { id: 'tournament_points_10k', name: '爆噴き',                 met: tournamentTotalPoints >= 10000 },
    { id: 'ring_debut',            name: 'リングイン',             met: ringEntries >= 1 },
    { id: 'ring_earnings_200',     name: '勝利の鐘',               met: ringEarnedTotal >= 200 },
    { id: 'ring_earnings_2k',      name: '大喰らい',               met: ringEarnedTotal >= 2000 },
    { id: 'ring_earnings_10k',     name: '羽も積もれば山となる',   met: ringEarnedTotal >= 10000 },
    { id: 'ring_big_win',          name: '総てを手に入れた',       met: hasBigRingWin },
    { id: 'shopper',               name: '買い物上手',             met: shopPurchaseCount >= 5 },
    { id: 'saver',                 name: '貯金好き',               met: totalPoints >= 2000 },
    { id: 'vault',                 name: '金庫が足りない！',        met: totalPoints >= 20000 },
    { id: 'near_miss',             name: '泡沫の夢',               met: hasNearMiss },
    { id: 'fish',                  name: 'フィッシュ！',            met: hasBigLoss },
    { id: 'count_stop',            name: 'カウントストップ',        met: totalPoints > 99999 },
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
        yearPoints: increment(amount),
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

// ── Timer App Integration ──────────────────────────────────────────────────

// タイマーアプリの暫定順位を取得
export const getTimerProvisionalRankings = async (
  timerSessionId: string
): Promise<import('@/types').TimerProvisionalRanking[]> => {
  const playersSnap = await getDocs(
    query(
      collection(db, 'timerSessions', timerSessionId, 'players'),
      orderBy('entryAt', 'asc')
    )
  )

  if (playersSnap.empty) return []

  interface PlayerData {
    id: string
    uid: string | null
    displayName: string
    isBusted: boolean
    bustOrder: number | null
  }

  const players: PlayerData[] = playersSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  } as PlayerData))

  // バストした人を bustOrder の逆順でソート（最後にバストした人が上位）
  const busted = players
    .filter(p => p.isBusted && p.bustOrder !== null)
    .sort((a, b) => (b.bustOrder ?? 0) - (a.bustOrder ?? 0))

  const alive = players.filter(p => !p.isBusted)

  const rankings: import('@/types').TimerProvisionalRanking[] = []

  // 生存者は同率1位
  for (const p of alive) {
    rankings.push({
      rank: 1,
      uid: p.uid,
      displayName: p.displayName,
      bustOrder: null,
    })
  }

  // バストした人は生存者数 + 1 位から
  let currentRank = alive.length + 1
  for (const p of busted) {
    rankings.push({
      rank: currentRank,
      uid: p.uid,
      displayName: p.displayName,
      bustOrder: p.bustOrder,
    })
    currentRank++
  }

  return rankings
}

// タイマーセッションIDをマッチに紐付け
export const linkTimerSession = async (matchId: string, timerSessionId: string) => {
  await updateDoc(doc(db, 'matches', matchId), {
    timerSessionId,
  })
}

// タイマーセッションの状態を取得
export const getTimerSessionState = async (timerSessionId: string): Promise<{
  state: string
  currentLevel: number
  remainingPlayers: number
  totalPlayers: number
} | null> => {
  const sessionSnap = await getDoc(doc(db, 'timerSessions', timerSessionId))
  if (!sessionSnap.exists()) return null

  const session = sessionSnap.data()
  const playersSnap = await getDocs(
    collection(db, 'timerSessions', timerSessionId, 'players')
  )

  const players = playersSnap.docs.map(d => d.data())
  const remainingPlayers = players.filter(p => !p.isBusted).length

  return {
    state: session.state,
    currentLevel: session.currentLevel,
    remainingPlayers,
    totalPlayers: players.length,
  }
}

// ── Ring de BINGO ──────────────────────────────────────────────────────────

export const subscribeBingoCards = (cb: (cards: BingoCard[]) => void) =>
  onSnapshot(
    query(collection(db, 'bingoCards'), orderBy('createdAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BingoCard)))
  )

export const createBingoCard = (data: Omit<BingoCard, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'bingoCards'), { ...data, createdAt: serverTimestamp() })

export const updateBingoCard = (cardId: string, data: Partial<BingoCard>) =>
  updateDoc(doc(db, 'bingoCards', cardId), data as Record<string, unknown>)

export const deleteBingoCard = (cardId: string) =>
  deleteDoc(doc(db, 'bingoCards', cardId))

export const subscribeUserBingoCards = (
  uid: string,
  cb: (cards: UserBingoCard[]) => void
) =>
  onSnapshot(
    query(
      collection(db, 'userBingoCards'),
      where('uid', '==', uid),
      orderBy('assignedAt', 'desc')
    ),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserBingoCard)))
  )

export const assignBingoCard = async (
  uid: string,
  eventId: string,
  bingoCard: BingoCard
): Promise<string | null> => {
  // 既存のカードを全て削除（次のイベントでは新しいカードに切り替え）
  const existingCards = await getDocs(
    query(collection(db, 'userBingoCards'), where('uid', '==', uid))
  )

  const batch = writeBatch(db)

  // 既存カードを削除
  existingCards.docs.forEach((cardDoc) => {
    batch.delete(cardDoc.ref)
  })

  // 新しいカードを配布
  const userCardRef = doc(collection(db, 'userBingoCards'))
  batch.set(userCardRef, {
    uid,
    bingoCardId: bingoCard.id,
    bingoCardName: bingoCard.name,
    eventId,
    missions: bingoCard.missions,
    completedCells: [12], // 中央はFREE
    claimedBingoLines: [],
    pointsPerCell: bingoCard.pointsPerCell,
    pointsPerBingo: bingoCard.pointsPerBingo,
    pointsForCompletion: bingoCard.pointsForCompletion ?? 0,
    firstBingoClaimed: false,
    assignedAt: serverTimestamp(),
  })

  await batch.commit()
  return userCardRef.id
}

const BINGO_LINES = [
  // 横5列
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // 縦5列
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // 斜め2列
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
]

export const stampBingoCell = async (
  userBingoCardId: string,
  cellIndex: number,
  adminUid: string
) => {
  const cardSnap = await getDoc(doc(db, 'userBingoCards', userBingoCardId))
  if (!cardSnap.exists()) throw new Error('ビンゴカードが見つかりません')

  const card = cardSnap.data() as UserBingoCard
  if (card.completedCells.includes(cellIndex)) {
    throw new Error('このマスは既にスタンプ済みです')
  }

  const newCompletedCells = [...card.completedCells, cellIndex]

  // 新しく達成したビンゴラインをチェック
  const newBingoLines: number[] = []
  BINGO_LINES.forEach((line, lineIndex) => {
    if (card.claimedBingoLines.includes(lineIndex)) return
    const isComplete = line.every((idx) => newCompletedCells.includes(idx))
    if (isComplete) newBingoLines.push(lineIndex)
  })

  const batch = writeBatch(db)

  // カード更新
  const updateData: Record<string, unknown> = {
    completedCells: newCompletedCells,
  }
  if (newBingoLines.length > 0) {
    updateData.claimedBingoLines = [...card.claimedBingoLines, ...newBingoLines]
  }
  if (newCompletedCells.length === 25) {
    updateData.completedAt = serverTimestamp()
  }
  batch.update(doc(db, 'userBingoCards', userBingoCardId), updateData)

  // セル達成ポイント付与
  const cellPoints = card.pointsPerCell
  if (cellPoints > 0) {
    const logRef = doc(collection(db, 'pointLogs'))
    batch.set(logRef, {
      uid: card.uid,
      type: 'manual',
      amount: cellPoints,
      description: `ビンゴ「${card.bingoCardName}」マス達成`,
      relatedId: userBingoCardId,
      createdAt: serverTimestamp(),
      createdBy: adminUid,
    })
    batch.update(doc(db, 'users', card.uid), {
      totalPoints: increment(cellPoints),
      yearPoints: increment(cellPoints),
      ownedPoints: increment(cellPoints),
    })
  }

  // ビンゴライン達成ポイント付与
  if (newBingoLines.length > 0) {
    const bingoPoints = card.pointsPerBingo * newBingoLines.length
    const logRef = doc(collection(db, 'pointLogs'))
    batch.set(logRef, {
      uid: card.uid,
      type: 'manual',
      amount: bingoPoints,
      description: `ビンゴ「${card.bingoCardName}」${newBingoLines.length}ライン達成！`,
      relatedId: userBingoCardId,
      createdAt: serverTimestamp(),
      createdBy: adminUid,
    })
    batch.update(doc(db, 'users', card.uid), {
      totalPoints: increment(bingoPoints),
      yearPoints: increment(bingoPoints),
      ownedPoints: increment(bingoPoints),
    })
  }

  // 通知
  const notifRef = doc(collection(db, 'notifications'))
  let message = `ビンゴ「${card.bingoCardName}」のマスをクリア！ +${cellPoints}pt`
  if (newBingoLines.length > 0) {
    message += ` 🎉 BINGO ${newBingoLines.length}ライン達成！ +${card.pointsPerBingo * newBingoLines.length}pt`
  }
  batch.set(notifRef, {
    uid: card.uid,
    type: 'point_awarded',
    message,
    isRead: false,
    createdAt: serverTimestamp(),
  })

  await batch.commit()

  return { newBingoLines: newBingoLines.length, cellPoints, totalBingoPoints: card.pointsPerBingo * newBingoLines.length }
}

export const getUserBingoCard = async (userBingoCardId: string): Promise<UserBingoCard | null> => {
  const snap = await getDoc(doc(db, 'userBingoCards', userBingoCardId))
  return snap.exists() ? { id: snap.id, ...snap.data() } as UserBingoCard : null
}

export const deleteUserBingoCard = async (userBingoCardId: string) => {
  await deleteDoc(doc(db, 'userBingoCards', userBingoCardId))
}

// ── Bingo Self-Stamp（セルフスタンプ）──────────────────────────────────────

export const getBingoStampCode = async (): Promise<string | null> => {
  const snap = await getDoc(doc(db, 'settings', 'bingoStamp'))
  return snap.exists() ? snap.data().code : null
}

export const setBingoStampCode = async (code: string) => {
  await setDoc(doc(db, 'settings', 'bingoStamp'), {
    code,
    updatedAt: serverTimestamp(),
  })
}

export const selfStampBingoCell = async (
  userBingoCardId: string,
  cellIndex: number,
  stampCode: string
) => {
  // コード検証
  const codeSnap = await getDoc(doc(db, 'settings', 'bingoStamp'))
  if (!codeSnap.exists() || codeSnap.data().code !== stampCode) {
    throw new Error('無効なスタンプコードです')
  }

  const cardSnap = await getDoc(doc(db, 'userBingoCards', userBingoCardId))
  if (!cardSnap.exists()) throw new Error('ビンゴカードが見つかりません')

  const card = cardSnap.data() as UserBingoCard

  if (card.finishedAt) {
    throw new Error('このビンゴカードは終了済みです')
  }

  if (card.completedCells.includes(cellIndex)) {
    throw new Error('このマスは既にスタンプ済みです')
  }

  const newCompletedCells = [...card.completedCells, cellIndex]

  // 新しく達成したビンゴラインをチェック（表示用）
  const newBingoLines: number[] = []
  BINGO_LINES.forEach((line, lineIndex) => {
    if (card.claimedBingoLines.includes(lineIndex)) return
    const isComplete = line.every((idx) => newCompletedCells.includes(idx))
    if (isComplete) newBingoLines.push(lineIndex)
  })

  const isFirstBingo = newBingoLines.length > 0 && !card.firstBingoClaimed

  await updateDoc(doc(db, 'userBingoCards', userBingoCardId), {
    completedCells: newCompletedCells,
    claimedBingoLines: [...card.claimedBingoLines, ...newBingoLines],
    ...(isFirstBingo && { firstBingoClaimed: true }),
  })

  return {
    newBingoLines: newBingoLines.length,
    isFirstBingo,
  }
}

export const finishBingoCard = async (userBingoCardId: string) => {
  const cardSnap = await getDoc(doc(db, 'userBingoCards', userBingoCardId))
  if (!cardSnap.exists()) throw new Error('ビンゴカードが見つかりません')

  const card = cardSnap.data() as UserBingoCard

  if (card.finishedAt) {
    throw new Error('このビンゴカードは既に終了済みです')
  }

  const completedCellCount = card.completedCells.filter(c => c !== 12).length
  const bingoLineCount = card.claimedBingoLines.length
  const isFullCompletion = card.completedCells.length === 25

  const batch = writeBatch(db)

  batch.update(doc(db, 'userBingoCards', userBingoCardId), {
    finishedAt: serverTimestamp(),
  })

  let totalPoints = 0
  const pointBreakdown: string[] = []

  // マス埋めポイント
  const cellPoints = completedCellCount * card.pointsPerCell
  if (cellPoints > 0) {
    totalPoints += cellPoints
    pointBreakdown.push(`マス達成(${completedCellCount}マス): ${cellPoints}pt`)
  }

  // ビンゴポイント（初回ビンゴのみ）
  if (bingoLineCount > 0 && card.pointsPerBingo > 0) {
    totalPoints += card.pointsPerBingo
    pointBreakdown.push(`初BINGO: ${card.pointsPerBingo}pt`)
  }

  // 全マス完了ボーナス
  if (isFullCompletion && (card.pointsForCompletion ?? 0) > 0) {
    totalPoints += card.pointsForCompletion ?? 0
    pointBreakdown.push(`全埋め: ${card.pointsForCompletion}pt`)
  }

  if (totalPoints > 0) {
    const logRef = doc(collection(db, 'pointLogs'))
    batch.set(logRef, {
      uid: card.uid,
      type: 'manual',
      amount: totalPoints,
      description: `ビンゴ「${card.bingoCardName}」終了 (${pointBreakdown.join(' / ')})`,
      relatedId: userBingoCardId,
      createdAt: serverTimestamp(),
      createdBy: card.uid,
    })
    batch.update(doc(db, 'users', card.uid), {
      totalPoints: increment(totalPoints),
      yearPoints: increment(totalPoints),
      ownedPoints: increment(totalPoints),
    })

    // 通知
    const notifRef = doc(collection(db, 'notifications'))
    batch.set(notifRef, {
      uid: card.uid,
      type: 'point_awarded',
      message: `ビンゴ「${card.bingoCardName}」を終了しました！ +${totalPoints}pt`,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  }

  await batch.commit()

  return {
    totalPoints,
    cellPoints,
    bingoPoints: bingoLineCount > 0 ? card.pointsPerBingo : 0,
    completionPoints: isFullCompletion ? (card.pointsForCompletion ?? 0) : 0,
    completedCellCount,
    bingoLineCount,
    isFullCompletion,
  }
}

export const resetBingoCardProgress = async (userBingoCardId: string) => {
  const cardSnap = await getDoc(doc(db, 'userBingoCards', userBingoCardId))
  if (!cardSnap.exists()) throw new Error('ビンゴカードが見つかりません')

  const card = cardSnap.data() as UserBingoCard

  if (card.finishedAt) {
    throw new Error('終了済みのビンゴカードはリセットできません')
  }

  await updateDoc(doc(db, 'userBingoCards', userBingoCardId), {
    completedCells: [12],
    claimedBingoLines: [],
    firstBingoClaimed: false,
  })
}

// ── マッチキャンセル（受付中のみ）──────────────────────────────────────────
export const cancelMatchEntry = async (match: Match, uid: string) => {
  if (match.status !== 'recruiting') {
    throw new Error('開始後のキャンセルはできません')
  }
  if (!match.participants.includes(uid)) {
    throw new Error('このマッチにエントリーしていません')
  }

  const batch = writeBatch(db)

  // 参加者リストから削除
  const newParticipants = match.participants.filter((p) => p !== uid)
  batch.update(doc(db, 'matches', match.id), {
    participants: newParticipants,
  })

  // 返金
  const refundAmount = match.entryFee
  const logRef = doc(collection(db, 'pointLogs'))
  batch.set(logRef, {
    uid,
    type: 'match',
    amount: refundAmount,
    description: `${match.title} キャンセル返金`,
    relatedId: match.id,
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  batch.update(doc(db, 'users', uid), {
    totalPoints: increment(refundAmount),
    yearPoints: increment(refundAmount),
    ownedPoints: increment(refundAmount),
  })

  await batch.commit()
}

// ── マッチ参加者が3人以上になったら管理者に通知 ────────────────────────────────
export const notifyAdminsMatchReady = async (match: Match) => {
  // 管理者ユーザーを取得
  const adminsSnap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'admin'), where('status', '==', 'active'))
  )
  if (adminsSnap.empty) return

  const batch = writeBatch(db)
  adminsSnap.docs.forEach((adminDoc) => {
    const notifRef = doc(collection(db, 'notifications'))
    batch.set(notifRef, {
      uid: adminDoc.id,
      type: 'match_ready',
      message: `${match.title}の参加者が集まりました！（${match.participants.length}名）`,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  })
  await batch.commit()
}

// ── ビンゴミッションテンプレート ───────────────────────────────────────────────
export const subscribeBingoMissionTemplates = (cb: (templates: BingoMissionTemplate[]) => void) =>
  onSnapshot(
    query(collection(db, 'bingoMissionTemplates'), orderBy('createdAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BingoMissionTemplate)))
  )

export const createBingoMissionTemplate = (data: Omit<BingoMissionTemplate, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'bingoMissionTemplates'), { ...data, createdAt: serverTimestamp() })

export const updateBingoMissionTemplate = (id: string, data: Partial<BingoMissionTemplate>) =>
  updateDoc(doc(db, 'bingoMissionTemplates', id), data as Record<string, unknown>)

export const deleteBingoMissionTemplate = (id: string) =>
  deleteDoc(doc(db, 'bingoMissionTemplates', id))

export const getRandomBingoMissions = async (): Promise<string[]> => {
  const templatesSnap = await getDocs(
    query(collection(db, 'bingoMissionTemplates'), where('isActive', '==', true))
  )
  if (templatesSnap.size < 24) {
    throw new Error(`ミッションが24個以上必要です（現在: ${templatesSnap.size}個）`)
  }

  const templates = templatesSnap.docs.map((d) => d.data().text as string)
  // シャッフル
  for (let i = templates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[templates[i], templates[j]] = [templates[j], templates[i]]
  }
  return templates.slice(0, 24)
}

// ── 来店時ビンゴカード配布 ─────────────────────────────────────────────────────
export const assignBingoCardOnAttendance = async (
  uid: string,
  eventId: string
): Promise<string | null> => {
  // イベントにビンゴカードが設定されているか確認
  const eventSnap = await getDoc(doc(db, 'events', eventId))
  if (!eventSnap.exists()) return null

  const event = eventSnap.data() as Event
  if (!event.bingoCardId) return null

  // ビンゴカードを取得
  const cardSnap = await getDoc(doc(db, 'bingoCards', event.bingoCardId))
  if (!cardSnap.exists()) return null

  const bingoCard = { id: cardSnap.id, ...cardSnap.data() } as BingoCard
  if (!bingoCard.isAvailable) return null

  // 既存のカードを確認（同じイベントのカードを持っていたらスキップ）
  const existingCards = await getDocs(
    query(collection(db, 'userBingoCards'), where('uid', '==', uid))
  )
  const existingEventCard = existingCards.docs.find((d) => d.data().eventId === eventId)
  if (existingEventCard) {
    return existingEventCard.id
  }

  // 新しいカードを配布（古いカードは自動削除）
  return assignBingoCard(uid, eventId, bingoCard)
}

// ── Admin Titles（管理者付与の非売品称号）────────────────────────────────────

export const subscribeAdminTitles = (
  cb: (titles: import('@/types').AdminTitle[]) => void
) =>
  onSnapshot(
    query(collection(db, 'adminTitles'), orderBy('createdAt', 'desc')),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as import('@/types').AdminTitle)))
  )

export const createAdminTitle = (data: Omit<import('@/types').AdminTitle, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'adminTitles'), { ...data, createdAt: serverTimestamp() })

export const deleteAdminTitle = (id: string) =>
  deleteDoc(doc(db, 'adminTitles', id))

export const grantTitleToUser = async (
  uid: string,
  title: string,
  tier: 'common' | 'rare' | 'elite' | 'prime',
  adminUid: string
) => {
  const batch = writeBatch(db)

  // UserTitle として付与
  const titleRef = doc(collection(db, 'userTitles'))
  batch.set(titleRef, {
    uid,
    title,
    tier,
    grantedBy: adminUid,
    acquiredAt: serverTimestamp(),
  })

  // 通知を送信
  const notifRef = doc(collection(db, 'notifications'))
  batch.set(notifRef, {
    uid,
    type: 'achievement',
    message: `管理者から名誉を称えて特別な称号「${title}」が届きました！`,
    isRead: false,
    createdAt: serverTimestamp(),
  })

  await batch.commit()
}

export { Timestamp, serverTimestamp }
