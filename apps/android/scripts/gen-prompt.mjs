// 生成 PromptData.kt —— 系统提示词逐字来自 apps/shared-judgment/src/prompt.js（唯一真源）。
// 用法： node scripts/gen-prompt.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/* 仓库根 = 本文件往上三层（apps/android/scripts → 仓库根）。
   以前这里写死了本机的绝对路径，换机器/克隆到别处就跑不了，
     协作包导出时还会被「本机盘符」判据拦下 ⇒ 改成按脚本自身位置推。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const ROOT_URL = ROOT.split(path.sep).join('/')
const P = await import('file:///' + ROOT_URL + '/apps/shared-judgment/src/prompt.js')

function q(s) {
  let out = ''
  for (const ch of String(s)) {
    if (ch === '\\') out += '\\\\'
    else if (ch === '"') out += '\\"'
    else if (ch === '$') out += '\\$'
    else if (ch === '\n') out += '\\n'
    else if (ch === '\r') out += '\\r'
    else if (ch === '\t') out += '\\t'
    else out += ch
  }
  return '"' + out + '"'
}

const OUT = ROOT + '/apps/android/kuikly/shared/src/commonMain/kotlin/com/xlr/k/judge/PromptData.kt'
const o = []
o.push('package com.xlr.k.judge')
o.push('')
o.push('/* 内容来自 apps/shared-judgment/src/prompt.js；由 scripts/gen-prompt.mjs 输出。 */')
o.push('')
o.push('internal val SYS: String = ' + q(P.SYS))
o.push('')
fs.writeFileSync(OUT, o.join('\n'), 'utf8')
console.log('SYS chars:', P.SYS.length, '| bytes:', fs.statSync(OUT).size)
