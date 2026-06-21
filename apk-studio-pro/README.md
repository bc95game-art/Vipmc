# APK Studio Pro 🔧

> ویرایشگر پیشرفته فایل‌های APK اندروید — ساخته‌شده با React + Vite + Monaco Editor

[![Build](https://github.com/YOUR_USERNAME/apk-studio-pro/actions/workflows/build-web.yml/badge.svg)](https://github.com/YOUR_USERNAME/apk-studio-pro/actions)
![Version](https://img.shields.io/badge/version-2.0.0-007acc?style=flat-square)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)

---

## ✨ قابلیت‌ها

| | قابلیت | توضیح |
|---|--------|-------|
| 📁 | **درخت فایل کامل** | نمایش ساختار درختی تمام فایل‌های APK با آیکون هر نوع |
| ⚡ | **ویرایشگر Monaco** | موتور VS Code با Syntax Highlighting برای XML، Java، Smali، Kotlin، JSON |
| 🔍 | **جستجوی پیشرفته** | جستجو در همه فایل‌های متنی با پشتیبانی Regex، حساسیت به حروف، فیلتر نوع فایل |
| 📦 | **تزریق پروژه ZIP** | وارد کردن فایل‌های پروژه از zip به مسیر دلخواه داخل APK |
| 🔨 | **بازسازی APK** | بررسی خطاهای manifest، XML، و code؛ دانلود APK ویرایش‌شده |
| 🎨 | **Dark Theme** | رابط کاربری حرفه‌ای شبیه VS Code |
| 🗂️ | **چند تب همزمان** | باز کردن چندین فایل در تب‌های جداگانه |
| 💾 | **ذخیره و دانلود** | Ctrl+S یا دکمه ذخیره؛ دانلود مستقیم فایل |

---

## 🚀 شروع سریع

### روش ۱ — محلی (Local)

```bash
# نصب وابستگی‌ها
npm install

# اجرا در حالت توسعه (http://localhost:3000)
npm run dev

# ساخت نسخه نهایی
npm run build
```

### روش ۲ — GitHub Pages (خودکار)

1. این پروژه را Fork یا Clone کن
2. در تنظیمات ریپو برو به **Settings → Pages**
3. **Source** را روی **GitHub Actions** تنظیم کن
4. Push کن → برنامه خودکار build و deploy می‌شود ✅

---

## 📋 GitHub Actions

دو workflow وجود دارد:

### `build-web.yml` — استقرار وب‌اپ روی GitHub Pages
فعال می‌شود هر بار که push می‌کنی.

### `build-apk.yml` — ساخت APK از پروژه React Native/Expo
اگر یک فایل `.zip` از پروژه Android خود در root ریپو قرار دهی، این workflow:
- zip را استخراج می‌کند
- Android SDK و Java 17 را نصب می‌کند
- آیکون‌های adaptive را اصلاح می‌کند
- APK می‌سازد و آپلود می‌کند

---

## 📖 نحوه استفاده

1. **بارگذاری** — فایل APK را drag & drop کن یا دکمه را بزن
2. **مرور فایل‌ها** — از درخت فایل سمت چپ، روی فایل‌های متنی کلیک کن
3. **ویرایش** — با Monaco Editor (مثل VS Code) ویرایش کن
4. **ذخیره** — `Ctrl+S` یا دکمه ذخیره
5. **جستجو** — آیکون 🔍 → جستجو در همه فایل‌ها
6. **تزریق** — آیکون 📁+ → فایل zip پروژه‌ات را وارد APK کن
7. **بازسازی** — آیکون 🔨 → ساخت APK ویرایش‌شده + بررسی خطا

---

## 🗂️ ساختار پروژه

```
apk-studio-pro/
├── .github/
│   └── workflows/
│       ├── build-web.yml       # Deploy to GitHub Pages
│       └── build-apk.yml       # Build Android APK
├── public/
│   └── favicon.svg
├── src/
│   ├── lib/
│   │   ├── apk-utils.ts        # منطق اصلی: parse, search, inject, build
│   │   └── utils.ts            # ابزارهای عمومی (cn)
│   ├── components/
│   │   ├── FileTree.tsx        # درخت فایل با فیلتر
│   │   ├── CodeEditor.tsx      # ویرایشگر Monaco با تب‌های چندگانه
│   │   ├── SearchPanel.tsx     # جستجوی پیشرفته با Regex
│   │   ├── InjectPanel.tsx     # تزریق پروژه از ZIP
│   │   ├── BuildPanel.tsx      # بازسازی APK + نمایش خطا
│   │   └── ui/
│   │       └── resizable.tsx   # پنل‌های قابل تغییر اندازه
│   ├── pages/
│   │   └── apk-studio.tsx      # صفحه اصلی برنامه
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🛠️ تکنولوژی‌ها

| | پکیج | هدف |
|---|------|-----|
| ⚛️ | React 19 + TypeScript | فریم‌ورک اصلی |
| ⚡ | Vite 6 | Build tool سریع |
| 📝 | Monaco Editor | ویرایشگر کد (موتور VS Code) |
| 🗜️ | JSZip | پردازش APK/ZIP در مرورگر |
| 🎨 | Tailwind CSS v4 | استایل |
| 🧩 | Radix UI | کامپوننت‌های UI |
| 📐 | react-resizable-panels | پنل‌های قابل resize |
| 🔔 | Sonner | نوتیفیکیشن |

---

## ⚠️ نکته مهم

APK یک فایل ZIP است. این ابزار محتوای آن را در مرورگر استخراج، ویرایش، و دوباره بسته‌بندی می‌کند.
برای decompile کامل کد Smali/Java به [apktool](https://apktool.org/) جداگانه نیاز دارید.

---

## 📄 License

MIT © 2025 — آزاد برای استفاده و توسعه
