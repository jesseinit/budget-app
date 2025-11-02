#!/bin/bash
# Script to re-seal secrets with the current cluster's public key
# Run this after creating a new cluster or when sealed secrets can't be decrypted

set -e

KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

echo "Fetching current cluster's sealing certificate..."
kubectl --kubeconfig="$KUBECONFIG" -n kube-system get secret -l sealedsecrets.bitnami.com/sealed-secrets-key -o yaml > .sealed-secrets-keys/sealed-secrets-key.yaml
kubeseal --kubeconfig="$KUBECONFIG" --fetch-cert > .sealed-secrets-keys/pub-cert.pem

echo "Sealed-secrets key backed up to .sealed-secrets-keys/"
echo ""
echo "To re-seal your secrets, you need the original plaintext secrets."
echo "Please provide the path to your plaintext secrets.yaml file:"
read -p "Path to secrets.yaml: " SECRETS_FILE

if [ ! -f "$SECRETS_FILE" ]; then
  echo "Error: File $SECRETS_FILE not found"
  exit 1
fi

echo ""
echo "Re-sealing secrets..."

# Re-seal the main app secrets
kubeseal --kubeconfig="$KUBECONFIG" \
  --cert=.sealed-secrets-keys/pub-cert.pem \
  --format=yaml \
  < "$SECRETS_FILE" \
  > k8s/base/sealed-secrets-new.yaml

echo ""
echo "New sealed secrets created at k8s/base/sealed-secrets-new.yaml"
echo "Please review and replace the old sealed-secrets.yaml file"
echo ""
echo "Key backup saved to .sealed-secrets-keys/sealed-secrets-key.yaml"
echo "This key will be automatically restored when you recreate the cluster"
