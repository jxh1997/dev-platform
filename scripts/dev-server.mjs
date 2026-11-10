import ts from 'typescript';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
let child;
let restarting = Promise.resolve();
mkdirSync('dist', { recursive: true });
writeFileSync('dist/package.json', JSON.stringify({ type: 'commonjs' }));
const host = ts.createWatchCompilerHost('tsconfig.server.json', {}, ts.sys, ts.createSemanticDiagnosticsBuilderProgram, diagnostic => {
  console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}, diagnostic => {
  console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  if (diagnostic.code === 6194) {
    restarting = restarting.then(async () => {
      if (child && child.exitCode === null) {
        const closed = new Promise(resolve => child.once('exit', resolve));
        child.kill('SIGTERM'); await closed;
      }
      child = spawn(process.execPath, ['dist/apps/server/src/main.js'], { stdio: 'inherit', env: process.env });
    });
  }
});
const watcher = ts.createWatchProgram(host);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { watcher.close(); child?.kill(signal); process.exit(); });
