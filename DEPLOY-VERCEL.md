# 🚀 نشر Elsayad Scores على Vercel (رابط دائم مجاني)

بعد النشر هتحصل على رابط ثابت لا يفصل أبدًا، مثل:
`https://elsayad-scores.vercel.app`

---

## الخطوة 1: جهّز قاعدة بيانات سحابية مجانية (Neon)

1. ادخل على **https://neon.tech** وسجّل دخول (مجانًا عبر GitHub).
2. اضغط **Create Project** واختر اسمًا مثل `elsayad-scores`.
3. اختر المنطقة **Europe (Frankfurt)** لتطابق إعداد Vercel.
4. بعد الإنشاء، انسخ **Connection String**، شكله كده:
   ```
   postgresql://user:pass@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   > احتفظ به، هنستخدمه في الخطوة 3.

> بديل: تقدر تستخدم **Supabase** أو **Vercel Postgres** بنفس الفكرة.

---

## الخطوة 2: ارفع الكود على GitHub

من مجلد المشروع على جهازك:
```bash
git init
git add .
git commit -m "Elsayad Scores - initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/elsayad-scores.git
git push -u origin main
```
> ملف `.gitignore` يمنع رفع ملف `.env` (الأسرار) — تمام.

---

## الخطوة 3: انشر على Vercel

1. ادخل على **https://vercel.com** وسجّل دخول عبر GitHub.
2. اضغط **Add New… → Project**.
3. اختر مستودع `elsayad-scores`.
4. في قسم **Environment Variables** أضف:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | رابط Neon من الخطوة 1 |
5. اضغط **Deploy** وانتظر دقيقة.

✅ هيطلعلك رابط دائم مثل: `https://elsayad-scores.vercel.app`

---

## الخطوة 4: أنشئ جداول قاعدة البيانات

بعد أول نشر، شغّل أمر دفع المخطط على قاعدة Neon (مرة واحدة):

**من جهازك المحلي:**
```bash
# ضع رابط Neon مؤقتًا في متغيّر البيئة ثم ادفع المخطط
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" npx drizzle-kit push
```

> هذا ينشئ جدولي `api_cache` و `favorites` على قاعدة البيانات السحابية.
> بعدها افتح الرابط وستعمل كل الميزات (النتائج، الترتيب، المفضلة).

---

## الخطوة 5 (اختياري): ربط نطاق خاص بك

في Vercel → **Settings → Domains** أضف نطاقك (مثل `scores.example.com`)
واتبع تعليمات DNS.

---

## 🔄 التحديثات المستقبلية

أي تعديل في الكود:
```bash
git add .
git commit -m "تحديث"
git push
```
Vercel ينشر تلقائيًا النسخة الجديدة. 🎉

---

## 📱 بعد النشر: حوّله لتطبيق موبايل

استخدم رابط Vercel الدائم في:
- **PWABuilder** (لملف APK جاهز) — راجع `MOBILE-BUILD.md`
- أو **Capacitor** — وضع الرابط في `server.url` داخل `capacitor.config.json`

---

## ملخص المتغيّرات المطلوبة على Vercel

| المتغيّر | مطلوب؟ | الوصف |
|---------|--------|-------|
| `DATABASE_URL` | ✅ نعم | رابط PostgreSQL (Neon/Supabase) |

> ملاحظة: التطبيق يجلب بيانات المباريات حيًّا من 365scores ولا يحتاج أي مفتاح API.
