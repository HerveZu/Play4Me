import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react'
import { Redirect } from 'expo-router'
import { AuthSession } from '@/lib/auth'
import { HTTPMethod } from 'better-call'

export const authClient = createAuthClient({
  plugins: [
    expoClient({
      scheme: 'com.play4me',
      storagePrefix: 'play4me_',
      storage: SecureStore,
    }),
  ],
})

type FetchOptions = Partial<{ method: HTTPMethod; body: BodyInit }>

type AuthContextType = AuthSession & {
  fetch: <Response>(url: string, options?: FetchOptions) => Promise<Response>
}
const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { data } = authClient.useSession()

  const authFetch = useCallback(
    async <Response,>(url: string, options?: FetchOptions) => {
      const cookies = authClient.getCookie()
      const headers = {
        Cookie: cookies,
        'Content-Type': options?.body ? 'application/json' : '',
      }
      const response = await fetch(url, {
        headers,
        // 'include' can interfere with the cookies we just set manually in the headers
        credentials: 'omit',
        ...options,
      })

      if (!response.ok) {
        throw new Error(
          `Failed to fetch data at ${options?.method ?? 'GET'} ${url} (${response.status}): ${response.statusText}`
        )
      }

      if (response.status === 204) {
        return null as unknown as Response
      }

      return (await response.json()) as Response
    },
    []
  )

  return data ? (
    <AuthContext.Provider value={{ fetch: authFetch, ...data }}>
      {children}
    </AuthContext.Provider>
  ) : (
    <Redirect href={'/sign-in'} />
  )
}
