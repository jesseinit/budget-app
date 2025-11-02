#!/bin/bash
# Quick SSH into master node

MASTER_IP=$(cd .. && terraform output -raw master_ip)

if [ -z "$MASTER_IP" ]; then
  echo "Error: Could not get master IP from terraform output"
  exit 1
fi

echo "Connecting to master node at $MASTER_IP..."

# Use hetzner_rsa key if it exists, otherwise use default
if [ -f ~/.ssh/hetzner_rsa ]; then
  ssh -i ~/.ssh/hetzner_rsa root@$MASTER_IP
else
  ssh root@$MASTER_IP
fi
