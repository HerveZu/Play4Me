import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Wrapper<Data> = {
  data: Data
}

export async function setStorageState<Data>(key: string, data: Data) {
  await AsyncStorage.setItem(key, JSON.stringify({ data } as Wrapper<Data>))
}

export async function getStorageState<Data>(key: string): Promise<Data | null> {
  const json = await AsyncStorage.getItem(key)
  return json ? (JSON.parse(json) as Wrapper<Data>).data : null
}

export function useStorageState<Data>(
  key: string,
  initialValue: Data
): { data: Data; persist: (value: Data) => Promise<void>; loading: boolean } {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(initialValue)

  useEffect(() => {
    getStorageState<Data>(key)
      .then((data) => data && setData(data))
      .finally(() => setLoading(false))
  }, [key, setData, setLoading])

  const persist = useCallback(
    async (data: Data) => {
      setData(data)
      setStorageState(key, data)
    },
    [key]
  )

  return { data, persist, loading }
}
