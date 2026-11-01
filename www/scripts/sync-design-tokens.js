const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const shared = path.join(root, '..', 'shared')

if (!fs.existsSync(shared)) {
  console.log('[sync-design-tokens] ../shared not found; using committed vendored files')
  process.exit(0)
}

const copies = [
  ['flux-labs-tailwind-theme.js', path.join(root, 'lib', 'flux-labs-tailwind-theme.js')],
  ['flux-shield-design-tokens.css', path.join(root, 'src', 'styles', 'flux-shield-design-tokens.css')],
  ['flux-shield-components.css', path.join(root, 'src', 'styles', 'flux-shield-components.css')],
]

fs.mkdirSync(path.join(root, 'src', 'styles'), { recursive: true })

for (const [name, dest] of copies) {
  fs.copyFileSync(path.join(shared, name), dest)
}
