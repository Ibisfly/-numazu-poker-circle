import { createContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { subscribeUser } from '@/lib/firebase/firestore'
import type { User } from '@/types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Firestore リスナーを外部で追跡して確実にクリーンアップする
    let unsubUser: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      // 前回のユーザーの Firestore リスナーを必ず解除
      if (unsubUser) {
        unsubUser()
        unsubUser = null
      }

      setFirebaseUser(fbUser)

      if (!fbUser) {
        setUser(null)
        setLoading(false)
        return
      }

      // 新しいユーザーの Firestore 取得を待つ間は loading=true に戻す
      setLoading(true)

      unsubUser = subscribeUser(fbUser.uid, (u) => {
        setUser(u)
        setLoading(false)
      })
    })

    return () => {
      unsubAuth()
      if (unsubUser) unsubUser()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
