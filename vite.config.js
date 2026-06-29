import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'

// GitHub Pages 部署时通过 --mode=gh-pages 切换基路径
// 使用方式: npm run build -- --mode=gh-pages

export default defineConfig(({ mode }) => {
  const isGhPages = mode === 'gh-pages'
  const base = isGhPages ? '/medical-quiz-pwa/' : '/'

  return {
    base,
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'favicon.ico', 'favicon.svg'],
        appleTouchIcon: isGhPages ? '/medical-quiz-pwa/icons/icon-192.png' : '/icons/icon-192.png',
        manifest: {
          name: '全科医学刷题',
          short_name: '刷题助手',
          description: '基于艾宾浩斯遗忘曲线的智能刷题系统',
          theme_color: '#3399ff',
          background_color: '#f5f7fa',
          display: 'standalone',
          orientation: 'portrait',
          scope: base,
          start_url: base,
          lang: 'zh-CN',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
              }
            }
          ]
        }
      }),
      AutoImport({
        resolvers: [VantResolver()]
      }),
      Components({
        resolvers: [VantResolver()]
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})
