#!/bin/bash
# Script to seal secrets using the backed-up public certificate

set -e

echo "=== Seal Secrets Utility ==="
echo ""

# Check if we have the public cert
if [ ! -f "../.sealed-secrets-keys/pub-cert.pem" ]; then
  echo "Error: Public certificate not found at ../.sealed-secrets-keys/pub-cert.pem"
  echo ""
  echo "If you have a backed-up key, extract the cert with:"
  echo "  grep 'tls.crt' .sealed-secrets-keys/sealed-secrets-key.yaml | head -1 | awk '{print \$2}' | base64 -d > .sealed-secrets-keys/pub-cert.pem"
  echo ""
  echo "Or if you have a running cluster:"
  echo "  kubeseal --fetch-cert > .sealed-secrets-keys/pub-cert.pem"
  exit 1
fi

echo "✓ Found public certificate"
echo ""

# Check if secrets.yaml exists
if [ ! -f "base/secrets.yaml" ]; then
  echo "Error: base/secrets.yaml not found"
  echo ""
  echo "Please create base/secrets.yaml with your plaintext secrets first."
  echo "See SETUP.md for the format."
  exit 1
fi

echo "✓ Found plaintext secrets"
echo ""

# Seal the secrets
echo "Sealing secrets..."

# Seal main app secrets
kubeseal --cert=../.sealed-secrets-keys/pub-cert.pem --format=yaml \
  < base/secrets.yaml \
  > base/sealed-secrets-new.yaml

echo ""
echo "=== Secrets Sealed Successfully ==="
echo ""
echo "New sealed secrets created at: base/sealed-secrets-new.yaml"
echo ""
echo "Next steps:"
echo "1. Review the new sealed secrets file"
echo "2. Backup old file: mv base/sealed-secrets.yaml base/sealed-secrets.yaml.old"
echo "3. Replace with new: mv base/sealed-secrets-new.yaml base/sealed-secrets.yaml"
echo "4. If you have separate registry secrets, seal them too"
echo "5. Deploy: kubectl apply -k base/"
echo ""
echo "Note: These sealed secrets will work when you recreate the cluster"
echo "because the encryption key is automatically restored!"
echo ""
