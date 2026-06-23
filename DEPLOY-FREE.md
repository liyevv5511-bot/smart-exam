# 🆓 Tam Pulsuz Yerləşdirmə (Neon + Render + Vercel)

Heç pul ödəmədən canlı link. Sıra: **Baza → Backend → Frontend**.

---

## 1️⃣ PostgreSQL → Neon (pulsuz, daimi)

1. 👉 https://neon.tech → **Sign up** (GitHub ilə)
2. **Create project** → ad ver (məs. `smart-exam`) → region seç → **Create**
3. Açılan səhifədə **Connection string** görünəcək — onu **kopyala**.
   Belə görünür:
   `postgresql://user:parol@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
4. Bu mətni saxla — Render-də lazım olacaq.

---

## 2️⃣ Backend → Render (pulsuz)

1. 👉 https://render.com → **Get Started** (GitHub ilə gir)
2. Dashboard → **New +** → **Web Service**
3. **Build and deploy from a Git repository** → `smart-exam` reposunu seç (Connect)
4. Tənzimləmələr:
   - **Name**: `smart-exam-backend`
   - **Root Directory**: `backend`
   - **Runtime / Language**: **Docker** (avtomatik tanınmalıdır — backend/Dockerfile var)
   - **Instance Type**: **Free**
5. Aşağıda **Environment Variables** → bunları əlavə et:

   | Açar | Dəyər |
   |------|-------|
   | `DATABASE_URL` | Neon-dan kopyaladığın connection string |
   | `DATABASE_SSL` | `true` |
   | `JWT_SECRET` | uzun təsadüfi mətn (40+ simvol) |
   | `ADMIN_EMAIL` | `admin@exam.local` |
   | `ADMIN_PASSWORD` | güclü şifrə (yadda saxla!) |
   | `ADMIN_NAME` | `Sistem Admini` |

6. **Create Web Service** → gözlə (ilk qurulma 3–5 dəq).
7. Bitəndə yuxarıda backend linkin görünəcək:
   `https://smart-exam-backend.onrender.com`
8. Yoxla: `https://smart-exam-backend.onrender.com/api/health` → `{"status":"ok"}`

> ⚠️ Pulsuz Render 15 dəq istifadəsizlikdən sonra "yatır". İlk açılış ~30 saniyə gec olur — normaldır.

---

## 3️⃣ Frontend → Vercel (pulsuz)

1. 👉 https://vercel.com → **Login with GitHub**
2. **Add New → Project** → `smart-exam` reposunu seç
3. **Root Directory** = `frontend` (Edit ilə seç)
4. Framework: **Vite** (avtomatik)
5. **Environment Variables**:

   | Açar | Dəyər |
   |------|-------|
   | `VITE_API_URL` | Render backend linki (məs. `https://smart-exam-backend.onrender.com`) |

6. **Deploy** → bitəndə canlı linkin hazırdır:
   `https://smart-exam.vercel.app`

---

## 4️⃣ Birləşdir (CORS)

1. Vercel linkini kopyala.
2. Render → backend → **Environment** → əlavə et:
   - `CLIENT_ORIGIN` = `https://smart-exam.vercel.app`
3. Render avtomatik yenidən deploy edəcək.

---

## ✅ Hazır!

- **Dostlara göndərəcəyin link**: Vercel linki (`https://smart-exam.vercel.app`)
- Admin girişi: Render-də təyin etdiyin `ADMIN_EMAIL` / `ADMIN_PASSWORD`

## 🔁 Yeniləmə

`git push` etsən, Render və Vercel avtomatik yenidən qurur.
