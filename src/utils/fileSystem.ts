const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function readTextFile(path: string): Promise<string> {
  if (!IS_TAURI) throw new Error('Not running in Tauri');
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  return readTextFile(path);
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  if (!IS_TAURI) throw new Error('Not running in Tauri');
  const { writeTextFile } = await import('@tauri-apps/plugin-fs');
  await writeTextFile(path, content);
}

export async function readDir(path: string): Promise<{ name: string; isDirectory: boolean; path: string }[]> {
  if (!IS_TAURI) return [];
  const { readDir } = await import('@tauri-apps/plugin-fs');
  const entries = await readDir(path);
  return entries
    .filter((e): e is typeof e & { name: string } => !!e.name)
    .map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory ?? false,
      path: `${path}/${e.name}`,
    }));
}

export async function mkdir(path: string): Promise<void> {
  if (!IS_TAURI) return;
  const { mkdir } = await import('@tauri-apps/plugin-fs');
  await mkdir(path, { recursive: true });
}

export async function removeFile(path: string): Promise<void> {
  if (!IS_TAURI) return;
  const { remove } = await import('@tauri-apps/plugin-fs');
  await remove(path);
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  if (!IS_TAURI) return;
  const { rename } = await import('@tauri-apps/plugin-fs');
  await rename(oldPath, newPath);
}

export async function exists(path: string): Promise<boolean> {
  if (!IS_TAURI) return false;
  const { exists } = await import('@tauri-apps/plugin-fs');
  return exists(path);
}

export async function openDirectoryDialog(): Promise<string | null> {
  if (!IS_TAURI) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const result = await open({ directory: true, title: 'Select Notes Directory' });
  return typeof result === 'string' ? result : null;
}

export async function getDocumentDir(): Promise<string> {
  if (!IS_TAURI) return '';
  const { documentDir } = await import('@tauri-apps/api/path');
  return documentDir();
}

export function isTauri(): boolean {
  return IS_TAURI;
}
