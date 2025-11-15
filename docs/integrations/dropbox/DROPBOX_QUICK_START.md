# 🚀 Dropbox Quick Start Guide

Get your Dropbox integration up and running in 5 minutes!

## ⚡ Quick Setup (5 steps)

### Step 1: Create Dropbox App (2 min)

1. Go to **[Dropbox App Console](https://www.dropbox.com/developers/apps)**
2. Click **"Create app"**
3. Choose settings:
   - **API**: Scoped access
   - **Access Type**: App folder (recommended) or Full Dropbox
   - **Name**: `LegalFormApp` (or your preferred name)
4. Click **"Create app"**

### Step 2: Set Permissions (1 min)

1. In your app, go to **"Permissions"** tab
2. Enable these permissions:
   - ✅ `files.metadata.write`
   - ✅ `files.content.write`
   - ✅ `files.content.read`
3. Click **"Submit"**

### Step 3: Generate Access Token (30 sec)

1. Go to **"Settings"** tab
2. Scroll to **"OAuth 2"** section
3. Click **"Generate"** under "Generated access token"
4. **Copy the token** (starts with `sl.`)

⚠️ **Important**: Keep this token secure - it provides access to your Dropbox!

### Step 4: Configure Environment (30 sec)

Create or edit your `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Or create manually with these settings:
```

Add to `.env`:
```env
DROPBOX_ACCESS_TOKEN=sl.YOUR_TOKEN_HERE
DROPBOX_ENABLED=true
DROPBOX_BASE_PATH=/Apps/LegalFormApp
LOCAL_OUTPUT_PATH=/output
CONTINUE_ON_DROPBOX_FAILURE=true
```

### Step 5: Test Connection (30 sec)

```bash
node test-dropbox-connection.js
```

**Expected output:**
```
✅ Successfully connected to Dropbox!
   Account Name: Your Name
   Email: your@email.com
```

---

## 🎯 That's It!

Your Dropbox integration is now active. The service will automatically:
- ✅ Upload all generated documents to Dropbox
- ✅ Preserve your folder structure
- ✅ Create folders as needed
- ✅ Continue working even if upload fails

---

## 🧪 Optional: Test File Upload

Want to test uploading a file? Run:

```bash
node test-dropbox-upload.js
```

---

## ❌ Troubleshooting

### "Dropbox is DISABLED"
- Make sure `DROPBOX_ENABLED=true` in `.env`
- Restart your server after changing `.env`

### "DROPBOX_ACCESS_TOKEN is not set"
- Check that your token is in `.env`
- Make sure there are no extra spaces
- Token should start with `sl.`

### "Failed to connect to Dropbox" (401 error)
- Your token may be invalid or expired
- Generate a new token in Dropbox App Console
- Make sure you enabled the required permissions

### "Permission denied"
- Go to your app's Permissions tab
- Enable all three file permissions
- Click Submit and regenerate your token

---

## 📖 Full Documentation

For advanced configuration and detailed information, see:
- **[Complete Setup Guide](docs/setup/DROPBOX_SETUP.md)** - Full documentation
- **[Implementation Details](docs/implementation/integrations/DROPBOX_IMPLEMENTATION_SUMMARY.md)** - Technical details

---

## 🆘 Need Help?

1. Check the [Complete Setup Guide](docs/setup/DROPBOX_SETUP.md)
2. Run `node test-dropbox-connection.js` to diagnose issues
3. Check the console logs when your server starts

---

## 💡 How It Works

When a form is submitted:

1. **Local Save**: Document is saved to `/output/Clients/[name]/`
2. **Auto Upload**: File is automatically uploaded to Dropbox
3. **Path Preserved**: Same folder structure in Dropbox: `/Apps/LegalFormApp/Clients/[name]/`

Example:
```
Local:   /output/Clients/John Doe/SROGs/document.pdf
Dropbox: /Apps/LegalFormApp/Clients/John Doe/SROGs/document.pdf
```

---

**🎉 Happy uploading!**

