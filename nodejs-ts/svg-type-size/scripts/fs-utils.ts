import fs from 'node:fs';
import path from 'node:path';

export const ensureDir = (targetPath: string) => {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
};

export const readFileSize = (filePath: string) => fs.statSync(filePath).size;

export const listSvgFiles = (dir: string) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
    .map((entry) => path.join(dir, entry.name));
};

export const writeJson = (targetPath: string, data: unknown) => {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');
};

export const writeText = (targetPath: string, data: string) => {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, data, 'utf8');
};
