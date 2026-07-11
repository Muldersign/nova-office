import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = resolve(root, 'dist', 'index.html')
let html = await readFile(indexPath, 'utf8')

const scripts = [...html.matchAll(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/g)]

for (const match of scripts) {
  const script = await readFile(resolve(root, 'dist', match[1]))
  const base64 = script.toString('base64')
  html = html.replace(match[0], `<script type="module">
const code = atob('${base64}');
const runtimeUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
import(runtimeUrl).finally(() => URL.revokeObjectURL(runtimeUrl));
</script>`)
}

await writeFile(indexPath, html)
