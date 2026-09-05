import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
const directory = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
function location(id: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid file identifier");
  return path.join(directory(), id);
}
export async function saveFile(data: Buffer) { await mkdir(directory(), { recursive: true }); const id = randomUUID(); await writeFile(location(id), data, { flag: "wx", mode: 0o600 }); return id; }
export async function loadFile(id: string) { return readFile(location(id)); }
export async function removeFile(id: string) { await unlink(location(id)).catch((e: NodeJS.ErrnoException) => { if (e.code !== "ENOENT") throw e; }); }

