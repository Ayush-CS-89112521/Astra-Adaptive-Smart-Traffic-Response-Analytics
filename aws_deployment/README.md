# ASTRA Backend Deployment Guide on AWS (Cheapest Method)

This guide documents deploying the ASTRA FastAPI backend on AWS for **$0 (Free Tier)** or **<$4/month** by leveraging **Virtual Memory SSD Swap Expansion**.

---

## 1. AWS Architecture & Cost Breakdown

| Component | Choice | Specs | Cost |
| :--- | :--- | :--- | :--- |
| **Compute** | **EC2 `t2.micro`** or **`t3.micro`** | 1 vCPU, 1 GB RAM (x86_64) | **FREE** (750 hrs/mo under 12-mo Free Tier) or ~$0.008/hr (~$5/mo) |
| **Disk** | **EBS gp3 SSD** | 30 GB gp3 | **FREE** (under 30GB Free Tier) |
| **Virtual Memory** | **Linux Swap on SSD** | 4 GB Swap File | **$0 extra** (allocates from the 30GB EBS) |
| **OS** | **Ubuntu 22.04 LTS / 24.04 LTS** | Standard AMI | **FREE** |

---

## 2. Step 1: Launch EC2 Instance

1. In AWS Console, go to **EC2** > **Launch Instance**.
2. **Name**: `astra-backend`
3. **AMI**: **Ubuntu 24.04 LTS** (or 22.04 LTS) — 64-bit (x86)
4. **Instance Type**: `t2.micro` or `t3.micro`
5. **Key Pair**: Create or select existing `.pem` key pair
6. **Network / Security Group**:
   * Allow **SSH** (Port 22) from your IP
   * Allow **HTTP** (Port 80) from Anywhere (`0.0.0.0/0`)
   * Allow **Custom TCP** (Port 8000) from Anywhere (`0.0.0.0/0`)
7. **Storage**: Configure **30 GiB gp3 SSD** (Free tier allows up to 30 GB).
8. Click **Launch Instance**.

---

## 3. Step 2: Connect & Run Setup

Connect via SSH:
```bash
ssh -i "your-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Clone your repository:
```bash
git clone https://github.com/Ayush-CS-89112521/Astra-Adaptive-Smart-Traffic-Response-Analytics.git
cd Astra-Adaptive-Smart-Traffic-Response-Analytics
```

Run the automated SSD swap & dependency provisioner:
```bash
chmod +x aws_deployment/setup_aws_ec2.sh
./aws_deployment/setup_aws_ec2.sh
```

---

## 4. Step 3: Python Virtual Environment & Requirements

Set up Python venv:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip

# Install CPU-only PyTorch first to save disk and memory (~200MB vs ~2GB GPU build)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install backend dependencies
pip install -r src/backend/requirements.txt
```

---

## 5. Step 4: Configure `.env`

Create `src/backend/.env`:
```bash
cp src/backend/.env.example src/backend/.env
nano src/backend/.env
```
Ensure the variables are set:
```ini
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
API_ENV=production
ML_MODELS_PATH=../ml/models
ALLOWED_ORIGINS=*
LOG_DIR=./logs
```

---

## 6. Step 5: Start as System Daemon (systemd)

Ensure the logs directory exists:
```bash
mkdir -p src/backend/logs
```

Copy and activate the service:
```bash
sudo cp aws_deployment/astra-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable astra-backend
sudo systemctl start astra-backend
```

Check the status:
```bash
sudo systemctl status astra-backend
```

---

## 7. Step 6: Verify Endpoint

Check if the API is responding:
```bash
curl http://localhost:8000/health
```

Or visit in browser:
```
http://<YOUR_EC2_PUBLIC_IP>:8000/docs
```
