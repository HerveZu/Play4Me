import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Wrapper<Data> = {
    data: Data
}

export function useStorageState<Data>(
    key: string,
    initialValue: Data
): { data: Data; persist: (value: Data) => Promise<void>; loading: boolean } {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(initialValue)

    useEffect(() => {
        AsyncStorage.getItem(key)
            .then((json) => {
                if (json) setData((JSON.parse(json) as Wrapper<Data>).data)
            })
            .finally(() => setLoading(false))
    }, [key, setData, setLoading])

    const persist = useCallback(
        async (data: Data) => {
            setData(data)
            await AsyncStorage.setItem(
                key,
                JSON.stringify({ data } as Wrapper<Data>)
            )
        },
        [key]
    )

    return { data, persist, loading }
}
