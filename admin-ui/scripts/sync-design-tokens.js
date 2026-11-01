const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const shared = path.join(root, '..', 'shared')

if (!fs.existsSync(shared)) {
  console.log('[sync-design-tokens] ../shared not found; using committed vendored files')
  process.exit(0)
}

const copies = [
  ['flux-shield-design-tokens.css', path.join(root, 'src', 'styles', 'flux-shield-design-tokens.css')],
]

fs.mkdirSync(path.join(root, 'src', 'styles'), { recursive: true })

for (const [name, dest] of copies) {
  fs.copyFileSync(path.join(shared, name), dest)
}

const sharedComponents = path.join(shared, 'flux-shield-components.css')
const componentsDest = path.join(root, 'src', 'styles', 'flux-shield-components.css')
let components = fs.readFileSync(sharedComponents, 'utf8')
const layerStart = '@layer components {'
const layerIdx = components.indexOf(layerStart)
if (layerIdx >= 0) {
  components = components.slice(layerIdx + layerStart.length).trim()
  if (components.endsWith('}')) {
    components = components.slice(0, -1).trim()
  }
}
fs.writeFileSync(componentsDest, components)
