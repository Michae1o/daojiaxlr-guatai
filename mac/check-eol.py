# -*- coding: utf-8 -*-
"""mac/ 下脚本的行尾体检 + 强制 LF（bash / .command 必须 LF，CRLF 会报
   $'\r': command not found）"""
import glob
import os
import sys

MUST_LF = ('.sh', '.command')

fixed = []
for p in sorted(glob.glob('mac/*')):
    if not os.path.isfile(p):
        continue
    b = open(p, 'rb').read()
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    print('%-34s %8d B   CRLF=%-5d LF=%d' % (p, len(b), crlf, lf))
    if p.endswith(MUST_LF) and crlf:
        open(p, 'wb').write(b.replace(b'\r\n', b'\n'))
        fixed.append(p)

if fixed:
    print('\n已转 LF：' + ', '.join(fixed))
    for p in fixed:
        b = open(p, 'rb').read()
        print('  %-34s CRLF=%d  LF=%d' % (p, b.count(b'\r\n'), b.count(b'\n')))
else:
    print('\n全部已是 LF ✓')

bad = [p for p in glob.glob('mac/*') if os.path.isfile(p) and p.endswith(MUST_LF) and b'\r' in open(p, 'rb').read()]
print('\n残留 CR 的文件：' + (', '.join(bad) if bad else '无 ✓'))
sys.exit(1 if bad else 0)
