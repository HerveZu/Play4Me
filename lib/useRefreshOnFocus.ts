import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'

export function useRefreshOnFocus() {
    const queryClient = useQueryClient()
    const firstTimeRef = useRef(true)

    useFocusEffect(
        useCallback(() => {
            if (firstTimeRef.current) {
                firstTimeRef.current = false
                return
            }

            // refetch all stale active queries
            queryClient.refetchQueries({
                stale: true,
                type: 'active',
            })
        }, [queryClient])
    )
}
