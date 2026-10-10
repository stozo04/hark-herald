import { mkdir, copyFile, cp, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
// Fixed list: a new top-level file must be added here or it won't deploy.
for (const file of ['index.html', 'favicon.svg', 'style.css', 'app.mjs', 'llms.txt']) await copyFile(file, `dist/${file}`);
await cp('lib', 'dist/lib', { recursive: true });
