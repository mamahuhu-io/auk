import { dirname, basename, join } from "@tauri-apps/api/path"
import { Command } from "@tauri-apps/plugin-shell"
import {
  readTextFile,
  writeTextFile,
  remove,
  stat,
  readDir,
  mkdir,
  exists,
  rename,
  watch,
} from "@tauri-apps/plugin-fs"

export const pathAPI = {
  dirname,
  basename,
  join,
}

export const shellAPI = {
  createCommand: Command.create,
}

export const fsAPI = {
  readTextFile,
  writeTextFile,
  remove,
  stat,
  readDir,
  mkdir,
  exists,
  rename,
  watch,
}
