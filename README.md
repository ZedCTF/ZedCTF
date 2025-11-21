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

Open the link shown (e.g., **[[http://localhost:5173](http://localhost:5173/ZedCTF/)](http://localhost:5173/ZedCTF/)**).

---

## 🛠 Step 4: Build for Production

```bash
npm run build
```

This creates a `dist/` folder.

---

## 🛠 Step 5: Deploy on gh-pages

```bash
npm run deploy
```

Push changes:

```bash
git add .
git commit -m "Deploy"
git push origin main
```

Your site will be live at:

```
https://zedctf.github.io/ZedCTF/
```

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


# 🎉 Done!

You can now run the ZedCTF web app locally on **Windows & Linux** and deploy it easily on **GitHub Pages**.



