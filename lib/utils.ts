const API_URL = process.env.EXPO_PUBLIC_API_URL

export function makeUrl(path: string) {
  return API_URL
    ? `${API_URL.replace(/\/+$/, '')}/${path.replace(/^\//, '')}`
    : path
}
