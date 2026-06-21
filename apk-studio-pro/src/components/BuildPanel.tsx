import { useState } from "react";
import { Hammer, Download, AlertTriangle, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronRight, Info } from "lucide-react";
import { BuildError, ApkInfo, formatFileSize } from "@/lib/apk-utils";

interface BuildPanelProps {
  onBuild: () => Promise<{ blob: Blob; errors: BuildError[] }>;
  apkInfo?: ApkInfo;
  hasApk: boolean;
  modifiedCount: number;
}

function ErrorItem({ error }: { error: BuildError }) {
  const isError = error.type === "error";
  return (
    <div className={`flex gap-2 p-2.5 rounded-lg text-xs border ${isError ? "bg-red-500/8 border-red-500/20" : "bg-yellow-500/8 border-yellow-500/20"}`}>
      {isError
        ? <AlertCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
        : <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0 space-y-0.5">
        {error.file && (
          <p className={`font-mono text-[10px] truncate ${isError ? "text-red-300" : "text-yellow-300"}`}>
            {error.file}{error.line ? `:${error.line}` : ""}
          </p>
        )}
        <p className={isError ? "text-red-200" : "text-yellow-200"}>{error.message}</p>
      </div>
    </div>
  );
}

export function BuildPanel({ onBuild, apkInfo, hasApk, modifiedCount }: BuildPanelProps) {
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<{ blob: Blob; errors: BuildError[] } | null>(null);
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  const handleBuild = async () => {
    setBuilding(true);
    setBuildResult(null);
    try {
      setBuildResult(await onBuild());
    } catch (e) {
      setBuildResult({ blob: new Blob(), errors: [{ file: "", message: (e as Error).message, type: "error" }] });
    } finally { setBuilding(false); }
  };

  const handleDownload = () => {
    if (!buildResult?.blob || buildResult.blob.size === 0) return;
    const url = URL.createObjectURL(buildResult.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = apkInfo?.name?.replace(".apk", "") + "-modified.apk" || "output-modified.apk";
    a.click();
    URL.revokeObjectURL(url);
  };

  const errors = buildResult?.errors.filter((e) => e.type === "error") ?? [];
  const warnings = buildResult?.errors.filter((e) => e.type === "warning") ?? [];
  const buildSuccess = buildResult && errors.length === 0;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-y-auto scrollbar-thin">
      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Hammer size={14} className="text-[#569cd6]" />
            بازسازی APK
          </h3>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            تغییرات را اعمال کن، خطاها را بررسی کن و APK جدید را دانلود کن
          </p>
        </div>

        {apkInfo && (
          <div className="bg-[#252526] rounded-xl p-3 space-y-2 border border-[#2d2d2d]">
            <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
              <Info size={10} /> اطلاعات APK
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              {[
                ["نام", apkInfo.name],
                ["حجم", formatFileSize(apkInfo.size)],
                ["فایل‌ها", apkInfo.fileCount.toString()],
                ["Package", apkInfo.packageName ?? "—"],
                ["نسخه", apkInfo.versionName ?? "—"],
                ["Min SDK", apkInfo.minSdkVersion ?? "—"],
                ["Target SDK", apkInfo.targetSdkVersion ?? "—"],
                ["Version Code", apkInfo.versionCode ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-1">
                  <span className="text-gray-600">{k}</span>
                  <span className="text-gray-300 truncate font-mono text-[10px]" title={v}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {modifiedCount > 0 && (
          <div className="flex items-start gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
            <span>{modifiedCount} فایل ذخیره‌نشده در ویرایشگر دارید. هنگام build، همه اعمال می‌شوند.</span>
          </div>
        )}

        <button
          onClick={handleBuild}
          disabled={!hasApk || building}
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-[#007acc] to-[#0062a3] hover:from-[#0062a3] hover:to-[#004d80] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-[#007acc]/20"
        >
          {building
            ? <><Loader2 size={16} className="animate-spin" /> در حال بررسی و بازسازی...</>
            : <><Hammer size={16} /> ساخت APK</>}
        </button>
      </div>

      {buildResult && (
        <div className="px-4 pb-4 space-y-3">
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium border ${
            buildSuccess
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}>
            {buildSuccess
              ? <><CheckCircle2 size={16} /> ساخت موفق — آماده دانلود</>
              : <><AlertCircle size={16} /> {errors.length} خطا — قبل از نصب برطرف کنید</>}
          </div>

          {buildSuccess && buildResult.blob.size > 0 && (
            <button onClick={handleDownload}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-green-600/20">
              <Download size={14} />
              دانلود APK ({formatFileSize(buildResult.blob.size)})
            </button>
          )}

          {errors.length > 0 && (
            <div className="space-y-1.5">
              <button onClick={() => setShowErrors(!showErrors)}
                className="flex items-center gap-1.5 text-xs text-red-400 font-medium hover:text-red-300 transition-colors">
                {showErrors ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                خطاها ({errors.length})
              </button>
              {showErrors && <div className="space-y-1.5">{errors.map((e, i) => <ErrorItem key={i} error={e} />)}</div>}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-1.5">
              <button onClick={() => setShowWarnings(!showWarnings)}
                className="flex items-center gap-1.5 text-xs text-yellow-400 font-medium hover:text-yellow-300 transition-colors">
                {showWarnings ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                هشدارها ({warnings.length})
              </button>
              {showWarnings && <div className="space-y-1.5">{warnings.map((w, i) => <ErrorItem key={i} error={w} />)}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
