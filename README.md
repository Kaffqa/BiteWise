<p align="center">
  <img src="public/logo.svg" width="100" height="100" alt="BiteWise Logo" />
</p>

<h1 align="center">BiteWise</h1>

<p align="center">
  <strong>The Honest Truth in Every Single Bite</strong><br />
  <em>AI-Powered Personalized Nutrition, Food Safety & Metabolic Health Platform</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/AI_Gateway-Groq_%7C_Gemini-FF6F00?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Dual AI Gateway" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 📌 Daftar Isi
1. [Tentang BiteWise](#-tentang-bitewise)
2. [Fitur Unggulan](#-fitur-unggulan)
3. [Arsitektur Sistem & AI Gateway](#-arsitektur-sistem--ai-gateway)
4. [Tech Stack](#-tech-stack)
5. [Struktur Proyek](#-struktur-proyek)
6. [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)
7. [Konfigurasi Environment](#-konfigurasi-environment)
8. [Tim Pengembang](#-tim-pengembang)

---

## 💡 Tentang BiteWise

Sebagian besar aplikasi pelacak kalori konvensional hanya berfokus pada kuantitas angka (kalori masuk vs kalori keluar). Padahal bagi individu dengan **alergi makanan, intoleransi, penyakit kronis (seperti diabetes atau hipertensi), maupun yang sedang mengonsumsi obat resep**, konsumsi makanan menyangkut **keamanan klinis dan dampak metabolik**.

**BiteWise** hadir sebagai asisten gizi personal cerdas yang mentransformasikan foto makanan, label informasi nilai gizi, atau input teks natural menjadi:
- Estimasi makronutrien dan kalori presisi.
- Evaluasi keamanan 5 lapis terhadap profil kesehatan personal pengguna.
- Deteksi interaksi biokimia obat–makanan (*drug-food interactions*).
- Simulasi kurva respon gula darah (*glycemic curve*) 180 menit.
- Rekomendasi alternatif menu yang lebih sehat (*Smart Swap*).

---

## 🌟 Fitur Unggulan

### 1. 📷 Multimodal AI Vision & OCR Scanner
- **Deteksi Otomatis:** Mengenali apakah gambar yang diunggah berupa hidangan di piring (*plated meal*), tabel fakta nutrisi (*nutrition facts label*), atau daftar komposisi bahan kemasan (*ingredients list*).
- **Proteksi Non-Makanan:** Menolak gambar non-konsumsi secara otomatis agar database riwayat tetap bersih.
- **Natural-Language Food Logging:** Pengguna dapat mencatat makanan hanya dengan mengetikkan kalimat deskripsi natural (contoh: *"Semangkuk bubur ayam tanpa kacang dengan kecap asin"*).

### 2. 🛡️ 5-Layer Personalized Health & Allergen Guardian
Mencocokkan setiap bahan yang teridentifikasi secara ketat terhadap profil pribadi:
- **Alergi & Intoleransi:** Mengelompokkan status *Safe*, *Caution*, atau *Danger* tanpa menghasilkan alarm palsu (*zero false-positive* pada alergen yang tidak dimiliki user).
- **Kondisi Medis & Diet:** Memeriksa kesesuaian terhadap pantangan seperti diabetes, hipertensi, GERD, ginjal, maupun preferensi diet (vegan, keto, halal, dll).
- **Plain-Language Explanations:** Menerjemahkan istilah zat aditif dan kimia industri menjadi bahasa yang mudah dimengerti.

### 3. 💊 Deteksi Interaksi Obat–Makanan (*Drug-Food Interactions*)
Bila pengguna memasukkan obat aktif pada profil kesehatannya, sistem mengevaluasi interaksi kimiawi antara zat aktif obat dengan makanan (misal: *Warfarin* dengan sayuran tinggi Vitamin K, *Statin/Amlodipine* dengan *Grapefruit*, atau obat hipertensi dengan kelebihan kalium). Sistem menyediakan tingkat keparahan (*Low/Moderate/Severe*), mekanisme biokimia, serta saran jeda konsumsi yang aman.

### 4. 📈 Simulasi Lonjakan Glikemik 180 Menit (*Glycemic Spike Impact*)
- Memprediksi **Indeks Glikemik (GI)**, **Beban Glikemik (GL)**, dan estimasi lonjakan puncak gula darah (mg/dL).
- Menampilkan grafik interaktif respon gula darah pasca makan selama 180 menit.
- Memberikan saran praktis untuk meredam lonjakan glukosa (seperti mengonsumsi serat/protein terlebih dahulu sebelum karbohidrat).

### 5. 🔄 Context-Aware Daily Limits & Smart Swap
- Menghitung **BMR & TDEE** secara otomatis berdasarkan usia, jenis kelamin, tinggi, berat badan, dan level aktivitas.
- Mengomparasikan nutrisi makanan dengan sisa kuota kalori, gula, dan natrium harian pengguna.
- Menyarankan 2–3 alternatif makanan lokal yang lebih sehat (*Smart Swap*) saat makanan berisiko atau melebihi kuota gizi harian.

### 6. 📚 Kamus Bahan AI Personal (*Ingredients Dictionary*)
Secara otomatis membangun kamus bahan edukatif yang disesuaikan dengan kondisi medis pengguna untuk membantu mengenali bahan aman vs berbahaya saat berbelanja.

---

## 🏗️ Arsitektur Sistem & AI Gateway

Aplikasi menggunakan arsitektur **Serverless AI Proxy Gateway** yang aman dengan pola *High-Availability Dual-Provider*:

```
[ Client (React 19 SPA) ]
           │
           │ HTTP POST (Disertai Bearer Supabase JWT)
           ▼
[ Vercel Serverless API Gateway (`/api/ai`) ]
           │
           ├── 1. Validasi Autentikasi Pengguna via Supabase Auth
           ├── 2. Sanitasi Payload & Validasi Profil Kesehatan
           │
           ▼
[ Dual-Provider Orchestration Engine ]
    ├── Primary: Groq API
    │   ├── Vision: qwen/qwen3.8-27b (Inference berkecepatan ultra-tinggi)
    │   └── Text/JSON: openai/gpt-oss-120b (Penalaran nutrisi mendalam)
    │
    └── Fallback: Google Gemini API
        └── Multimodal: gemini-3.6-flash (Transisi otomatis tanpa downtime)
           │
           ▼
[ PostgreSQL Supabase (Database + Row-Level Security) ]
```

> **🔒 Keamanan Terjamin:** Semua API Key AI tersimpan secara aman di sisi server (Serverless Environment). Klien frontend tidak pernah memegang API Key, sehingga aman dari kebocoran kunci (*bundle secret leaks*).

---

## 💻 Tech Stack

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **TypeScript** | Arsitektur SPA modern, *strict typing*, komponen modular |
| **Build Tool & Bundler** | **Vite 5.4** | Kompilasi ultra-cepat, HMR, dan optimasi build production |
| **Styling & Design** | **Tailwind CSS v4** + **Framer Motion** | Tampilan elegan, interaksi fluida, responsif di semua perangkat |
| **Iconography** | **Phosphor Icons** & **Lucide React** | Ikon antarmuka modern dan konsisten |
| **Backend & Database** | **Supabase (PostgreSQL 15)** | Autentikasi JWT, Row-Level Security (RLS), Trigger metrik BMR/TDEE |
| **Realtime Engine** | **Supabase Realtime** | Notifikasi instan saat terdeteksi bahan berbahaya |
| **AI Inference** | **Groq Cloud** & **Google Gemini** | *Vision OCR*, *Natural Language Processing*, dan *JSON Schema Mode* |
| **Deployment** | **Vercel** | Serverless functions untuk API Proxy dan edge hosting |

---

## 📁 Struktur Proyek

```text
BiteWise/
├── api/                        # Serverless Functions (Backend Gateway)
│   ├── _ai-handler.ts          # Integrasi Groq & Gemini, orchestrator fallback
│   ├── _prompts.ts             # System prompt gizi, deteksi obat, dan glikemik
│   ├── account.ts              # Endpoint manajemen akun & data user
│   └── ai.ts                   # Gateway publik AI terproteksi JWT
├── public/                     # Aset statis & logo vektor (logo.svg, logo.png)
├── src/
│   ├── components/             # Komponen UI modular (Auth, Layout, Ingredients)
│   ├── contexts/               # React Context (AuthContext, NutritionContext)
│   ├── hooks/                  # Custom hooks (useScanner, useScanHistory, dll.)
│   ├── lib/                    # Utilitas klien, skema Zod, dan Supabase client
│   ├── pages/                  # Halaman aplikasi (Landing, Dashboard, Scanner, dll.)
│   └── types/                  # Definisi antarmuka TypeScript
├── supabase/
│   ├── schema.sql              # Skema tabel PostgreSQL, RLS, dan trigger
│   └── migrations/             # Migrasi database dan perbaikan profil
├── package.json
└── vite.config.ts
```

---

## 🚀 Panduan Instalasi & Menjalankan

### Prasyarat
- **Node.js** v18.0.0 atau lebih baru
- Akun **Supabase** (untuk database dan autentikasi)
- API Key **Groq** dan/atau **Google Gemini**

### Langkah Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/kaffqas/BiteWise.git
   cd BiteWise
   ```

2. **Instal Dependensi**
   ```bash
   npm install
   ```

3. **Inisialisasi Database Supabase**
   - Buka SQL Editor di Dashboard Supabase Anda.
   - Jalankan seluruh instruksi pada file `supabase/schema.sql` untuk membuat tabel, tipe enum, trigger BMR/TDEE, serta aturan Row-Level Security (RLS).

4. **Konfigurasi Environment Variables**
   Buat file `.env` di root direktori proyek:
   ```env
   # Supabase Client
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Serverless AI Provider Configuration
   VITE_AI_PROVIDER=fallback
   GROQ_API_KEY=your-groq-api-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

5. **Jalankan Aplikasi (Development)**
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses melalui browser di `http://localhost:5173`.

6. **Build untuk Production**
   ```bash
   npm run build
   ```

---

## 👥 Tim Pengembang

Platform **BiteWise** dikembangkan oleh tim multidisiplin yang memadukan keahlian rekayasa perangkat lunak, riset produk, dan perancangan pengalaman pengguna:

| No | Nama Anggota | Peran / Posisi | Fokus & Tanggung Jawab Utama |
| :---: | :--- | :--- | :--- |
| **1** | **Kaffqa Tegar Gayuh Pamungkas** | **Project Lead & Full Stack Developer** | Memimpin perancangan arsitektur sistem, integrasi *frontend & backend*, rekayasa *Serverless AI Gateway*, skema database PostgreSQL Supabase, serta optimasi *build & security*. |
| **2** | **Desmonda Varel Robel Salim** | **Lead UI/UX Designer & Frontend Specialist** | Memimpin riset pengalaman pengguna (UX), pembuatan *wireframe & high-fidelity prototype*, implementasi *design system* antarmuka, serta animasi dan responsivitas tampilan. |
| **3** | **Devi Nur Aini** | **Product Researcher & Technical Proposal Lead** | Memimpin analisis kebutuhan pengguna, riset regulasi pangan dan gizi, penyusunan struktur proposal teknis kompetisi, serta spesifikasi detail fungsionalitas produk. |
| **4** | **Abidah Ardelia Kendra Wibowo** | **Business Analyst & Proposal Specialist** | Memimpin analisis pasar dan studi komparasi kompetitor, perumusan kelayakan bisnis (*business viability*), validasi data uji nutrisi, serta strategi dokumentasi proposal. |

---

<p align="center">
  Dibuat dengan ❤️ oleh Tim <strong>BiteWise</strong> untuk masa depan kesehatan pangan yang lebih sadar, aman, dan transparan.
</p>
