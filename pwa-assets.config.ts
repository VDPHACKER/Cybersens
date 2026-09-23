import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Génération des icônes PWA à partir du logo : npx pwa-assets-generator
// Fond sombre de l'application pour les icônes « maskable » (Android) et Apple, au lieu du blanc par défaut.
const background = '#020617';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
});
