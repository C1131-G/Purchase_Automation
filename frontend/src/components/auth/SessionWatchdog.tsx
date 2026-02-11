import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useIsAuthenticated, useLogoutAction } from '@/store/auth.store'
import { authAPI } from '@/api/auth.service'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const MAX_IDLE_TIME = 1 * 60 * 1000 // 1 minute (TESTING)
const WARNING_TIME = 30 * 1000 // 30 seconds (TESTING)
const HEARTBEAT_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * SessionWatchdog: Monitors user inactivity and manages auto-logout.
 * Also handles terminal session on browser/tab closure.
 */
export const SessionWatchdog: React.FC = () => {
    const isAuthenticated = useIsAuthenticated()
    const logout = useLogoutAction()
    const [showWarning, setShowWarning] = useState(false)
    const [countdown, setCountdown] = useState(30)
    const lastActivityRef = useRef<number>(Date.now())
    const timerRef = useRef<any>(null)

    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now()
        if (showWarning) setShowWarning(false)
    }, [showWarning])

    const handleStayLoggedIn = async () => {
        try {
            // Send a heartbeat to the backend to refresh the session
            await authAPI.getMe()
            resetTimer()
            setShowWarning(false)
        } catch (error) {
            console.error('Failed to refresh session:', error)
            logout()
        }
    }

    useEffect(() => {
        if (!isAuthenticated) {
            if (timerRef.current) clearInterval(timerRef.current)
            return
        }

        // 1. Listen for user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
        const handleActivity = () => resetTimer()

        events.forEach((event) => window.addEventListener(event, handleActivity))

        // 2. Setup the Tick (Checked every 1 second for precision during testing)
        timerRef.current = window.setInterval(() => {
            const now = Date.now()
            const idleTime = now - lastActivityRef.current

            if (idleTime >= MAX_IDLE_TIME) {
                logout()
            } else if (idleTime >= WARNING_TIME) {
                setShowWarning(true)
                // Calculate remaining seconds for the countdown
                const remaining = Math.max(0, Math.ceil((MAX_IDLE_TIME - idleTime) / 1000))
                setCountdown(remaining)
            }
        }, 1000)

        // 3. Heartbeat (Optional: Periodically ping backend if active)
        const heartbeatTimer = window.setInterval(() => {
            const idleTime = Date.now() - lastActivityRef.current
            if (idleTime < WARNING_TIME) {
                authAPI.getMe().catch(() => { })
            }
        }, HEARTBEAT_INTERVAL)

        // 4. Tab Closure Handling (Beacon API)
        const handleUnload = () => {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
            navigator.sendBeacon(`${baseUrl}/api/v1/auth/logout`)
        }
        window.addEventListener('beforeunload', handleUnload)

        return () => {
            events.forEach((event) => window.removeEventListener(event, handleActivity))
            if (timerRef.current) clearInterval(timerRef.current)
            clearInterval(heartbeatTimer)
            window.removeEventListener('beforeunload', handleUnload)
        }
    }, [isAuthenticated, logout, resetTimer])

    return (
        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
            <AlertDialogContent className="border-blue-100 shadow-[0_20px_50px_rgba(37,99,235,0.15)]">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        </div>
                        <AlertDialogTitle className="text-blue-950">Session Expiring</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-zinc-600 leading-relaxed">
                        Your session will expire in <span className="font-bold text-blue-600 tabular-nums">{countdown} seconds</span> due to inactivity.
                        <br />Would you like to stay logged in?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction
                        onClick={handleStayLoggedIn}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                        Stay Logged In
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
