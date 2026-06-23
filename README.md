# 🎓 Ağıllı İmtahan Sistemi

Tələbələr üçün tam istehsala hazır veb tətbiqi. Tələbələr Excel faylı yükləyir, sistem avtomatik imtahan yaradır, sualları təsadüfiləşdirir, nəticələri izləyir və yalnız **səhv cavablandırılmış** sualları təkrarlamağa imkan verir.

---

## 🧱 Texnologiya Yığını

| Qat | Texnologiyalar |
|-----|----------------|
| **Frontend** | React 18 · TypeScript · Tailwind CSS · Framer Motion · React Router · Recharts |
| **Backend** | Node.js · Express · TypeScript · Zod |
| **Verilənlər bazası** | PostgreSQL |
| **Doğrulama** | JWT · bcrypt (parol heşləməsi) |
| **Fayllar** | XLSX (Excel təhlili) · Multer |

---

## 📁 Qovluq Strukturu

```
smart-exam/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server
│   │   ├── db/
│   │   │   ├── schema.sql        # PostgreSQL sxeması (cədvəllər)
│   │   │   ├── pool.ts           # DB bağlantısı
│   │   │   ├── init.ts           # Sxemi qur (npm run db:init)
│   │   │   ├── seed.ts           # İlk admin (npm run db:seed)
│   │   │   └── sample-generator.ts  # Nümunə Excel yaradıcısı
│   │   ├── middleware/           # auth, upload
│   │   ├── routes/               # auth, tests, exams, stats, profile, admin, notifications
│   │   └── utils/                # jwt, excel, shuffle, grade
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/                  # axios klient
    │   ├── context/             # AuthContext, ThemeContext
    │   ├── components/          # Layout, AuthShell, StatCard, ProtectedRoute
    │   ├── pages/               # Login, Register, Dashboard, Upload, ExamRunner, ...
    │   └── types/
    └── package.json
```

---

## 🗄️ Verilənlər Bazası Sxeması

| Cədvəl | Təyinat |
|--------|---------|
| `users` | İstifadəçilər (student/admin), bcrypt heş |
| `password_resets` | Şifrə bərpa tokenləri |
| `tests` | Yüklənmiş sual bankları (Excel) |
| `questions` | Suallar + A/B/C/D + düzgün cavab + izah |
| `exam_sessions` | İmtahan cəhdləri (rejim, təsadüfi sıra, nəticə) |
| `exam_answers` | Hər sual üçün tələbə cavabı + variant qarışıqlığı |
| `notifications` | Bildirişlər |
| `user_stats` *(view)* | Aqreqasiya: orta bal, uğur nisbəti |

> Tam sxem: [`backend/src/db/schema.sql`](backend/src/db/schema.sql)

---

## 🐳 Docker ilə (ən asan — bir əmr)

PostgreSQL, backend və frontend birlikdə qalxır:

```bash
cd smart-exam
docker compose up --build
```

- Tətbiq: **http://localhost:8080**
- API: http://localhost:4000
- Admin avtomatik yaradılır: `admin@exam.local` / `Admin12345!`

> İstehsalda `docker-compose.yml` içində `JWT_SECRET` və `ADMIN_PASSWORD` dəyişin.

---

## 🚀 Əl ilə Quraşdırma

### 0. Tələblər
- Node.js ≥ 18
- PostgreSQL ≥ 13 (işləyən)

### 1. Verilənlər bazası yarat
```bash
createdb smart_exam
# və ya: psql -c "CREATE DATABASE smart_exam;"
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # DATABASE_URL və JWT_SECRET dəyərlərini düzəlt
npm install
npm run db:init               # cədvəlləri yarat
npm run db:seed               # ilk admin hesabı
npm run dev                   # → http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                   # → http://localhost:5173
```

### 4. Nümunə Excel (istəyə bağlı)
```bash
cd backend
npx tsx src/db/sample-generator.ts   # nümunə-suallar.xlsx yaradır
```

---

## 🔐 Standart Admin

`.env` faylındakı dəyərlər (dəyişdirin!):
```
admin@exam.local / Admin12345!
```

---

## 🆕 Peşəkar Xüsusiyyətlər

- 🧠 **Səhvlər Bankı** — bütün imtahanlarda səhv etdiyin suallar avtomatik toplanır; yalnız onları məşq et. Bir dəfə düzgün cavablayanda sual bankdan **avtomatik çıxır** (mənimsəmə məntiqi).
- 🎓 **Məşq rejimi** — hər cavabdan sonra dərhal düzgün/səhv + izah göstərilir (taymersiz).
- 🚩 **Sual nişanlama** — şübhəli sualı ulduzla işarələ, naviqatorda sarı nöqtə ilə görünsün, sonra qayıt.
- ⌨️ **Klaviatura idarəetməsi** — A–Z / 1–9 ilə cavab seç, ←/→ keç, Enter növbəti, F nişanla.
- 👀 **Yükləmədən öncə önizləmə** — bazaya yazmadan: neçə sual, hansı format, variant paylanması, xəbərdarlıqlar və nümunə suallar göstərilir; sonra təsdiqləyirsən.
- ✏️ **Cavab açarı redaktoru** — səhv idxal olunmuş düzgün cavabı, variantı və ya sual mətnini interfeysdən düzəlt (yenidən yükləmədən).
- 🏷️ **Mövzu teqləri** — "Mövzu" sütunu/sahəsi varsa, imtahanı mövzu üzrə filtrlə.
- 📱 **PWA** — telefona "quraşdırıla bilən" tətbiq (ana ekran ikonu, oflayn açılma).

## ✨ Əsas Xüsusiyyətlər

- ✅ JWT doğrulama, "Məni yadda saxla", şifrə bərpası
- ✅ Excel yükləmə → avtomatik sual bankı (sürükləyib-burax)
- ✅ **DİNAMİK variant sayı** — hər sual 2, 3, 4, 5, 6+ variant ola bilər; sistem Excel-dən avtomatik aşkarlayır (sabit A/B/C/D fərziyyəsi yoxdur)
- ✅ **Böyük fayllar**: 500 / 1000 / 2000+ sual — kod dəyişikliyi olmadan (chunked toplu insert)
- ✅ 3 imtahan rejimi: **aralıq** (hazır + xüsusi) / **təsadüfi N** / **tam**
- ✅ Sual **və** variant sırasının təsadüfiləşdirilməsi (əzbərləməyə qarşı)
- ✅ Bir-bir sual interfeysi: **"Sual 25 / 500"**, **"Seçimlər: 5"**, taymer, naviqator, irəliləyiş paneli, qaranlıq rejim
- ✅ Hər 5 saniyədə avtomatik yadda saxlama + brauzer bağlananda davam etmə
- ✅ Nəticə ekranı: Ümumi / Düzgün / Yanlış / **Cavabsız** / Uğur faizi (bal halqası, qiymət)
- ✅ Yanlış sualların icmalı (✓ düzgün cavab / ✗ sizin cavab / izah)
- ✅ **"Səhvləri təcrübə et"** — yalnız səhv + cavabsız suallardan mini-imtahan
- ✅ Statistika: trend, qiymət paylanması, tarixçə (Recharts)
- ✅ Profil: redaktə, şifrə dəyişmə, tarixçə
- ✅ Admin paneli: istifadəçilər, testlər, qlobal statistika
- ✅ PDF / Excel ixracı, axtarış, mobil uyğunluq

### 🤖 Ağıllı Excel Aşkarlama (sabit başlıq tələb olunmur)

Təhlilçi **üç strategiyanı** avtomatik sınayır və ən çox sual verəni seçir:

1. **Cədvəl** — başlıq sətri (`Sual | A | B | ... | Düzgün Cavab`) ilk 15 sətirdə axtarılır; metadata sətirləri keçilir.
2. **Tək-xana (embedded)** — real universitet formatı: `| № | "Sual?\nA) …\nB) …\nC) …" | D |` — sual mətni və bütün variantlar **bir xanada** (sətir keçidləri ilə), düzgün cavab isə qonşu sütunda tək hərflə. Variant sayı dinamik aşkarlanır, sual mətni variantlardan ayrılır.
3. **Blok (universitet)** — sabit başlıq yoxdursa, pattern-əsaslı aşkarlama işə düşür:
   - Metadata (universitet adı, fənn, tədris ili, fakültə) **buraxılır**
   - Nömrələnmiş suallar (`1`, `1.`, `1)`), `A) … B) … C) …` variantları və `Düzgün Cavab: D` tanınır
   - Birləşdirilmiş xanalar, çox başlıqlı bölmələr, fərqli düzülüşlər dəstəklənir
   - `Çətinlik:` və `Ədəbiyyat:/İstinad:` sahələri varsa çıxarılır

Nəticə cavabında `strategy: "tabular" | "blocks"` qaytarılır. Nümunə:
```bash
npm run db:sample             # cədvəl formatı (500 sual)
npm run db:sample:embedded    # tək-xana universitet formatı (Mülki Müdafiə)
npm run db:sample:uni         # blok formatı
```

### 📋 Excel Formatı (cədvəl variantı)

İlk sətir başlıq olmalıdır. Variant sütunları **A, B, C, D, E, F …** (istənilən say) — boş xanalar həmin sualda variant sayını azaldır.

| Sual | A | B | C | D | E | Düzgün Cavab | İzah *(istəyə bağlı)* |
|------|---|---|---|---|---|--------------|------|
| HTML nədir? | Proqramlaşdırma Dili | İşarələmə Dili | Brauzer | Verilənlər Bazası | | B | … |
| Hansı JS çərçivəsidir? | React | HTML | CSS | MySQL | Linux | A | … |

- "Düzgün Cavab" hərf (A–Z) **və ya** nömrə (1-əsaslı) ola bilər
- Başlıqlar həssas deyil: `Variant A`, `Option B`, `Cavab C` də qəbul edilir
- Format səhvdirsə aydın mesaj + sətir nömrəli xəbərdarlıqlar verilir

### 🛠 DB Skriptləri

```bash
npm run db:init     # cədvəlləri yarat (yalnız yoxdursa)
npm run db:reset    # ⚠️ hər şeyi sil və yenidən qur
npm run db:seed     # admin yarat
npm run db:sample   # nümunə-suallar.xlsx (500 sual, dinamik variant)
```

---

## 🔌 Əsas API Marşrutları

| Metod | Yol | Təyinat |
|-------|-----|---------|
| POST | `/api/auth/register` · `/login` · `/forgot-password` · `/reset-password` | Doğrulama |
| POST | `/api/tests/upload` | Excel yüklə |
| GET/DELETE | `/api/tests` · `/api/tests/:id` | Testləri idarə et |
| POST | `/api/exams/start` | İmtahana başla |
| GET | `/api/exams/:id/resume` | Davam et |
| PATCH | `/api/exams/:id/answer` | Avtomatik saxla |
| POST | `/api/exams/:id/submit` | Təqdim et |
| GET | `/api/exams/:id/review` | Səhv suallar |
| POST | `/api/exams/:id/retry-wrong` | Səhvləri təkrarla |
| GET | `/api/stats/dashboard` · `/analytics` | Statistika |
| GET | `/api/admin/users` · `/tests` · `/stats` | Admin |

---

## 🛡️ Təhlükəsizlik

- Parollar **bcrypt** (12 raund) ilə heşlənir
- JWT ilə qorunan marşrutlar, rol əsaslı giriş (admin)
- Doğrulama uç nöqtələrində **rate-limit**
- Zod ilə giriş validasiyası
- Fayl növü/ölçü filtrasiyası (yalnız .xlsx/.xls)
- Düzgün cavablar imtahan zamanı **müştəriyə göndərilmir**
