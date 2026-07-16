import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('===================================================');
console.log('Starting Cevicheria Salymar services...');
console.log('===================================================');

const processes = [];

// Helper to spawn a process and track it
function startProcess(name, command, args) {
  console.log(`[System] Starting ${name} using: ${command} ${args.join(' ')}`);
  const proc = spawn(command, args, { stdio: 'inherit', shell: true });
  
  proc.on('error', (err) => {
    console.error(`[System] Failed to start ${name}:`, err.message);
  });
  
  processes.push({ name, proc });
}

// Locate best Java version (JAR requires Java 21 / version 65.0)
let javaPath = 'java';
const candidates = [
  'C:\\Program Files\\Java\\jdk-23\\bin\\java.exe',
  'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
];

for (const cand of candidates) {
  if (fs.existsSync(cand)) {
    javaPath = `"${cand}"`;
    break;
  }
}

// 1. Start SQLite database backend (Express) on port 8081
startProcess('Database Backend (Express)', 'node', ['server.js']);

// 2. Start SRI Java Service on port 8080 (using detected Java 21/23 if available)
startProcess('SRI Invoicing Service (Java)', javaPath, ['-jar', 'SRI-1.0-SNAPSHOT.jar']);

// 3. Start Frontend (Vite) on port 3000
startProcess('Frontend (Vite)', 'npx', ['vite', '--port=3000', '--host=0.0.0.0']);

// Handle termination signals to make sure processes exit cleanly
const cleanup = () => {
  console.log('\n[System] Stopping all services...');
  processes.forEach(({ name, proc }) => {
    if (proc.pid) {
      console.log(`[System] Stopping ${name}...`);
      proc.kill();
    }
  });
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
