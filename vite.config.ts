import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// リポジトリ名に合わせて変更してください（例: '/my-dashboard/'）
export default defineConfig({
  plugins: [react()],
  base: '/REPO_NAME/',
})
