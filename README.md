# Running the TypeScript Web Locally & on GitHub (Windows & Linux)

This guide explains **only** how to run the ZedCTF TypeScript web project **locally** and **on GitHub Pages**, on both **Windows** and **Linux**.

---

# 🖥️ 1. Running Locally

## ✅ Requirements

* Node.js (LTS)
* npm
* Git

Check versions:

```bash
node -v
npm -v
git --version
```

---

## ⚙️ Step 1: Clone the Repository

```bash
git clone https://github.com/ZedCTF/ZedCTF.git
cd ZedCTF
```

---

## ⚙️ Step 2: Install Dependencies

```bash
npm install
```

---

## ▶️ Step 3: Run the Development Server

```bash
npm run dev
```

Open the link shown (e.g., **[http://localhost:5173](http://localhost:5173)**).

---

## 🛠 Step 4: Build for Production

```bash
npm run build
```

This creates a `dist/` folder.

---

# 🪟 Windows Notes

* Use **PowerShell** or **Windows Terminal**
* If scripts fail due to permissions:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

# 🐧 Linux Notes

Update system:

```bash
sudo apt update && sudo apt upgrade -y
```

If Node.js is missing:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

Fix file permissions:

```bash
sudo chown -R $USER:$USER .
```

---

# 🌐 2. Deploying on GitHub Pages

## Step 1: Enable Pages

Go to:

```
Repo → Settings → Pages
```

Select:

* Branch: `gh-pages`
* Folder: `/` or `dist/` depending on deployment

---

# 🚀 GitHub Actions Deployment

Create: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 'lts'

    - name: Install dependencies
      run: npm install

    - name: Build
      run: npm run build

    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

Push changes:

```bash
git add .
git commit -m "Deploy"
git push
```

Your site will be live at:

```
https://zedctf.github.io/ZedCTF/
```

---

# 🎉 Done!

You can now run the ZedCTF web app locally on **Windows & Linux** and deploy it easily on **GitHub Pages**.

