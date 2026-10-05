#!/usr/bin/env bash
# ==============================================================================
# ASTRA Backend — AWS EC2 (Free Tier / Low-RAM) Automated Setup Script
# Features:
#   1. Creates 4GB SSD Swap space (Virtual Memory expansion to prevent OOM)
#   2. Installs OS dependencies (Python 3.11/venv, build tools, libgomp1 for FAISS)
#   3. Installs CPU-only PyTorch & requirements
#   4. Configures systemd background service with auto-restart on boot
# ==============================================================================

set -euo pipefail

echo "=================================================="
echo "🚀 [ASTRA] Starting Automated AWS EC2 Provisioning"
echo "=================================================="

# 1. Update OS packages
echo "📦 Updating OS package lists..."
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    libgomp1 \
    curl \
    git \
    ufw

# 2. Virtual Memory / SSD Swap Expansion (4 GB)
SWAP_FILE="/swapfile"
if [ ! -f "$SWAP_FILE" ]; then
    echo "💾 Provisioning 4GB SSD Swap file for Virtual Memory expansion..."
    # fallocate is fast on EBS gp2/gp3
    sudo fallocate -l 4G "$SWAP_FILE" || sudo dd if=/dev/zero of="$SWAP_FILE" bs=1M count=4096
    sudo chmod 600 "$SWAP_FILE"
    sudo mkswap "$SWAP_FILE"
    sudo swapon "$SWAP_FILE"
    
    # Persist swap across reboot
    if ! grep -q "$SWAP_FILE" /etc/fstab; then
        echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab
    fi

    # Optimize swappiness for low-RAM cloud instances
    sudo sysctl vm.swappiness=20
    sudo sysctl vm.vfs_cache_pressure=50
    echo "vm.swappiness=20" | sudo tee -a /etc/sysctl.conf
    echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
    echo "✅ 4GB SSD Swap successfully enabled."
else
    echo "ℹ️ Swap file already exists. Skipping swap creation."
fi

# Display memory state
free -h

echo "=================================================="
echo "✅ OS packages & 4GB Virtual Memory configured!"
echo "=================================================="
