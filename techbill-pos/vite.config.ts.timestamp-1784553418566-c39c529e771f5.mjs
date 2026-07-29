// vite.config.ts
import { defineConfig } from "file:///D:/POS/electrotrack-saas/techbill-pos/node_modules/vite/dist/node/index.js";
import react from "file:///D:/POS/electrotrack-saas/techbill-pos/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///D:/POS/electrotrack-saas/techbill-pos/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // manifest lives in public/manifest.json — do not duplicate here
      manifest: false,
      includeAssets: ["favicon.ico", "favicon.svg", "favicon.png", "apple-touch-icon.png", "robots.txt", "sitemap.xml"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        runtimeCaching: [
          {
            // Cache API calls with network-first strategy
            urlPattern: /\/api\/.*/,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", networkTimeoutSeconds: 10 }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    },
    // Don't watch Rust build output — Cargo rewrites these constantly during
    // `tauri dev`, and Vite's watcher hitting a mid-write file causes an
    // EBUSY crash on Windows.
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["recharts", "lucide-react"],
          "vendor-data": ["zustand", "axios", "socket.io-client", "dexie"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxQT1NcXFxcZWxlY3Ryb3RyYWNrLXNhYXNcXFxcdGVjaGJpbGwtcG9zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxQT1NcXFxcZWxlY3Ryb3RyYWNrLXNhYXNcXFxcdGVjaGJpbGwtcG9zXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9QT1MvZWxlY3Ryb3RyYWNrLXNhYXMvdGVjaGJpbGwtcG9zL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICAvLyBtYW5pZmVzdCBsaXZlcyBpbiBwdWJsaWMvbWFuaWZlc3QuanNvbiBcdTIwMTQgZG8gbm90IGR1cGxpY2F0ZSBoZXJlXHJcbiAgICAgIG1hbmlmZXN0OiBmYWxzZSxcclxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdmYXZpY29uLnN2ZycsICdmYXZpY29uLnBuZycsICdhcHBsZS10b3VjaC1pY29uLnBuZycsICdyb2JvdHMudHh0JywgJ3NpdGVtYXAueG1sJ10sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd2VicCx3b2ZmMn0nXSxcclxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAvLyBDYWNoZSBBUEkgY2FsbHMgd2l0aCBuZXR3b3JrLWZpcnN0IHN0cmF0ZWd5XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC9hcGlcXC8uKi8sXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlTmFtZTogJ2FwaS1jYWNoZScsIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMTAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgYWxsb3dlZEhvc3RzOiB0cnVlLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgd3M6IHRydWUsXHJcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sICcnKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICAvLyBEb24ndCB3YXRjaCBSdXN0IGJ1aWxkIG91dHB1dCBcdTIwMTQgQ2FyZ28gcmV3cml0ZXMgdGhlc2UgY29uc3RhbnRseSBkdXJpbmdcclxuICAgIC8vIGB0YXVyaSBkZXZgLCBhbmQgVml0ZSdzIHdhdGNoZXIgaGl0dGluZyBhIG1pZC13cml0ZSBmaWxlIGNhdXNlcyBhblxyXG4gICAgLy8gRUJVU1kgY3Jhc2ggb24gV2luZG93cy5cclxuICAgIHdhdGNoOiB7XHJcbiAgICAgIGlnbm9yZWQ6IFsnKiovc3JjLXRhdXJpLyoqJ10sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgICd2ZW5kb3ItcmVhY3QnOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXHJcbiAgICAgICAgICAndmVuZG9yLXVpJzogWydyZWNoYXJ0cycsICdsdWNpZGUtcmVhY3QnXSxcclxuICAgICAgICAgICd2ZW5kb3ItZGF0YSc6IFsnenVzdGFuZCcsICdheGlvcycsICdzb2NrZXQuaW8tY2xpZW50JywgJ2RleGllJ10sXHJcbiAgICAgICAgICAndmVuZG9yLWZvcm1zJzogWydyZWFjdC1ob29rLWZvcm0nLCAnQGhvb2tmb3JtL3Jlc29sdmVycycsICd6b2QnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5UyxTQUFTLG9CQUFvQjtBQUN0VSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQTtBQUFBLE1BRWQsVUFBVTtBQUFBLE1BQ1YsZUFBZSxDQUFDLGVBQWUsZUFBZSxlQUFlLHdCQUF3QixjQUFjLGFBQWE7QUFBQSxNQUNoSCxTQUFTO0FBQUEsUUFDUCxjQUFjLENBQUMsMkNBQTJDO0FBQUEsUUFDMUQsZ0JBQWdCO0FBQUEsVUFDZDtBQUFBO0FBQUEsWUFFRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTLEVBQUUsV0FBVyxhQUFhLHVCQUF1QixHQUFHO0FBQUEsVUFDL0Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFBQSxJQUNkLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLElBQUk7QUFBQSxRQUNKLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxVQUFVLEVBQUU7QUFBQSxNQUM5QztBQUFBLElBQ0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlBLE9BQU87QUFBQSxNQUNMLFNBQVMsQ0FBQyxpQkFBaUI7QUFBQSxJQUM3QjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUN6RCxhQUFhLENBQUMsWUFBWSxjQUFjO0FBQUEsVUFDeEMsZUFBZSxDQUFDLFdBQVcsU0FBUyxvQkFBb0IsT0FBTztBQUFBLFVBQy9ELGdCQUFnQixDQUFDLG1CQUFtQix1QkFBdUIsS0FBSztBQUFBLFFBQ2xFO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
