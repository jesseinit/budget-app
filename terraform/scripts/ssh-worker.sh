#!/bin/bash
# Quick SSH into worker node

WORKER_IP=$(cd .. && terraform output -raw worker_ip)

if [ -z "$WORKER_IP" ]; then
  echo "Error: Could not get worker IP from terraform output"
  exit 1
fi

echo "Connecting to worker node at $WORKER_IP..."
ssh root@$WORKER_IP
