#!/bin/bash
# Fetch the public certificate from Sealed Secrets controller
# This cert is used to encrypt secrets

set -e

# Set kubeconfig if needed
if [ -z "$KUBECONFIG" ]; then
  echo "Setting KUBECONFIG to ~/.kube/config-budget"
  export KUBECONFIG=~/.kube/config-budget
fi

echo "Fetching Sealed Secrets public certificate..."

kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  > base/sealed-secrets-pub-cert.pem

echo "Certificate saved to: base/sealed-secrets-pub-cert.pem"
echo ""
echo "This certificate is safe to commit to git and can be used to encrypt secrets offline."
