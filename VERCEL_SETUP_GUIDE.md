# הוראות הגדרת Vercel לעדכונים אוטומטיים

## הקוד שלך כבר ב-GitHub! 🎉
**קישור ל-Repository:** https://github.com/nadavt2012/comsign-pricing-calculator

## שלבים להגדרת עדכונים אוטומטיים:

### שלב 1: הרשמה ל-Vercel (חינם)
1. כנס לאתר: https://vercel.com
2. לחץ על "Sign Up" 
3. בחר "Continue with GitHub" (התחבר עם חשבון ה-GitHub שלך)

### שלב 2: חיבור ה-Repository
1. אחרי התחברות, לחץ על "Add New..." → "Project"
2. מצא את הפרויקט: `comsign-pricing-calculator`
3. לחץ "Import"

### שלב 3: הגדרות הפרויקט
**בעמוד הגדרות הפרויקט, הגדר:**

**Root Directory:** השאר ריק או `.`

**Build Settings:**
- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### שלב 4: הגדרת משתני הסביבה (Environment Variables)
**לחץ על "Environment Variables" והוסף:**

**משתנים חובה:**
- `NODE_ENV` = `production`
- `DATABASE_URL` = `[הכנס את ה-DATABASE_URL מ-Replit]`
- `ADMIN_PASSWORD` = `[הסיסמה למנהל]`
- `MANAGER_PASSWORD` = `[הסיסמה לעובד]`

**הגדרות CORS (אופציונליות):**
- `ALLOWED_ORIGINS` = `https://your-vercel-app.vercel.app`
- `PRODUCTION_DOMAIN` = `https://your-vercel-app.vercel.app`

### שלב 5: פרסום
1. לחץ "Deploy"
2. חכה כמה דקות עד לסיום
3. תקבל קישור לאתר החדש!

## איך לעדכן את האתר בעתיד:

### דרך 1: ישירות ב-Replit (הכי פשוט!)
1. עשה שינויים בקוד ב-Replit
2. הרץ: `node update-github.js` (קובץ שאני אכין)
3. האתר יתעדכן אוטומטית תוך כמה דקות!

### דרך 2: דרך GitHub
1. עשה שינויים בקוד
2. דחף אותם ל-GitHub
3. Vercel יזהה אוטומטית ויעדכן את האתר

## יתרונות הפתרון:
✅ עדכונים אוטומטיים תוך דקות
✅ חינם לחלוטין
✅ גיבוי של כל הקוד ב-GitHub  
✅ היסטוריה מלאה של שינויים
✅ אמין יותר מפרסום Replit
✅ מהיר ויציב

## אם יש בעיות:
1. בדוק שכל משתני הסביבה מוגדרים נכון
2. וודא שה-DATABASE_URL תקף
3. בדוק את ה-Build Logs ב-Vercel לשגיאות

**זה הכל! האתר שלך יתעדכן אוטומטית מעכשיו! 🚀**