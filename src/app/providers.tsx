'use client'

import { useEffect } from 'react'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        posthog.init('phc_FMB3TqkbXdPw96XS1deKen5RwAYWLRDEuqZmGGyL0Ad', {
            api_host: 'https://eu.i.posthog.com',
            person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
            defaults: '2025-05-24'
        });
    }, [])

    return (
        <PHProvider client={posthog}>
            {children}
        </PHProvider>
    )
}
