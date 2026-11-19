// إعدادات زمن الأريل
// اتركها فاضية = وضع تجريبي (الذكريات تنحفظ في جهاز كل شخص فقط).
// عبّها من Supabase → Project Settings → API عشان تصير الذكريات مشتركة بين الكل.
// المفتاح العام (anon / publishable) آمن يكون في الموقع، لأن الحماية في سياسات RLS بملف setup.sql.
// لا تحط هنا أبداً مفتاح service_role.
window.ZA_CONFIG = {
  supabaseUrl: "",      // مثال: "https://abcdxyz.supabase.co"
  supabaseAnonKey: ""   // مثال: "eyJhbGciOi..."
};
