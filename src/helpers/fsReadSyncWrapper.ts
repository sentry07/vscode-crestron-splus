// fsWrapper.ts
import { readFileSync as fsReadFileSync } from 'fs';

export function readFileSyncWrapper (filePath: string): string  {
    return fsReadFileSync(filePath, 'utf8');
};
