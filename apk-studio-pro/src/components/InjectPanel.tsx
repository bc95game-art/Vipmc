import { useState, useRef } from "react";
import { Upload, FolderInput, CheckCircle2, AlertCircle, Loader2, Package, Info } from "lucide-react";

interface InjectPanelProps {
  onInject: (zipFile: File, targetPath: string) => Promise<string[]>;
  hasApk: boolean;
}

export function InjectPanel({ onInject, hasApk }: InjectPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetPath, setTargetPath] = useState("assets/injected");
  const [injecting, setInjecting] = useState(false);
  const [injectedFiles, setInjectedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".zip")) {
      setError("فقط فایل‌های .zip قابل قبول هستند");
      return;
    }
    setSelectedFile(file);
    setError(null);
    setInjectedFiles([]);
  };

  const handleInject = async () => {
    if (!selectedFile || !hasApk) return;
    setInjecting(true);
    setError(null);
    try {
      const files = await onInject(selectedFile, targetPath);
      setInjectedFiles(files);
    } catch (e) {
      setError((e as Error).message || "خطا در تزریق پروژه");
    } finally { setInjecting(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-y-auto scrollbar-thin">
      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FolderInput size={14} className="text-[#569cd6]" />
            تزریق پروژه ZIP
          </h3>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            فایل‌های پروژه‌ات را از zip وارد APK کن. فایل‌های zip به‌عنوان asset یا source تزریق می‌شوند.
          </p>
        </div>

        {!hasApk && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            <span>ابتدا یک فایل APK بارگذاری کنید تا بتوانید پروژه تزریق کنید</span>
          </div>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver ? "border-[#007acc] bg-[#007acc]/10 scale-[1.02]"
            : selectedFile ? "border-green-500/50 bg-green-500/5 hover:border-green-400/70"
            : "border-[#3d3d3d] hover:border-[#007acc]/50 hover:bg-[#007acc]/5"
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {selectedFile ? (
            <div className="space-y-1.5">
              <Package size={28} className="mx-auto text-green-400" />
              <p className="text-sm text-green-400 font-medium">{selectedFile.name}</p>
              <p className="text-[11px] text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              <p className="text-[10px] text-green-600">برای تغییر فایل کلیک کنید</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={28} className="mx-auto text-gray-600" />
              <p className="text-sm text-gray-400 font-medium">فایل ZIP را اینجا بکش و رها کن</p>
              <p className="text-[11px] text-gray-600">یا کلیک کن تا فایل انتخاب کنی</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
            مسیر تزریق در APK
            <span title="فایل‌های zip در این مسیر داخل APK قرار می‌گیرند">
              <Info size={10} className="text-gray-600" />
            </span>
          </label>
          <input type="text" value={targetPath} onChange={(e) => setTargetPath(e.target.value)}
            placeholder="assets/injected"
            className="w-full bg-[#2d2d2d] text-xs text-gray-200 placeholder-gray-600 px-3 py-2 rounded border border-[#3d3d3d] focus:outline-none focus:border-[#007acc] transition-colors font-mono" />
          <p className="text-[10px] text-gray-600">
            خالی بذارید → root ‌APK | مثلاً: <code className="text-[#569cd6]">assets/my-project</code>
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {injectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 size={12} />
              <span>{injectedFiles.length} فایل با موفقیت تزریق شد</span>
            </div>
            <div className="bg-[#252526] rounded-lg p-2.5 max-h-36 overflow-y-auto scrollbar-thin border border-[#3d3d3d]">
              {injectedFiles.map((f, i) => (
                <div key={i} className="text-[10px] text-gray-400 font-mono truncate py-0.5">
                  <span className="text-green-600 mr-1">+</span>{f}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleInject}
          disabled={!selectedFile || !hasApk || injecting}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#569cd6] hover:bg-[#4e8cbf] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-[#007acc]/10"
        >
          {injecting
            ? <><Loader2 size={14} className="animate-spin" /> در حال تزریق...</>
            : <><FolderInput size={14} /> تزریق به APK</>}
        </button>
      </div>
    </div>
  );
}
