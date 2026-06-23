# 🚀 Canlı Yerləşdirmə Təlimatı (Railway + Vercel)

Bu layihə 3 hissədən ibarətdir: **PostgreSQL** + **Backend (Node)** + **Frontend (React)**.
Ən asan pulsuz yol: **Railway** (baza + backend) və **Vercel** (frontend).

Nəticədə dostlarına göndərə biləcəyin canlı link belə olacaq:
`https://senin-layihen.vercel.app`

---

## 0️⃣ Hazırlıq — GitHub-a yüklə

Həm Railway, həm Vercel GitHub-dan yerləşdirir.

```bash
cd smart-exam
git init
git add .
git commit -m "İlk versiya"
```

Sonra GitHub-da yeni repozitoriya yarat və:
```bash
git remote add origin https://github.com/İSTİFADƏÇİ/REPO.git
git branch -M main
git push -u origin main
```

> ⚠️ `.env` faylları `.gitignore`-dadır — şifrələr GitHub-a getməyəcək. Yaxşı.

---

## 1️⃣ Backend + PostgreSQL → Railway

1. [railway.app](https://railway.app) → **Login with GitHub**
2. **New Project → Deploy from GitHub repo** → repozitoriyanı seç
3. Railway layihəni tanıyacaq. **Settings → Root Directory** = `backend`
   (Backend `backend/Dockerfile` ilə qurulacaq.)
4. **New → Database → Add PostgreSQL** (eyni layihəyə)
5. Backend servisinin **Variables** bölməsinə bu dəyişənləri əlavə et:

   | Dəyişən | Dəyər |
   |---------|-------|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` *(Railway referansı)* |
   | `DATABASE_SSL` | `true` |
   | `JWT_SECRET` | uzun təsadüfi mətn (məs. 50 simvol) |
   | `CLIENT_ORIGIN` | *(hələlik boş — addım 3-də Vercel ünvanını yazacaqsan)* |
   | `ADMIN_EMAIL` | `admin@exam.local` |
   | `ADMIN_PASSWORD` | güclü şifrə |
   | `ADMIN_NAME` | `Sistem Admini` |

6. **Deploy** et. Açılanda **Settings → Networking → Generate Domain** → backend URL alırsan:
   `https://senin-backend.up.railway.app`
7. Yoxla: `https://senin-backend.up.railway.app/api/health` → `{"status":"ok"}` olmalıdır.

> Backend ilk açılışda bazanı avtomatik qurur və admini yaradır (init + seed).

---

## 2️⃣ Frontend → Vercel

1. [vercel.com](https://vercel.com) → **Login with GitHub**
2. **Add New → Project** → repozitoriyanı seç
3. **Root Directory** = `frontend` (Edit ilə seç)
4. Framework avtomatik **Vite** tanınacaq (Build: `npm run build`, Output: `dist`)
5. **Environment Variables**:

   | Dəyişən | Dəyər |
   |---------|-------|
   | `VITE_API_URL` | addım 1-dəki backend URL (məs. `https://senin-backend.up.railway.app`) |

6. **Deploy**. Bitəndə frontend linkin hazırdır:
   `https://senin-layihen.vercel.app`

---

## 3️⃣ İkisini birləşdir (CORS)

1. Vercel linkini kopyala.
2. Railway → backend → **Variables** → `CLIENT_ORIGIN` =
   `https://senin-layihen.vercel.app`
3. Backend yenidən deploy olacaq.

---

## ✅ Hazırdır!

- Canlı link: `https://senin-layihen.vercel.app`
- Admin girişi: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (Railway-də təyin etdiyin)
- Dostların qeydiyyatdan keçib öz Excel fayllarını yükləyə, imtahan verə bilər.

---

## 🔁 Yeniləmə

Kodu dəyişib `git push` etsən, Railway və Vercel **avtomatik** yenidən yerləşdirir.

## ⚠️ Sxem dəyişikliyi olarsa

Verilənlər bazası strukturu dəyişsə (yeni sütun və s.), mövcud cədvəllər avtomatik
yenilənmir. Railway-də backend servisinin shell-ində bir dəfə işlət:
```bash
npm run db:reset   # DİQQƏT: bütün məlumat silinir
npm run db:seed
```

## 🌐 Alternativlər

- **Render.com** — Railway əvəzinə (eyni məntiq: Node + PostgreSQL)
- **Netlify** — Vercel əvəzinə (frontend üçün)
- **VPS + Docker** — `docker compose up` ilə tək serverdə hər şey
