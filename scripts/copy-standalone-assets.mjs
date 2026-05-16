// scripts/copy-standalone-assets.mjs
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const standaloneDir = join(root, '.next', 'standalone');
const nextStaticSrc = join(root, '.next', 'static');
const nextStaticDest = join(standaloneDir, '.next', 'static');
const publicSrc = join(root, 'public');
const publicDest = join(standaloneDir, 'public');

// 确保目标目录存在
mkdirSync(join(standaloneDir, '.next'), { recursive: true });

// 复制 .next/static
cpSync(nextStaticSrc, nextStaticDest, { recursive: true });
console.log('✅ Copied .next/static to standalone');

// 复制 public/
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log('✅ Copied public/ to standalone');
}