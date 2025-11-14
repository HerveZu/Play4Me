export function withOpacity(rgbString: string, opacity: number): string {
    const safeOpacity = Math.max(0, Math.min(1, opacity))

    return `rgba(${rgbString}, ${safeOpacity})`
}
