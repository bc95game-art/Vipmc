import JSZip from "jszip";

export interface ApkFile {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  content?: Uint8Array | string;
  mimeType?: string;
  children?: ApkFile[];
}

export interface BuildError {
  file: string;
  line?: number;
  message: string;
  type: "error" | "warning";
}

export interface ApkInfo {
  name: string;
  size: number;
  fileCount: number;
  packageName?: string;
  versionName?: string;
  versionCode?: string;
  minSdkVersion?: string;
  targetSdkVersion?: string;
}

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  matchStart: number;
  matchEnd: number;
}

const TEXT_EXTENSIONS = new Set([
  "xml","java","kt","smali","json","txt","html","htm","css","js","ts",
  "gradle","properties","mf","sf","rsa","md","yaml","yml","ini","cfg",
  "conf","sh","bat","pro","policy","pgcfg","flags","map","pem","toml",
  "kts","groovy","kotlin","py","rb","php","cpp","c","h",
]);

const LANGUAGE_MAP: Record<string, string> = {
  xml:"xml", java:"java", kt:"kotlin", smali:"ini", json:"json",
  js:"javascript", ts:"typescript", html:"html", htm:"html", css:"css",
  gradle:"groovy", kts:"groovy", properties:"ini", yaml:"yaml", yml:"yaml",
  md:"markdown", sh:"shell", bat:"bat", groovy:"groovy", py:"python",
  rb:"ruby", php:"php", cpp:"cpp", c:"c", h:"c", toml:"ini",
};

const FILE_ICONS: Record<string, string> = {
  xml:"📄", java:"☕", kt:"🟣", smali:"🔧", json:"📋",
  png:"🖼️", jpg:"🖼️", jpeg:"🖼️", gif:"🖼️", webp:"🖼️",
  dex:"⚙️", so:"🔗", arsc:"📦", gradle:"🐘", kts:"🐘",
  properties:"⚙️", txt:"📝", md:"📝", html:"🌐", css:"🎨",
  js:"🟡", ts:"🔵", mp3:"🎵", mp4:"🎬", ttf:"🔤", otf:"🔤",
  zip:"🗜️", jar:"☕", aar:"📱", apk:"📱", sh:"🖥️",
};

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function isTextFile(filename: string): boolean {
  return TEXT_EXTENSIONS.has(getFileExtension(filename));
}

export function getLanguage(filename: string): string {
  return LANGUAGE_MAP[getFileExtension(filename)] || "plaintext";
}

export function getFileIcon(file: ApkFile): string {
  if (file.isDirectory) return "📁";
  return FILE_ICONS[getFileExtension(file.name)] || "📄";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export async function parseApk(file: File): Promise<{ zip: JSZip; files: ApkFile[]; info: ApkInfo }> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const fileMap = new Map<string, ApkFile>();
  const rootFiles: ApkFile[] = [];
  const sortedPaths = Object.keys(zip.files).sort();

  for (const path of sortedPaths) {
    const zipFile = zip.files[path];
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const parts = cleanPath.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    const apkFile: ApkFile = {
      name: parts[parts.length - 1],
      path: cleanPath,
      size: zipFile.dir ? 0 : ((zipFile as any)._data?.uncompressedSize || 0),
      isDirectory: zipFile.dir || path.endsWith("/"),
      children: (zipFile.dir || path.endsWith("/")) ? [] : undefined,
    };

    fileMap.set(cleanPath, apkFile);

    if (parts.length === 1) {
      rootFiles.push(apkFile);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = fileMap.get(parentPath);
      if (parent?.children) parent.children.push(apkFile);
    }
  }

  const allFiles = Array.from(fileMap.values());
  const info = await extractApkInfo(zip, file, allFiles);
  return { zip, files: rootFiles, info };
}

async function extractApkInfo(zip: JSZip, file: File, allFiles: ApkFile[]): Promise<ApkInfo> {
  let packageName: string | undefined;
  let versionName: string | undefined;
  let versionCode: string | undefined;
  let minSdkVersion: string | undefined;
  let targetSdkVersion: string | undefined;

  const manifest = zip.files["AndroidManifest.xml"];
  if (manifest) {
    try {
      const text = await manifest.async("string");
      packageName = text.match(/package="([^"]+)"/)?.[1];
      versionName = text.match(/versionName="([^"]+)"/)?.[1];
      versionCode = text.match(/versionCode="([^"]+)"/)?.[1];
      minSdkVersion = text.match(/minSdkVersion="([^"]+)"/)?.[1];
      targetSdkVersion = text.match(/targetSdkVersion="([^"]+)"/)?.[1];
    } catch {}
  }

  return {
    name: file.name,
    size: file.size,
    fileCount: allFiles.filter(f => !f.isDirectory).length,
    packageName, versionName, versionCode, minSdkVersion, targetSdkVersion,
  };
}

export async function searchInApk(
  zip: JSZip,
  query: string,
  options: { regex?: boolean; caseSensitive?: boolean; filePattern?: string }
): Promise<SearchResult[]> {
  if (!query) return [];

  let pattern: RegExp;
  try {
    const flags = options.caseSensitive ? "g" : "gi";
    pattern = options.regex
      ? new RegExp(query, flags)
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
  } catch { return []; }

  const fileFilter = options.filePattern
    ? new RegExp("^" + options.filePattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i")
    : null;

  const results: SearchResult[] = [];

  for (const [path, zipFile] of Object.entries(zip.files)) {
    if (zipFile.dir) continue;
    const fileName = path.split("/").pop() || path;
    if (fileFilter && !fileFilter.test(fileName) && !fileFilter.test(path)) continue;
    if (!isTextFile(fileName)) continue;

    try {
      const content = await zipFile.async("string");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(line)) !== null) {
          results.push({
            file: path, line: i + 1,
            content: line.trim().slice(0, 200),
            matchStart: match.index, matchEnd: match.index + match[0].length,
          });
          if (results.length >= 1000) return results;
        }
      }
    } catch {}
  }

  return results;
}

export async function getFileContent(zip: JSZip, path: string): Promise<{ text?: string; binary?: Uint8Array }> {
  const zipFile = zip.files[path] || zip.files[path + "/"];
  if (!zipFile) throw new Error(`فایل یافت نشد: ${path}`);
  const fileName = path.split("/").pop() || path;
  if (isTextFile(fileName)) {
    try { return { text: await zipFile.async("string") }; } catch {}
  }
  return { binary: await zipFile.async("uint8array") };
}

export async function updateFileInApk(zip: JSZip, path: string, content: string): Promise<void> {
  zip.file(path, content);
}

export async function injectZipProject(mainZip: JSZip, projectFile: File, targetPath: string): Promise<string[]> {
  const buf = await projectFile.arrayBuffer();
  const projectZip = await JSZip.loadAsync(buf);
  const injected: string[] = [];

  for (const [path, zipFile] of Object.entries(projectZip.files)) {
    if (zipFile.dir) continue;
    const content = await zipFile.async("uint8array");
    const dest = targetPath ? `${targetPath.replace(/\/$/, "")}/${path}` : path;
    mainZip.file(dest, content);
    injected.push(dest);
  }

  return injected;
}

export async function buildApk(zip: JSZip): Promise<{ blob: Blob; errors: BuildError[] }> {
  const errors: BuildError[] = [];

  const manifest = zip.files["AndroidManifest.xml"];
  if (!manifest) {
    errors.push({ file: "AndroidManifest.xml", message: "AndroidManifest.xml یافت نشد — APK معتبر نیست", type: "error" });
  } else {
    try {
      const content = await manifest.async("string");
      if (!content.includes("package=")) errors.push({ file: "AndroidManifest.xml", line: 1, message: "ویژگی 'package' در manifest یافت نشد", type: "error" });
      if (!content.includes("<activity")) errors.push({ file: "AndroidManifest.xml", message: "هیچ Activity تعریف نشده — برنامه ممکن است اجرا نشود", type: "warning" });
      if (!content.includes("android.permission")) errors.push({ file: "AndroidManifest.xml", message: "هیچ permission تعریف نشده", type: "warning" });
    } catch (e) { errors.push({ file: "AndroidManifest.xml", message: "خطا در پارس manifest: " + (e as Error).message, type: "error" }); }
  }

  for (const [path, zipFile] of Object.entries(zip.files)) {
    if (zipFile.dir) continue;
    const ext = getFileExtension(path.split("/").pop() || "");

    if (ext === "xml" && !path.startsWith("META-INF")) {
      try {
        const content = await zipFile.async("string");
        if (content.includes("</") && !content.trimStart().startsWith("<?xml") && !content.trimStart().startsWith("<resources") && !content.trimStart().startsWith("<")) {
          errors.push({ file: path, message: "XML بدون header تشخیص داده شد", type: "warning" });
        }
      } catch {}
    }

    if (ext === "java" || ext === "kt") {
      try {
        const content = await zipFile.async("string");
        if (content.includes("System.out.println")) errors.push({ file: path, message: "Log debug یافت شد — برای production حذف کنید", type: "warning" });
        if (content.includes("TODO") || content.includes("FIXME")) errors.push({ file: path, message: "TODO/FIXME یافت شد", type: "warning" });
      } catch {}
    }
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { blob, errors };
}

export function flattenFiles(files: ApkFile[]): ApkFile[] {
  const result: ApkFile[] = [];
  const traverse = (items: ApkFile[]) => {
    for (const item of items) {
      result.push(item);
      if (item.children) traverse(item.children);
    }
  };
  traverse(files);
  return result;
}
