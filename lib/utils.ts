const API_URL = process.env.EXPO_PUBLIC_API_URL

export function makeUrl(path: string) {
  return API_URL
    ? `${API_URL.replace(/\/+$/, '')}/${path.replace(/^\//, '')}`
    : path
}

export function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1)
}

/**
 * Changes the alpha value of an RGB or RGBA color string.
 * @param colorString - The input color string (e.g., 'rgb(255, 0, 0)', 'rgba(100, 50, 20, 0.7)').
 * @param newAlpha - The new alpha value (0.0 to 1.0).
 * @returns The new RGBA color string, or null if the input is invalid.
 */
export function alpha(colorString: string, newAlpha: number): string {
  const alpha: number = Math.max(0, Math.min(1, newAlpha))

  const regex: RegExp =
    /(rgb|rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3}).*?\)/i

  const match: RegExpMatchArray | null = colorString.match(regex)

  if (!match) {
    throw new Error('Invalid color string format.')
  }
  const r: string = match[2]
  const g: string = match[3]
  const b: string = match[4]

  const rVal: number = parseInt(r, 10)
  const gVal: number = parseInt(g, 10)
  const bVal: number = parseInt(b, 10)

  if (rVal > 255 || gVal > 255 || bVal > 255) {
    throw new Error('RGB component value out of range (0-255).')
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
