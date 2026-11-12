import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// base './'：可部署到 GitHub Pages 项目子路径
export default defineConfig({
  plugins: [vue()],
  base: './',
});
