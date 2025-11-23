const API_URL = process.env.EXPO_PUBLIC_API_URL

export function makeUrl(path: string) {
  return API_URL
    ? `${API_URL.replace(/\/+$/, '')}/${path.replace(/^\//, '')}`
    : path
}

export function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1)
}
