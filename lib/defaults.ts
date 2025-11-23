import { CreatePlaylistInput } from '@/app/(authenticated)/api/playlist/create+api'

export const DEFAULT_PLAYLIST: CreatePlaylistInput = {
  title: 'Play4Me Radio',
  description: `
Rock anchors the Early Morning and Early Evening blocks. 

Transitions occur Before Lunch to Smooth Jazz and Piano, followed by upbeat Indie Rock at Lunchtime. The Afternoon Drive features R&B and Pop Piano. 

After the evening Rock peak, the schedule switches to instrumental Jazz and Piano in the Late Evening, ending with Ambient Electronic Overnight.
  `.trim(),
  settings: {
    usePreferences: true,
    dontRepeatFromHistory: true,
  },
}
