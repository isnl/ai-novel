import { defineConfig, presetIcons, presetUno, presetTypography } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle'
      }
    }),
    presetTypography()
  ],
  theme: {
    colors: {
      primary: 'var(--primary)',
      'primary-hover': 'var(--primary-hover)',
      'primary-soft': 'var(--primary-soft)',
      secondary: 'var(--secondary)',
      'secondary-soft': 'var(--secondary-soft)',
      accent: 'var(--accent)',
      'accent-soft': 'var(--accent-soft)',
      surface: 'var(--surface)',
      'surface-2': 'var(--surface-2)',
      'surface-3': 'var(--surface-3)',
      bg: 'var(--bg)',
      'bg-soft': 'var(--bg-soft)',
      border: 'var(--border)',
      divider: 'var(--divider)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      info: 'var(--info)'
    }
  },
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'page-container': 'w-full max-w-300 mx-auto px-6 lt-md:px-4'
  }
})
