#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Reset StatefulSets for Kind${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${YELLOW}This will delete and recreate StatefulSets with correct storage class.${NC}"
echo -e "${RED}WARNING: This will delete all data in postgres and redis!${NC}"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Deleting StatefulSets...${NC}"

# Delete StatefulSets (keeps PVCs by default)
kubectl delete statefulset postgres redis -n budget-app --ignore-not-found=true

echo -e "${GREEN}✓ StatefulSets deleted${NC}"
echo ""

echo -e "${YELLOW}Deleting PVCs to clean up storage...${NC}"

# Delete PVCs
kubectl delete pvc -n budget-app -l app=postgres --ignore-not-found=true
kubectl delete pvc -n budget-app -l app=redis --ignore-not-found=true

echo -e "${GREEN}✓ PVCs deleted${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Cleanup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Now redeploy:${NC}"
echo "  make deploy-kind"
echo ""
echo -e "${YELLOW}StatefulSets will be recreated with the 'standard' storage class${NC}"
echo ""
