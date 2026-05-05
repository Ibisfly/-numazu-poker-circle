import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from './config'

const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)

export const logOut = () => signOut(auth)
