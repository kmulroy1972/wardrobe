import { createContext, useContext, useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Today from './pages/Today'
import Closet from './pages/Closet'
import GarmentEdit from './pages/GarmentEdit'
import GarmentDetail from './pages/GarmentDetail'
import Stylist from './pages/Stylist'
import Outfits from './pages/Outfits'
import OutfitBuilder from './pages/OutfitBuilder'
import Profile from './pages/Profile'
import { GridIcon, HangerIcon, PersonIcon, SparkIcon, SunIcon } from './components/Icons'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const NAV = [
  { to: '/', label: 'Today', icon: SunIcon, end: true },
  { to: '/closet', label: 'Closet', icon: HangerIcon },
  { to: '/stylist', label: 'Stylist', icon: SparkIcon },
  { to: '/outfits', label: 'Outfits', icon: GridIcon },
  { to: '/profile', label: 'Profile', icon: PersonIcon },
]

function Wordmark() {
  return (
    <div className="wordmark">
      Ward<span className="amp">&</span>Robe
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <AuthContext.Provider value={{ user: session.user }}>
      <HashRouter>
        <div className="shell">
          <nav className="tabbar" aria-label="Main">
            <Wordmark />
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
          <div style={{ flex: 1, minWidth: 0 }}>
            <header className="topbar">
              <div className="topbar-inner">
                <Wordmark />
              </div>
            </header>
            <main className="shell-main">
              <Routes>
                <Route path="/" element={<Today />} />
                <Route path="/closet" element={<Closet />} />
                <Route path="/closet/new" element={<GarmentEdit />} />
                <Route path="/closet/:id" element={<GarmentDetail />} />
                <Route path="/closet/:id/edit" element={<GarmentEdit />} />
                <Route path="/stylist" element={<Stylist />} />
                <Route path="/outfits" element={<Outfits />} />
                <Route path="/outfits/new" element={<OutfitBuilder />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Today />} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </AuthContext.Provider>
  )
}
