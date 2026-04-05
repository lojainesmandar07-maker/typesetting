# Bubble Liner — أداة تقسيم فقاعات المانهوا/المانغا

Bubble Liner أداة ويب خفيفة (HTML/CSS/JS فقط) تساعدك في اقتراح أفضل تقسيم أسطر للنص داخل الفقاعات حسب قواعد التدرّج والتوازن.  
تدعم العربية والإنجليزية وتعرض أفضل نتيجة + بديلين مع نسخ مباشر.

## التشغيل محلياً
1. نزّلي الملفات ككل في مجلد واحد.
2. افتحي `index.html` مباشرة في المتصفح.
3. الصقي النص ثم اضغطي **معالجة** أو `Ctrl+Enter`.

## النشر على Cloudflare Pages (Drag & Drop)
1. جهّزي مجلد المشروع وفيه الملفات: `index.html`, `style.css`, `formatter.js`, `app.js`, `README.md`.
2. ادخلي إلى Cloudflare Dashboard.
3. افتحي **Workers & Pages** ثم **Create application**.
4. اختاري **Pages** ثم **Upload assets**.
5. اسحبي المجلد (أو ملف zip بعد فكّه) داخل الرفع.
6. انتظري النشر ثم افتحي الرابط المباشر.

## إذا كنتِ لا تعرفين البرمجة
- لا تحتاجين أي أوامر أو تثبيت.
- فقط افتحي `index.html` وشغّلي الأداة فوراً.
- لو أردتِ نشرها: ارفعي الملفات كما هي على Cloudflare Pages.

## تعديل الألوان
- الألوان الأساسية موجودة في أعلى `style.css` داخل `:root` (تقريباً الأسطر 1–14).
- أهم متغيرين للتعديل السريع:
  - `--bg` لخلفية الصفحة
  - `--accent` للون الأزرار والإبراز

## ملاحظات تطوير مستقبلية
- Photoshop Plugin لنسخ/لصق مباشر داخل ملفات العمل.
- نسخة Desktop app بدون متصفح.
- تحسين hyphenation الإنجليزي بقاموس مقاطع صوتية أدق.
- إضافة معاينة مرئية لشكل الفقاعة.

## مهم جداً: الفرق بين Pages و Workers (سبب الخطأ الشائع)
إذا كان مشروعك **Static HTML/CSS/JS فقط** فالأفضل استخدام:
- **Cloudflare Pages** (Drag-and-drop من الواجهة)
- أو CLI: `npx wrangler pages deploy .`

ولا تستخدمي `npx wrangler deploy` إلا إذا كنتِ تقصدين **Workers**.

### لماذا ظهر لك الخطأ `[code: 10013]`؟
من السجل الذي أرسلتيه، الأمر المستخدم كان:
- `npx wrangler deploy`

وهذا يدفع Wrangler لمحاولة نشره كـ **Worker مع assets upload session**. في حال وجود مشكلة داخل API/الحساب/الجلسة أثناء رفع الأصول، قد يظهر الخطأ العام `10013`.

باختصار:
- مشروعك هنا static ومناسب لـ **Pages**.
- الخطأ ليس من HTML/CSS/JS نفسه.
- استخدمي `wrangler pages deploy .` أو الرفع اليدوي من لوحة Pages.

### إعداد CI صحيح لمشروعك
بدلاً من:
- `npx wrangler deploy`

استخدمي:
- `npx wrangler pages deploy . --project-name=<YOUR_PAGES_PROJECT>`

## Troubleshooting سريع (لو استمر الفشل)
1. تأكدي أن API Token لديه صلاحيات Pages المطلوبة (Pages Write + Account access).
2. جرّبي تحديث Wrangler (مثلاً آخر إصدار): `npm i -D wrangler@latest`.
3. جرّبي إعادة المحاولة (أحياناً يكون عطل مؤقت من Cloudflare API).
4. تابعي حالة الخدمة: https://www.cloudflarestatus.com/
5. إذا استمر 10013 بنفس النمط، افتحي تذكرة دعم/Issue مع السجل.
