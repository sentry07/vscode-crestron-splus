// fsWrapper.ts
import { existsSync as fsExistsSync, PathLike } from 'fs';

export const existsSyncWrapper = (filePath: PathLike): boolean => {
    return fsExistsSync(filePath);
};
