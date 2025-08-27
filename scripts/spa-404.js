import { copyFileSync, existsSync, mkdirSync } from 'fs'
if (!existsSync('dist')) mkdirSync('dist', { recursive: true })
copyFileSync('dist/index.html', 'dist/404.html')