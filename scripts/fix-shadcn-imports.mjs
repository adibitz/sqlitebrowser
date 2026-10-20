// shadcn/ui writes `import { cn } from "cn"`; point it at our configured lib/cn.ts instead.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'src/renderer/src/components/ui'
for (const file of readdirSync(dir)) {
  const path = join(dir, file)
  const source = readFileSync(path, 'utf8')
  const fixed = source.replace(/from ["']cn["']/g, 'from "@/lib/cn"')
  if (fixed !== source) {
    writeFileSync(path, fixed)
    console.log(`fixed cn import in ${path}`)
  }
}
