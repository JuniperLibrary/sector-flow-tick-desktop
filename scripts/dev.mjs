import {spawn} from 'node:child_process';
import process from 'node:process';

const vite = spawn('npx', ['vite', '--port', '5178', '--host', '127.0.0.1'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const wait = spawn('npx', ['wait-on', 'http://127.0.0.1:5178'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const killAll = () => {
  try {
    vite.kill();
  } catch {}
  try {
    wait.kill();
  } catch {}
};

wait.on('exit', (code) => {
  if (code !== 0) {
    killAll();
    process.exit(code ?? 1);
    return;
  }

  const electron = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    env: {...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5178'},
    shell: process.platform === 'win32',
  });

  const cleanup = () => {
    try {
      electron.kill();
    } catch {}
    killAll();
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  electron.on('exit', (c) => {
    cleanup();
    process.exit(c ?? 0);
  });
});

