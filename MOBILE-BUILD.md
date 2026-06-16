# 📱 تحويل Elsayad Scores إلى تطبيق موبايل (APK + iOS)

تطبيقك هو **Next.js** فيه واجهات سيرفر (API routes) تجلب البيانات الحيّة من 365scores،
لذلك لا يمكن تصديره كملفات ثابتة فقط — لابد أن يعمل سيرفر التطبيق على الإنترنت،
ثم نغلّفه في تطبيق موبايل أصلي.

يوجد 3 طرق مرتبة من الأسهل للأقوى 👇

---

## ✅ الطريقة 1: PWA (الأسهل — بدون أي برمجة)

التطبيق **جاهز كـ PWA بالفعل** (أضفنا `manifest.webmanifest` + أيقونة).

**على أندرويد (Chrome):**
1. افتح رابط الموقع في متصفح Chrome.
2. اضغط زر القائمة (⋮) → **"تثبيت التطبيق" / Add to Home screen**.
3. هيظهر أيقونة على الشاشة ويفتح بملء الشاشة كتطبيق عادي.

**على آيفون (Safari):**
1. افتح الرابط في Safari.
2. اضغط زر المشاركة (□↑) → **"إضافة إلى الشاشة الرئيسية"**.

> هذه الطريقة لا تنتج ملف APK لكنها أسرع طريقة لتجربة التطبيق على الموبايل.

---

## ✅ الطريقة 2: ملف APK جاهز عبر PWABuilder (الأسهل للحصول على APK)

1. انشر الموقع أونلاين أولًا (انظر قسم "النشر" بالأسفل).
2. ادخل على موقع **https://www.pwabuilder.com**
3. الصق رابط موقعك واضغط **Start**.
4. اختر **Android** → **Generate Package** → ستحصل على ملف `.apk` و `.aab` جاهز.
5. لـ iOS اختر **iOS** → ستحصل على مشروع Xcode جاهز للرفع على App Store.

> هذه أسرع طريقة لإنتاج APK حقيقي بدون تثبيت Android Studio.

---

## ✅ الطريقة 3: Capacitor (الاحترافية — تحكم كامل + صلاحيات الجهاز)

هذه الطريقة تعطيك تطبيق أصلي كامل مع إمكانية الوصول لصلاحيات الجهاز
(الإشعارات، الكاميرا، الملفات... إلخ). جهّزنا لك ملف `capacitor.config.json` بالفعل.

### المتطلبات
- **للأندرويد:** [Android Studio](https://developer.android.com/studio) + JDK 17.
- **للآيفون:** جهاز Mac + [Xcode](https://developer.apple.com/xcode/) + حساب Apple Developer (للنشر).
- Node.js مثبت على جهازك.

### الخطوات بالتفصيل

#### 1) انشر سيرفر التطبيق أونلاين
لأن التطبيق يحتاج API routes، انشره على Vercel (مجاني):
```bash
npm i -g vercel
vercel            # اتبع التعليمات، واضبط DATABASE_URL في إعدادات المشروع
vercel --prod     # للنشر النهائي
```
احفظ الرابط الناتج، مثلًا: `https://elsayad-scores.vercel.app`

#### 2) ثبّت Capacitor في المشروع
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
```

#### 3) عدّل ملف `capacitor.config.json`
غيّر قيمة `server.url` إلى رابط موقعك المنشور:
```json
"server": { "url": "https://elsayad-scores.vercel.app", "androidScheme": "https" }
```
> هذا يجعل التطبيق يفتح موقعك الحيّ مباشرةً، فتظل البيانات تتحدّث لحظيًا.

#### 4) أضف المنصّات
```bash
npx cap add android
npx cap add ios       # على جهاز Mac فقط
npx cap sync
```

#### 5) ابنِ ملف APK (أندرويد)
```bash
npx cap open android   # يفتح المشروع في Android Studio
```
داخل Android Studio:
- من القائمة: **Build → Build Bundle(s)/APK(s) → Build APK(s)**
- ستجد الملف في:
  `android/app/build/outputs/apk/debug/app-debug.apk`
- لنسخة موقّعة للنشر على Google Play: **Build → Generate Signed Bundle/APK** ثم أنشئ keystore.

أو من سطر الأوامر:
```bash
cd android
./gradlew assembleDebug          # APK للتجربة
./gradlew assembleRelease        # APK/AAB للنشر (بعد ضبط التوقيع)
```

#### 6) ابنِ نسخة iOS (على Mac)
```bash
npx cap open ios       # يفتح المشروع في Xcode
```
داخل Xcode:
- اختر فريق التطوير (Signing & Team).
- وصّل آيفون أو اختر Simulator واضغط ▶️ للتشغيل.
- للنشر: **Product → Archive** ثم ارفع إلى App Store Connect.

---

## 🌐 النشر (مطلوب للطريقتين 2 و 3)

أسهل خيار هو **Vercel** (متوافق 100% مع Next.js):
1. ارفع الكود على GitHub.
2. ادخل https://vercel.com → New Project → اختر المستودع.
3. أضف متغير البيئة `DATABASE_URL` (قاعدة بيانات PostgreSQL — مثل Neon أو Supabase مجانًا).
4. اضغط Deploy.

> قاعدة بيانات مجانية: [neon.tech](https://neon.tech) أو [supabase.com](https://supabase.com)

---

## 🎨 أيقونة وشاشة البداية (Splash) للتطبيق
بعد إضافة Capacitor، استخدم أداة الأيقونات الرسمية:
```bash
npm install -D @capacitor/assets
# ضع صورة 1024x1024 باسم icon.png و splash.png في مجلد assets/
npx capacitor-assets generate
```

---

## ملخص سريع

| الطريقة | تنتج APK؟ | الصعوبة | الأنسب لـ |
|--------|-----------|---------|-----------|
| PWA | ❌ (تثبيت مباشر) | ⭐ سهل جدًا | تجربة سريعة |
| PWABuilder | ✅ | ⭐⭐ سهل | الحصول على APK بسرعة |
| Capacitor | ✅ | ⭐⭐⭐ متوسط | تطبيق احترافي + صلاحيات الجهاز |

**توصيتي:** ابدأ بـ **PWABuilder** للحصول على APK فورًا، وانتقل لـ **Capacitor** لو احتجت ميزات الجهاز الأصلية أو النشر على المتاجر.
