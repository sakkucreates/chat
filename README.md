# ChatPass - Mobile-Friendly Two-Way Passcode Chat Application

**ChatPass** is a modern, mobile-friendly two-way conversation app built with Next.js, React, and Tailwind CSS. It is specifically designed for simple setup and zero-login access for end-users, optimized for hosting on **Vercel**.

---

## 🌟 Key Features

- **🛡️ Admin Account Generation**:
  - Admin can log in with a master passcode (`ADMIN123` by default) to open the Admin Control Panel.
  - Create user accounts with custom or auto-generated 4-digit passcodes.
  - Generate **Direct Access Links** (`https://your-app.vercel.app/?code=1001`) that automatically log users in with zero typing required.
  - Share details directly via WhatsApp or copy to clipboard with 1-click.
  - Edit or delete user accounts as needed.

- **💬 No Login Required for Users**:
  - End-users simply enter their assigned passcode on the homepage OR click their direct link.
  - No email verification, password registration, or login forms needed.

- **📱 Mobile-Friendly Responsive Design**:
  - WhatsApp / Telegram-like mobile experience.
  - Automatic drawer navigation between contacts list and active conversation on phones.
  - Dual-pane side-by-side view on tablet and desktop screens.

- **⚡ Real-Time Two-Way Chat**:
  - Direct 1-on-1 messaging between users and Admin.
  - Message status indicators: Delivered (`✓`) and Read receipts (`✓✓`).
  - Unread message badge counters and live online/offline status.
  - Image attachments with lightbox previewer.
  - Quick Emoji bar.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-seeded Quick Test Passcodes

Out of the box, the system comes with 3 sample accounts for quick testing:

| Role | Name | Passcode | Description |
| flex | --- | --- | --- |
| **Admin** | Admin / Support | `ADMIN123` | Access Admin Dashboard & create new accounts |
| **User 1** | Alex Johnson | `1001` | Sample user account 1 |
| **User 2** | Sarah Connor | `2002` | Sample user account 2 |

---

## ☁️ Deploying to Vercel

This project is 100% serverless-ready and optimized for Vercel deployment.

### Option 1: Deploy using Vercel Dashboard (Recommended)
1. Push this project to your GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your repository.
4. Click **Deploy**.

### Option 2: Deploy using Vercel CLI
Run the following command in your terminal:
```bash
npx vercel
```

### ⚙️ Optional Environment Variables
In your Vercel project settings, you can optionally configure:
- `ADMIN_CODE`: Custom master admin passcode (Default: `ADMIN123`).

---

## 📁 Project Structure

```
d:\project1
├── src/
│   ├── app/
│   │   ├── api/             # Serverless API routes (auth, users, admin, messages)
│   │   ├── layout.tsx       # Root layout with responsive viewport & metadata
│   │   └── page.tsx         # Main chat workspace & passcode verification logic
│   ├── components/
│   │   ├── AdminDashboard.tsx  # Admin modal for creating & sharing user passcodes
│   │   ├── ChatWindow.tsx      # 1-on-1 chat canvas, message stream & attachments
│   │   ├── ContactsSidebar.tsx # User contact list with search & unread badges
│   │   └── PasscodeModal.tsx   # Mobile-friendly passcode login screen
│   └── lib/
│       └── db.ts            # Serverless-compatible unified data store
├── package.json
└── README.md
```
