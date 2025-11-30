import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Periods from './pages/Periods'
import FinancialGoals from './pages/FinancialGoals'
import OAuthCallback from './pages/OAuthCallback'
import { authService } from './services/authService'

function AppContent() {
  const [user, setUser] = useState(null)
  const [profileStats, setProfileStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const fetchUser = async () => {
      // Skip fetching user if on callback page (it handles auth itself)
      if (location.pathname === '/auth/callback') {
        setLoading(false)
        return
      }

      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        setLoading(false)
        return
      }

      try {
        // Fetch user profile with stats
        const profile = await authService.getUserProfile()
        setUser(profile.user)
        setProfileStats(profile.stats)
      } catch (error) {
        console.error('Failed to fetch user profile:', error)

        // Attempt to refresh the token before clearing
        const newToken = await authService.refreshToken()

        if (newToken) {
          // Token refreshed successfully, retry fetching profile
          try {
            const profile = await authService.getUserProfile()
            setUser(profile.user)
            setProfileStats(profile.stats)
          } catch (retryError) {
            console.error('Failed to fetch user profile after refresh:', retryError)
            // Clear tokens if retry also fails
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
        } else {
          // Refresh failed, clear tokens
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [location.pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
            <svg
              className="h-12 w-12 animate-spin text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700">Loading Budget App...</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={user ? <Layout user={user} /> : <Navigate to="/login" replace />}>
        <Route path="/dashboard" element={<Dashboard user={user} profileStats={profileStats} />} />
        <Route path="/transactions" element={<Transactions user={user} />} />
        <Route path="/periods" element={<Periods user={user} />} />
        <Route path="/goals" element={<FinancialGoals user={user} />} />
      </Route>
    </Routes>
  )
}

function App() {
  return <AppContent />
}

export default App
