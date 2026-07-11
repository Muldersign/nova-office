import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = resolve(root, 'dist', 'index.html')
let html = await readFile(indexPath, 'utf8')

const scriptMatch = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/)
const styleMatch = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/)

if (scriptMatch) {
  const script = (await readFile(resolve(root, 'dist', scriptMatch[1]), 'utf8'))
    .replaceAll('</script', '<\\/script')
    .replaceAll('<!--', '<\\!--')
  html = html.replace(scriptMatch[0], `<script type="module">\n${script}\n</script>`)
}

if (styleMatch) {
  const style = await readFile(resolve(root, 'dist', styleMatch[1]), 'utf8')
  html = html.replace(styleMatch[0], `<style>\n${style}\n</style>`)
}

await writeFile(indexPath, html)
