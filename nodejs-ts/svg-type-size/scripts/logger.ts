import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'benchmark.log');

const ensureLogDir = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

export const logInfo = (message: string) => {
  ensureLogDir();
  const line = `[INFO] ${new Date().toISOString()} ${message}`;
  fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
  console.info(line);
};

export const logError = (message: string) => {
  ensureLogDir();
  const line = `[ERROR] ${new Date().toISOString()} ${message}`;
  fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
  console.error(line);
};

export const logWarn = (message: string) => {
  ensureLogDir();
  const line = `[WARN] ${new Date().toISOString()} ${message}`;
  fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
  console.warn(line);
};
