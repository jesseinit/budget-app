#!/bin/bash
# Quick SSH into master node

MASTER_IP=$(cd .. && terraform output -raw master_ip)

if [ -z "$MASTER_IP" ]; then
  echo "Error: Could not get master IP from terraform output"
  exit 1
fi

echo "Connecting to master node at $MASTER_IP..."
ssh root@$MASTER_IP
