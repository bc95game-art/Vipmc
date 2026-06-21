import { useState, useCallback, useRef } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { FileTree } from "@/components/FileTree";
import { CodeEditor, OpenTab } from "@/components/CodeEditor";
import { SearchPanel } from "@/components/SearchPanel";
import { InjectPanel } from "@/components/InjectPanel";
import { BuildPanel } from "@/components/BuildPanel";
import {
  ApkFile, ApkInfo, SearchResult, BuildError,
  parseApk, searchInApk, getFileContent, updateFileInApk,
  injectZipProject, buildApk, isTextFile,
} from "@/lib/apk-utils";
import {
  Upload, FolderOpen, Search, Hammer, FolderInput,
  Cpu, ZapIcon, FileCode2, Info, ChevronDown,
} from "lucide-react";

type SidePanel = "files" | "search" | "inject" | "build";

const SIDE_PANELS: { id: SidePanel; icon: React.ReactNode; label: string }[] = [
  { id: "files",  icon: <FolderOpen size={20} />,  label: "فایل‌ها"       },
  { id: "search", icon: <Search size={20} />,       label: "جستجو"        },
  { id: "inject", icon: <FolderInput size={20} />,  label: "تزریق پروژه"  },
  { id: "build",  icon: <Hammer size={20} />,       label: "بازسازی APK"  },
];

export default function ApkStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [zip, setZip]               = useState<JSZip | null>(null);
  const [apkFiles, setApkFiles]     = useState<ApkFile[]>([]);
  const [apkInfo, setApkInfo]       = useState<ApkInfo | undefined>();
  const [tabs, setTabs]             = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab]   = useState<string | null>(null);
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());
  const [sidePanel, setSidePanel]   = useState<SidePanel>("files");
  const [loading, setLoading]       = useState(false);
  const [dragOver, setDragOver]     = useState(false);

  /* ───────── APK load ───────── */
  const handleApkLoad = useCallback(async (file: File) => {
    if (!file.name.endsWith(".apk") && !file.name.endsWith(".zip")) {
      toast.error("فقط فایل APK یا ZIP قابل بارگذاری است");
      return;
    }
    setLoading(true);
    try {
      const { zip: z, files, info } = await parseApk(file);
      setZip(z);
      setApkFiles(files);
      setApkInfo(info);
      setTabs([]);
      setActiveTab(null);
      setModifiedFiles(new Set());
      toast.success(`✅ بارگذاری شد — ${info.fileCount} فایل`, { description: info.packageName });
    } catch (e) {
      toast.error("خطا در بارگذاری", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  /* ───────── open file in editor ───────── */
  const handleFileSelect = useCallback(async (file: ApkFile) => {
    if (file.isDirectory || !zip) return;
    const existing = tabs.find((t) => t.path === file.path);
    if (existing) { setActiveTab(file.path); return; }

    if (!isTextFile(file.name)) {
      toast.info("فایل باینری — ویرایش متنی پشتیبانی نمی‌شود");
      return;
    }
    try {
      const { text } = await getFileContent(zip, file.path);
      if (text !== undefined) {
        setTabs((p) => [...p, { path: file.path, name: file.name, content: text, modified: false }]);
        setActiveTab(file.path);
      }
    } catch (e) {
      toast.error("خطا در باز کردن فایل", { description: (e as Error).message });
    }
  }, [zip, tabs]);

  /* ───────── tab management ───────── */
  const handleTabClose = useCallback((path: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === path);
      const next = prev.filter((t) => t.path !== path);
      if (activeTab === path) setActiveTab(next[Math.max(0, idx - 1)]?.path ?? null);
      return next;
    });
  }, [activeTab]);

  const handleContentChange = useCallback((path: string, content: string) => {
    setTabs((p) => p.map((t) => t.path === path ? { ...t, content, modified: true } : t));
  }, []);

  const handleSave = useCallback(async (path: string) => {
    if (!zip) return;
    const tab = tabs.find((t) => t.path === path);
    if (!tab) return;
    await updateFileInApk(zip, path, tab.content);
    setTabs((p) => p.map((t) => t.path === path ? { ...t, modified: false } : t));
    setModifiedFiles((prev) => { const s = new Set(prev); s.delete(path); return s; });
    toast.success("ذخیره شد", { description: path.split("/").pop() });
  }, [zip, tabs]);

  /* ───────── search ───────── */
  const handleSearch = useCallback(async (
    query: string,
    options: { regex: boolean; caseSensitive: boolean; filePattern: string }
  ): Promise<SearchResult[]> => {
    if (!zip) return [];
    return searchInApk(zip, query, options);
  }, [zip]);

  const handleSearchResultClick = useCallback(async (result: SearchResult) => {
    if (!zip) return;
    const fileName = result.file.split("/").pop() || result.file;
    const existing = tabs.find((t) => t.path === result.file);
    if (existing) { setActiveTab(result.file); setSidePanel("files"); return; }
    try {
      const { text } = await getFileContent(zip, result.file);
      if (text !== undefined) {
        setTabs((p) => [...p, { path: result.file, name: fileName, content: text, modified: false }]);
        setActiveTab(result.file);
        setSidePanel("files");
      }
    } catch {}
  }, [zip, tabs]);

  /* ───────── inject ───────── */
  const handleInject = useCallback(async (zipFile: File, targetPath: string): Promise<string[]> => {
    if (!zip) throw new Error("ابتدا یک APK بارگذاری کنید");
    const injected = await injectZipProject(zip, zipFile, targetPath);
    const rebuilt = await zip.generateAsync({ type: "blob" });
    const { zip: z2, files } = await parseApk(new File([rebuilt], apkInfo?.name ?? "temp.apk"));
    setZip(z2);
    setApkFiles(files);
    return injected;
  }, [zip, apkInfo]);

  /* ───────── build ───────── */
  const handleBuild = useCallback(async (): Promise<{ blob: Blob; errors: BuildError[] }> => {
    if (!zip) throw new Error("ابتدا یک APK بارگذاری کنید");
    for (const tab of tabs.filter((t) => t.modified)) {
      await updateFileInApk(zip, tab.path, tab.content);
    }
    return buildApk(zip);
  }, [zip, tabs]);

  /* ───────── drag & drop ───────── */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleApkLoad(file);
  }, [handleApkLoad]);

  const unsavedCount = tabs.filter((t) => t.modified).length;

  /* ════════ RENDER ════════ */
  return (
    <div
      className="flex flex-col h-screen bg-[#1e1e1e] text-gray-200 overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-[#007acc]/20 border-4 border-dashed border-[#007acc] flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-3 bg-[#1e1e1e]/90 rounded-2xl px-10 py-8 border border-[#007acc]/40">
            <Upload size={48} className="mx-auto text-[#007acc]" />
            <p className="text-xl font-bold text-[#007acc]">فایل APK را اینجا رها کنید</p>
            <p className="text-sm text-gray-400">پشتیبانی از .apk و .zip</p>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="flex items-center h-10 bg-[#323233] border-b border-[#1a1a1a] px-3 gap-2 flex-shrink-0 select-none">
        <div className="flex items-center gap-2 mr-1">
          <div className="w-5 h-5 bg-gradient-to-br from-[#007acc] to-[#569cd6] rounded flex items-center justify-center shadow-sm">
            <Cpu size={11} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">APK Studio Pro</span>
        </div>

        <div className="w-px h-4 bg-[#3d3d3d] mx-1" />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#007acc] hover:bg-[#005a9e] text-white rounded transition-colors font-medium shadow-sm"
        >
          <Upload size={11} />
          بارگذاری APK
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".apk,.zip"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleApkLoad(f); e.target.value = ""; }}
        />

        {apkInfo && (
          <div className="flex items-center gap-1.5 ml-1 text-xs text-gray-400 min-w-0">
            <FileCode2 size={11} className="text-[#4ec9b0] flex-shrink-0" />
            <span className="text-[#4ec9b0] font-medium truncate max-w-[140px]">{apkInfo.name}</span>
            {apkInfo.packageName && (
              <>
                <span className="text-gray-700">·</span>
                <span className="truncate max-w-[180px] text-gray-500">{apkInfo.packageName}</span>
              </>
            )}
            {apkInfo.versionName && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-gray-500">v{apkInfo.versionName}</span>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-[#569cd6] animate-pulse ml-2">
            <ZapIcon size={11} />
            پردازش...
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {unsavedCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
              {unsavedCount} ذخیره‌نشده
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── ACTIVITY BAR ── */}
        <div className="flex flex-col bg-[#2c2c2c] border-r border-[#1a1a1a] w-12 flex-shrink-0">
          {SIDE_PANELS.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setSidePanel(id)}
              title={label}
              className={`w-12 h-12 flex items-center justify-center transition-colors relative group ${
                sidePanel === id
                  ? "text-white bg-[#1e1e1e] border-l-2 border-l-[#007acc]"
                  : "text-gray-500 hover:text-gray-200"
              }`}
            >
              {icon}
              <span className="absolute left-full ml-2 px-2 py-1 bg-[#252526] text-xs text-gray-200 rounded border border-[#3d3d3d] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT ── */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Side panel */}
          <ResizablePanel defaultSize={22} minSize={14} maxSize={45}>
            <div className="h-full flex flex-col border-r border-[#1a1a1a]">
              <div className="px-3 py-1.5 bg-[#252526] border-b border-[#1a1a1a] flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {sidePanel === "files"  && "درخت فایل"}
                  {sidePanel === "search" && "جستجوی پیشرفته"}
                  {sidePanel === "inject" && "تزریق پروژه"}
                  {sidePanel === "build"  && "بازسازی APK"}
                </span>
                {apkInfo && sidePanel === "files" && (
                  <span className="ml-auto text-[10px] text-gray-600 font-mono">{apkInfo.fileCount}f</span>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                {sidePanel === "files"  && <FileTree files={apkFiles} selectedFile={activeTab ?? undefined} onFileSelect={handleFileSelect} modifiedFiles={modifiedFiles} />}
                {sidePanel === "search" && <SearchPanel onSearch={handleSearch} onResultClick={handleSearchResultClick} />}
                {sidePanel === "inject" && <InjectPanel onInject={handleInject} hasApk={!!zip} />}
                {sidePanel === "build"  && <BuildPanel onBuild={handleBuild} apkInfo={apkInfo} hasApk={!!zip} modifiedCount={unsavedCount} />}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Editor area */}
          <ResizablePanel defaultSize={78} minSize={40}>
            {!zip ? (
              /* ── Welcome screen ── */
              <div className="flex flex-col items-center justify-center h-full bg-[#1e1e1e] select-none">
                <div className="text-center space-y-6 max-w-md px-6">
                  <div className="relative inline-block">
                    <div className="w-28 h-28 mx-auto bg-gradient-to-br from-[#007acc]/20 to-[#569cd6]/5 rounded-3xl flex items-center justify-center border border-[#007acc]/20 shadow-2xl shadow-[#007acc]/5">
                      <Cpu size={56} className="text-[#007acc]/50" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#252526] rounded-full flex items-center justify-center border border-[#569cd6]/40 shadow-lg">
                      <Upload size={14} className="text-[#569cd6]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white tracking-tight">APK Studio Pro</h1>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      ویرایشگر پیشرفته فایل‌های APK اندروید<br />
                      فایل APK خود را بارگذاری کنید
                    </p>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-[#007acc] hover:bg-[#005a9e] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#007acc]/25 hover:shadow-[#007acc]/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Upload size={16} />
                    بارگذاری فایل APK
                  </button>

                  <p className="text-xs text-gray-700">یا فایل را مستقیم اینجا drag کنید</p>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      ["📄", "ویرایش XML, Java, Smali, Kotlin"],
                      ["🔍", "جستجوی پیشرفته با Regex"],
                      ["📦", "تزریق پروژه از ZIP"],
                      ["⚡", "بازسازی APK + کنترل خطا"],
                      ["🗂️", "درخت فایل با فیلتر"],
                      ["💾", "ذخیره و دانلود فایل"],
                    ].map(([icon, label]) => (
                      <div key={label} className="flex items-center gap-2 bg-[#252526] p-2.5 rounded-lg text-xs text-gray-500 border border-[#2d2d2d] hover:border-[#3d3d3d] transition-colors">
                        <span className="text-sm">{icon}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <CodeEditor
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onTabClose={handleTabClose}
                onContentChange={handleContentChange}
                onSave={handleSave}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="h-[22px] bg-[#007acc] flex items-center px-3 gap-4 text-[11px] text-white flex-shrink-0 select-none">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
          آماده
        </span>
        {activeTab && (
          <>
            <span className="text-blue-100 opacity-60">|</span>
            <span className="text-blue-100 font-mono">{activeTab.split("/").pop()}</span>
            <span className="text-blue-200/50 truncate max-w-[300px] hidden md:block">{activeTab}</span>
          </>
        )}
        <span className="ml-auto text-blue-100 opacity-70">APK Studio Pro v2.0</span>
      </div>
    </div>
  );
}
