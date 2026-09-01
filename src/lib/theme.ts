import type { ColorPalette, ThemeMode } from './types'

export interface ThemeConfig {
  primary: string
  primaryHover: string
  primaryLight: string
  secondary: string
  accent: string
  background: string
  surface: string
  surfaceHover: string
  border: string
  text: string
  textMuted: string
  textInverse: string
  gradient: string
}

const palettes: Record<ColorPalette, { light: ThemeConfig; dark: ThemeConfig }> = {
  blue: {
    light: {
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      primaryLight: '#DBEAFE',
      secondary: '#7C3AED',
      accent: '#0EA5E9',
      background: '#F0F4FF',
      surface: '#FFFFFF',
      surfaceHover: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1E3A5F',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
    },
    dark: {
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryLight: '#1E3A5F',
      secondary: '#8B5CF6',
      accent: '#38BDF8',
      background: '#0F172A',
      surface: '#1E293B',
      surfaceHover: '#334155',
      border: '#1E3A5F',
      text: '#E2E8F0',
      textMuted: '#94A3B8',
      textInverse: '#0F172A',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    },
  },
  violet: {
    light: {
      primary: '#7C3AED',
      primaryHover: '#6D28D9',
      primaryLight: '#EDE9FE',
      secondary: '#EC4899',
      accent: '#A78BFA',
      background: '#F5F3FF',
      surface: '#FFFFFF',
      surfaceHover: '#EDE9FE',
      border: '#DDD6FE',
      text: '#3B1F6E',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
    },
    dark: {
      primary: '#8B5CF6',
      primaryHover: '#7C3AED',
      primaryLight: '#3B1F6E',
      secondary: '#F472B6',
      accent: '#C4B5FD',
      background: '#13111C',
      surface: '#1E1A2E',
      surfaceHover: '#2D2640',
      border: '#3B1F6E',
      text: '#EDE9FE',
      textMuted: '#A78BFA',
      textInverse: '#13111C',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #F472B6 100%)',
    },
  },
  pink: {
    light: {
      primary: '#EC4899',
      primaryHover: '#DB2777',
      primaryLight: '#FCE7F3',
      secondary: '#F97316',
      accent: '#F472B6',
      background: '#FFF0F7',
      surface: '#FFFFFF',
      surfaceHover: '#FCE7F3',
      border: '#FBCFE8',
      text: '#831843',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
    },
    dark: {
      primary: '#F472B6',
      primaryHover: '#EC4899',
      primaryLight: '#831843',
      secondary: '#FB923C',
      accent: '#FDA4AF',
      background: '#1A0D14',
      surface: '#2D1521',
      surfaceHover: '#3D1F2E',
      border: '#831843',
      text: '#FCE7F3',
      textMuted: '#F9A8D4',
      textInverse: '#1A0D14',
      gradient: 'linear-gradient(135deg, #F472B6 0%, #FB923C 100%)',
    },
  },
  brown: {
    light: {
      primary: '#92400E',
      primaryHover: '#78350F',
      primaryLight: '#FEF3C7',
      secondary: '#D97706',
      accent: '#B45309',
      background: '#FEFCE8',
      surface: '#FFFFFF',
      surfaceHover: '#FEF9C3',
      border: '#FDE68A',
      text: '#451A03',
      textMuted: '#78716C',
      textInverse: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #92400E 0%, #D97706 100%)',
    },
    dark: {
      primary: '#D97706',
      primaryHover: '#B45309',
      primaryLight: '#451A03',
      secondary: '#F59E0B',
      accent: '#FCD34D',
      background: '#1A1000',
      surface: '#2D1F00',
      surfaceHover: '#3D2A00',
      border: '#451A03',
      text: '#FEF3C7',
      textMuted: '#FCD34D',
      textInverse: '#1A1000',
      gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    },
  },
  beige: {
    light: {
      primary: '#9D7B5E',
      primaryHover: '#7D5F43',
      primaryLight: '#F5ECD8',
      secondary: '#C4956A',
      accent: '#B8956A',
      background: '#FAF6F0',
      surface: '#FFFFFF',
      surfaceHover: '#F5ECD8',
      border: '#E8D5BC',
      text: '#3D2B1A',
      textMuted: '#8C7B6B',
      textInverse: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #9D7B5E 0%, #C4956A 100%)',
    },
    dark: {
      primary: '#C4956A',
      primaryHover: '#9D7B5E',
      primaryLight: '#3D2B1A',
      secondary: '#D4A574',
      accent: '#E8C49A',
      background: '#1A130C',
      surface: '#2D2016',
      surfaceHover: '#3D2D20',
      border: '#3D2B1A',
      text: '#F5ECD8',
      textMuted: '#C4956A',
      textInverse: '#1A130C',
      gradient: 'linear-gradient(135deg, #C4956A 0%, #D4A574 100%)',
    },
  },
  rose: {
    light: {
      primary: '#E11D48',
      primaryHover: '#BE123C',
      primaryLight: '#FFE4E6',
      secondary: '#7C3AED',
      accent: '#FB7185',
      background: '#FFF1F3',
      surface: '#FFFFFF',
      surfaceHover: '#FFE4E6',
      border: '#FECDD3',
      text: '#881337',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #E11D48 0%, #7C3AED 100%)',
    },
    dark: {
      primary: '#FB7185',
      primaryHover: '#F43F5E',
      primaryLight: '#881337',
      secondary: '#A78BFA',
      accent: '#FDA4AF',
      background: '#1A0A10',
      surface: '#2D1320',
      surfaceHover: '#3D1A2D',
      border: '#881337',
      text: '#FFE4E6',
      textMuted: '#FDA4AF',
      textInverse: '#1A0A10',
      gradient: 'linear-gradient(135deg, #FB7185 0%, #A78BFA 100%)',
    },
  },
  teal: {
    light: {
      primary: '#0F766E',
      primaryHover: '#0D6560',
      primaryLight: '#CCFBF1',
      secondary: '#0891B2',
      accent: '#14B8A6',
      background: '#F0FDFA',
      surface: '#FFFFFF',
      surfaceHover: '#CCFBF1',
      border: '#99F6E4',
      text: '#134E4A',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #0F766E 0%, #0891B2 100%)',
    },
    dark: {
      primary: '#14B8A6',
      primaryHover: '#0F766E',
      primaryLight: '#134E4A',
      secondary: '#22D3EE',
      accent: '#2DD4BF',
      background: '#0A1A18',
      surface: '#132826',
      surfaceHover: '#1E3835',
      border: '#134E4A',
      text: '#CCFBF1',
      textMuted: '#5EEAD4',
      textInverse: '#0A1A18',
      gradient: 'linear-gradient(135deg, #14B8A6 0%, #22D3EE 100%)',
    },
  },
}

export function getThemeConfig(palette: ColorPalette, mode: ThemeMode): ThemeConfig {
  return palettes[palette][mode]
}

export function applyTheme(palette: ColorPalette, mode: ThemeMode) {
  const config = getThemeConfig(palette, mode)
  const root = document.documentElement

  root.setAttribute('data-theme', mode)
  root.setAttribute('data-palette', palette)

  Object.entries(config).forEach(([key, value]) => {
    const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    root.style.setProperty(cssVar, value)
  })
}

export const paletteLabels: Record<ColorPalette, string> = {
  blue: 'Azul Profissional',
  violet: 'Violeta Elegante',
  pink: 'Rosa Glamour',
  brown: 'Marrom Dourado',
  beige: 'Bege Natural',
  rose: 'Rose Premium',
  teal: 'Verde Água',
}

export const allPalettes: ColorPalette[] = ['blue', 'violet', 'pink', 'brown', 'beige', 'rose', 'teal']
