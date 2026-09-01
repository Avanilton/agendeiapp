'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { applyTheme } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import type { ColorPalette, ThemeMode, Empresa } from '@/lib/types'

interface AppContextType {
  empresa: Empresa | null
  setEmpresa: (e: Empresa | null) => void
  palette: ColorPalette
  setPalette: (p: ColorPalette) => void
  themeMode: ThemeMode
  setThemeMode: (m: ThemeMode) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (v: boolean) => void
  loading: boolean
  logout: () => Promise<void>
  saveTheme: (palette: ColorPalette, mode: ThemeMode) => Promise<void>
}

const AppContext = createContext<AppContextType>({} as AppContextType)

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [empresa, setEmpresaState] = useState<Empresa | null>(null)
  const [palette, setPaletteState] = useState<ColorPalette>('violet')
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load empresa from Supabase
  const loadEmpresa = useCallback(async (userId: string | null, forceReload = false) => {
    if (!userId) {
      setEmpresaState(null)
      localStorage.removeItem('bp_empresa')
      setLoading(false)
      return
    }

    // Check localStorage cache to avoid database read on page transitions/reloads
    if (!forceReload) {
      const cached = localStorage.getItem('bp_empresa')
      if (cached) {
        try {
          const emp = JSON.parse(cached) as Empresa
          if (emp.owner_id === userId) {
            setEmpresaState(emp)
            const p = (emp.paleta || 'violet') as ColorPalette
            const m = (emp.tema || 'light') as ThemeMode
            setPaletteState(p)
            setThemeModeState(m)
            applyTheme(p, m)
            setLoading(false)
            return // Skip database query!
          }
        } catch (e) {
          console.error('AppContext: Error parsing cached empresa:', e)
        }
      }
    }

    try {
      console.log('AppContext: Loading empresa from database for user', userId)
      const supabase = createClient()
      const { data: emp, error: empErr } = await supabase
        .from('empresas')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle()

      if (emp) {
        console.log('AppContext: Empresa loaded from database successfully', emp.nome)
        setEmpresaState(emp)
        localStorage.setItem('bp_empresa', JSON.stringify(emp))
        const p = (emp.paleta || 'violet') as ColorPalette
        const m = (emp.tema || 'light') as ThemeMode
        setPaletteState(p)
        setThemeModeState(m)
        applyTheme(p, m)
      } else {
        console.warn('AppContext: No empresa found for this owner', empErr)
        setEmpresaState(null)
        localStorage.removeItem('bp_empresa')
      }
    } catch (err) {
      console.error('AppContext: Unexpected error loading empresa:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    
    // Listen for auth changes (login/logout). This is called immediately on subscription
    // with the INITIAL_SESSION state, so we don't need a separate auth.getUser() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AppContext: Auth state changed', event, session?.user?.id)
      loadEmpresa(session?.user?.id || null)
      
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('bp_palette')
        localStorage.removeItem('bp_theme')
        localStorage.removeItem('bp_empresa')
      }
    })

    // Load from localStorage first for instant render of theme/palette
    const storedPalette = localStorage.getItem('bp_palette') as ColorPalette
    const storedMode = localStorage.getItem('bp_theme') as ThemeMode
    const storedEmpresa = localStorage.getItem('bp_empresa')
    
    // eslint-disable-next-line
    if (storedPalette) { setPaletteState(storedPalette); }
    // eslint-disable-next-line
    if (storedMode) { setThemeModeState(storedMode); }
    if (storedEmpresa) {
      try {
        // eslint-disable-next-line
        setEmpresaState(JSON.parse(storedEmpresa) as Empresa)
      } catch (err) {
        console.error(err)
      }
    }
    applyTheme(storedPalette || 'violet', storedMode || 'light')

    return () => subscription.unsubscribe()
  }, [loadEmpresa])

  const setEmpresa = useCallback((e: Empresa | null) => {
    setEmpresaState(e)
    if (e) {
      // If the database has null for paleta/tema, keep the current local state so it doesn't revert.
      setPaletteState(prevP => {
        const p = (e.paleta || prevP) as ColorPalette
        localStorage.setItem('bp_palette', p)
        return p
      })
      setThemeModeState(prevM => {
        const m = (e.tema || prevM) as ThemeMode
        localStorage.setItem('bp_theme', m)
        // applyTheme needs the latest palette and mode. We can't easily get latest palette inside this setState,
        // so we call applyTheme after setting both.
        return m
      })

      // Since state updates are async, we use the computed values to apply immediately
      const currentP = (e.paleta || localStorage.getItem('bp_palette') || 'violet') as ColorPalette
      const currentM = (e.tema || localStorage.getItem('bp_theme') || 'light') as ThemeMode
      applyTheme(currentP, currentM)

      localStorage.setItem('bp_empresa', JSON.stringify(e))
    } else {
      localStorage.removeItem('bp_empresa')
    }
  }, [])

  const setPalette = useCallback((p: ColorPalette) => {
    setPaletteState(p)
    applyTheme(p, themeMode)
    localStorage.setItem('bp_palette', p)
  }, [themeMode])

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m)
    applyTheme(palette, m)
    localStorage.setItem('bp_theme', m)
  }, [palette])

  const saveTheme = useCallback(async (p: ColorPalette, m: ThemeMode) => {
    if (!empresa) return
    const supabase = createClient()
    await supabase
      .from('empresas')
      .update({ paleta: p, tema: m })
      .eq('id', empresa.id)
    
    const updated = { ...empresa, paleta: p, tema: m }
    setEmpresaState(updated)
    localStorage.setItem('bp_empresa', JSON.stringify(updated))
  }, [empresa])

  const logout = useCallback(async () => {
    try {
      console.log('Iniciando logout...')
      const supabase = createClient()
      await supabase.auth.signOut()
      setEmpresaState(null)
      localStorage.removeItem('bp_empresa')
      localStorage.removeItem('bp_palette')
      localStorage.removeItem('bp_theme')
      console.log('Logout concluído, redirecionando...')
      router.push('/auth/login')
      // Fallback em caso de falha no router
      setTimeout(() => {
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login'
        }
      }, 1000)
    } catch (err) {
      console.error('Erro ao sair:', err)
      window.location.href = '/auth/login'
    }
  }, [router])

  return (
    <AppContext.Provider value={{
      empresa, setEmpresa,
      palette, setPalette,
      themeMode, setThemeMode,
      sidebarCollapsed, setSidebarCollapsed,
      mobileSidebarOpen, setMobileSidebarOpen,
      loading, logout, saveTheme
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
