'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

/**
 * A small wrapper around next-themes' ThemeProvider that:
 * - provides safe defaults (attribute and defaultTheme)
 * - is memoized to avoid unnecessary re-renders
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = React.memo(
  function ThemeProvider({
    children,
    attribute = 'class',     // use `class` attribute by default (commonly used with tailwind)
    defaultTheme = 'system',  // follow system preference by default
    ...props
  }: ThemeProviderProps) {
    return (
      <NextThemesProvider attribute={attribute} defaultTheme={defaultTheme} {...props}>
        {children}
      </NextThemesProvider>
    )
  }
)

ThemeProvider.displayName = 'ThemeProvider'
