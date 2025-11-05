#!/bin/bash
# Quick SSH into worker node

WORKER_IP=$(cd .. && terraform output -raw worker_ip)

if [ -z "$WORKER_IP" ]; then
  echo "Error: Could not get worker IP from terraform output"
  exit 1
fi

echo "Connecting to worker node at $WORKER_IP..."

# Use hetzner_rsa key if it exists, otherwise use default
if [ -f ~/.ssh/hetzner_rsa ]; then
  ssh -i ~/.ssh/hetzner_rsa root@$WORKER_IP
else
  ssh root@$WORKER_IP
fi
