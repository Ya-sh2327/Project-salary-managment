# MyMoney – Smart Salary Manager

A responsive personal finance web application built with React, Vite, Chart.js and CSS.

## Features

- Monthly income, expense and balance dashboard
- Salary, bonus and other income entry
- Expense entry with categories and payment methods
- Custom categories, transaction filters and editing
- Monthly budgets with alerts (Indian Rupees ₹), savings goals and contributions
- Separate finance calculator with keyboard support
- Recurring bill reminders
- Optional in-app notification tink sound, configurable in Settings
- Monthly and yearly analytics, CSV reports, and JSON backup/restore
- Dark and light themes
- Installable offline-capable web app (production deployment)
- Browser local storage (data stays in this browser unless backed up)

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`.

## Build

```powershell
npm run build
```

The production files are generated in `dist/`.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to its `main` or `master` branch.
2. In the repository, open **Settings → Pages** and set the source to **GitHub Actions**.
3. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish.
4. Open the published URL shown by the workflow (usually `https://<username>.github.io/<repository>/`).

The workflow builds the Vite app and deploys it automatically on each push to `main` or `master`.
