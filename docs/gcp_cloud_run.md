# Google Cloud Run Deployment Guide for ASTRA Backend

This guide walks through deploying the ASTRA FastAPI backend to **Google Cloud Run** using the **Free Tier** (2 Million requests/month forever at $0).

---

## 1. Free Tier Specifications
* **Requests**: First 2,000,000 requests/month are **100% Free**.
* **Memory**: 360,000 GB-seconds/month **Free**.
* **vCPU**: 180,000 vCPU-seconds/month **Free**.
* **WebSockets**: Natively supported on Cloud Run.
* **Eligible Regions for Free Tier**: `us-central1`, `us-east1`, `us-west1`.

---

## Method A: Deploy via Google Cloud Console Web UI (Recommended)

1. Open **[Google Cloud Run Console](https://console.cloud.google.com/run)**.
2. Click **Create Service**.
3. **Deploy container or source**:
   * Select **"Continuously deploy from a repository"**.
   * Click **Set up with Cloud Build**.
   * Choose **GitHub** as the provider, authorize your account, and select your repository: `Astra-Adaptive-Smart-Traffic-Response-Analytics`.
   * Branch: `^main$`.
   * Build Type: Select **Dockerfile** (Source location: `/Dockerfile`).
   * Click **Save**.
4. **Service settings**:
   * **Service name**: `astra-backend`
   * **Region**: Select `us-central1` (Iowa) or `us-east1` (South Carolina) for Free Tier eligibility.
5. **Authentication**:
   * Select **"Allow unauthenticated invocations"** (allows frontend and public requests).
6. **Container, Networking, Security settings** (Click dropdown):
   * **Memory**: Set to **2 GiB** (or **4 GiB**) — ensures ML models run smoothly.
   * **CPU**: **1** or **2** vCPU.
   * **Container port**: `8080`.
   * **Maximum request timeout**: `300` (or `600` for long WebSocket sessions).
   * **Scaling**:
     * Minimum instances: `0` (scales to zero when not used = $0 cost).
     * Maximum instances: `3` (caps costs).
7. Click **Create**.

Cloud Build will build the container from `Dockerfile` and deploy it. In $\approx 2-3$ minutes, you will receive a public HTTPS URL:
`https://astra-backend-xxxxxx-uc.a.run.app`

---

## Method B: Deploy via Google Cloud Shell / gcloud CLI

If you prefer the command line, open the **Cloud Shell** (the terminal icon `>_` at the top right of Google Cloud Console):

```bash
# 1. Clone your repo
git clone https://github.com/Ayush-CS-89112521/Astra-Adaptive-Smart-Traffic-Response-Analytics.git
cd Astra-Adaptive-Smart-Traffic-Response-Analytics

# 2. Deploy directly to Cloud Run
gcloud run deploy astra-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --port 8080 \
  --min-instances 0 \
  --max-instances 3 \
  --timeout 300
```

When prompted to enable Artifact Registry / Cloud Build APIs, press `y` (Enter).

---

## 3. Verifying Your Live API

Once deployed, visit your Cloud Run URL:
* **Interactive Docs**: `https://<YOUR-SERVICE-URL>/docs`
* **Health Check**: `https://<YOUR-SERVICE-URL>/health`
* **WebSocket**: `wss://<YOUR-SERVICE-URL>/ws/simulation`
