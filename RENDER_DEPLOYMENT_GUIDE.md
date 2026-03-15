# Orange Money Proxy - Render.com Deployment Guide

This guide explains how to deploy the `orange-money-proxy` to Render.com for free. Render will host the Node.js proxy server that handles mTLS communication with the Orange Money API.

---

## Why Render.com?

- Free tier available (no credit card required)
- Deploys directly from your GitHub repository
- Supports environment variables / secrets natively
- Auto-deploys when you push changes
- Provides a public HTTPS URL automatically

---

## Step 1: Create a Render Account

1. Go to https://render.com
2. Click **Get Started for Free**
3. Sign up using your **GitHub account** (this allows Render to access your repo)

---

## Step 2: Create a New Web Service

1. In your Render dashboard, click **New +** → **Web Service**
2. Select **Connect a repository** and choose your GitHub repo
3. Fill in the settings:
   - **Name**: `orange-money-proxy`
   - **Root Directory**: `orange-money-proxy`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free`

---

## Step 3: Add Environment Variables

In the **Environment** section of the Render service, add the following variables:

| Key | Value | Notes |
|-----|-------|-------|
| `PORT` | `3000` | Required |
| `NODE_ENV` | `production` | Required |
| `ORANGE_MONEY_API_URL` | *(from Orange Money)* | The Orange Money API endpoint |
| `PROXY_SECRET` | *(generate a random string)* | A secret to protect the proxy |
| `OM_CERT_B64` | *(your base64 certificate)* | The value from your GitHub secret |
| `OM_KEY_B64` | *(your base64 private key)* | The value from your GitHub secret |

> To generate a PROXY_SECRET, run this in your terminal:
> ```
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## Step 4: Deploy

1. Click **Create Web Service**
2. Render will build and deploy the proxy automatically
3. Wait 2-3 minutes for the first deploy to complete
4. Your proxy URL will be shown at the top, e.g.:
   ```
   https://orange-money-proxy.onrender.com
   ```

---

## Step 5: Verify Deployment

Test the health endpoint:
```bash
curl https://orange-money-proxy.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "mtls": {
    "cert_from_env": true,
    "cert_from_file": false
  },
  "target_url": "https://..."
}
```

If `cert_from_env` is `true`, your certificates are loaded correctly.

---

## Step 6: Update App Environment Variables

Once deployed, update these values in your Supabase Edge Function secrets:

1. Go to your **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Add or update:
   - `ORANGE_MONEY_PROXY_URL` = `https://orange-money-proxy.onrender.com`
   - `ORANGE_MONEY_PROXY_SECRET` = *(the PROXY_SECRET you set in Step 3)*

---

## Step 7: Set Up GitHub Actions Auto-Deploy (Optional)

To auto-deploy when you push code changes:

1. In your Render service, go to **Settings** → **Deploy Hook**
2. Copy the deploy hook URL
3. In your GitHub repo, go to **Settings** → **Secrets and variables** → **Actions**
4. Add a new secret:
   - **Name**: `RENDER_DEPLOY_HOOK_URL`
   - **Value**: *(the Render deploy hook URL)*

Now every push to `main` that changes files in `orange-money-proxy/` will trigger a redeploy.

---

## Troubleshooting

### Proxy returns 401 Unauthorized
- Check that `PROXY_SECRET` in Render matches what's in your Supabase secrets

### mTLS: cert_from_env is false
- Double-check that `OM_CERT_B64` and `OM_KEY_B64` are set correctly in Render environment variables
- Make sure the values are the raw base64 strings (no extra spaces or newlines)

### Service sleeps after inactivity (free tier)
- The free tier spins down after 15 minutes of inactivity
- The first request after sleep takes ~30 seconds to wake up
- Upgrade to the Starter plan ($7/month) for always-on hosting

---

## Free Tier Limitations

| Feature | Free Tier |
|---------|-----------|
| Bandwidth | 100 GB/month |
| Compute | 512 MB RAM |
| Sleep after inactivity | Yes (15 min) |
| Custom domain | Yes |
| HTTPS | Yes (automatic) |

For production use with many payments per day, consider upgrading to the Starter plan to avoid cold start delays.
