#!/bin/bash
# Update Cloudflare DNS A record with load balancer IP

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cloudflare DNS Update Script ===${NC}"
echo ""

# Check if required parameters are provided
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo -e "${RED}Error: CLOUDFLARE_API_TOKEN environment variable is not set${NC}"
  echo "Please set it in your terraform.tfvars or environment:"
  echo "  export CLOUDFLARE_API_TOKEN=your_token_here"
  exit 1
fi

if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
  echo -e "${RED}Error: CLOUDFLARE_ZONE_ID environment variable is not set${NC}"
  echo "Please set it in your terraform.tfvars or environment:"
  echo "  export CLOUDFLARE_ZONE_ID=your_zone_id_here"
  exit 1
fi

# Parse domains (supports JSON array, comma, or space separated values)
parse_domains() {
  local raw="$1"
  local domains=()

  # JSON array input: ["a.example.com","b.example.com"]
  if [[ "$raw" =~ ^\[.*\]$ ]]; then
    while IFS= read -r domain; do
      [ -n "$domain" ] && domains+=("$domain")
    done < <(echo "$raw" | jq -r '.[]')
  else
    # Comma/space separated string
    while IFS= read -r domain; do
      [ -n "$domain" ] && domains+=("$domain")
    done < <(echo "$raw" | tr ', ' '\n' | sed '/^$/d')
  fi

  echo "${domains[@]}"
}

# Get domains from Terraform output or environment variable
if [ -z "$CLOUDFLARE_DOMAIN" ]; then
  # Try to get from Terraform output
  CLOUDFLARE_DOMAIN=$(terraform -chdir=.. output -json cloudflare_domain 2>/dev/null)
fi

if [ -z "$CLOUDFLARE_DOMAIN" ] || [ "$CLOUDFLARE_DOMAIN" = "null" ] || [ "$CLOUDFLARE_DOMAIN" = "[]" ]; then
  echo -e "${RED}Error: CLOUDFLARE_DOMAIN is not set${NC}"
  echo "Please set it in your terraform.tfvars or environment:"
  echo "  export CLOUDFLARE_DOMAIN=\"budget.yourdomain.com,api.yourdomain.com\""
  exit 1
fi

DOMAINS=($(parse_domains "$CLOUDFLARE_DOMAIN"))

if [ ${#DOMAINS[@]} -eq 0 ]; then
  echo -e "${RED}Error: No valid domains found in CLOUDFLARE_DOMAIN${NC}"
  exit 1
fi

# Get load balancer IP from Terraform
echo "Fetching load balancer IP from Terraform..."
LB_IP=$(terraform -chdir=.. output -raw loadbalancer_ip 2>/dev/null)

if [ -z "$LB_IP" ] || [ "$LB_IP" = "null" ]; then
  echo -e "${YELLOW}Warning: Could not get load balancer IP from Terraform output${NC}"
  echo "Trying to use master IP as fallback..."
  LB_IP=$(terraform -chdir=.. output -raw master_ip 2>/dev/null)

  if [ -z "$LB_IP" ] || [ "$LB_IP" = "null" ]; then
    echo -e "${RED}Error: Could not get any IP from Terraform output${NC}"
    echo "Make sure the infrastructure is deployed."
    exit 1
  fi
fi

echo -e "${GREEN}Load Balancer IP: ${LB_IP}${NC}"
echo ""

# Cloudflare API endpoint
CF_API="https://api.cloudflare.com/client/v4"

update_dns_record() {
  local domain="$1"

  echo ""
  echo "Checking if DNS record exists for ${domain}..."
  local record_response
  record_response=$(curl -s -X GET "${CF_API}/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=A&name=${domain}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json")

  # Check if request was successful
  if echo "$record_response" | jq -e '.success == false' > /dev/null 2>&1; then
    local error_msg
    error_msg=$(echo "$record_response" | jq -r '.errors[0].message // "Unknown error"')
    echo -e "${RED}Error: Cloudflare API request failed for ${domain}: ${error_msg}${NC}"
    exit 1
  fi

  # Get record ID if it exists
  local record_id
  local current_ip
  record_id=$(echo "$record_response" | jq -r '.result[0].id // empty')
  current_ip=$(echo "$record_response" | jq -r '.result[0].content // empty')

  if [ -n "$record_id" ]; then
    echo -e "${YELLOW}DNS record found (ID: ${record_id})${NC}"
    echo "Current IP: ${current_ip}"

    if [ "$current_ip" = "$LB_IP" ]; then
      echo -e "${GREEN}DNS record for ${domain} is already up to date!${NC}"
      return
    fi

    echo -e "${YELLOW}Updating DNS record for ${domain}...${NC}"

    # Update existing record
    local update_response
    update_response=$(curl -s -X PUT "${CF_API}/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record_id}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "{
        \"type\": \"A\",
        \"name\": \"${domain}\",
        \"content\": \"${LB_IP}\",
        \"ttl\": 300,
        \"proxied\": false
      }")

    if echo "$update_response" | jq -e '.success == true' > /dev/null 2>&1; then
      echo -e "${GREEN}✓ DNS record updated successfully!${NC}"
      echo "  Domain: ${domain}"
      echo "  Old IP: ${current_ip}"
      echo "  New IP: ${LB_IP}"
    else
      local error_msg
      error_msg=$(echo "$update_response" | jq -r '.errors[0].message // "Unknown error"')
      echo -e "${RED}Error: Failed to update DNS record for ${domain}: ${error_msg}${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}DNS record not found for ${domain}. Creating new record...${NC}"

    # Create new record
    local create_response
    create_response=$(curl -s -X POST "${CF_API}/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "{
        \"type\": \"A\",
        \"name\": \"${domain}\",
        \"content\": \"${LB_IP}\",
        \"ttl\": 300,
        \"proxied\": false
      }")

    if echo "$create_response" | jq -e '.success == true' > /dev/null 2>&1; then
      local new_record_id
      new_record_id=$(echo "$create_response" | jq -r '.result.id')
      echo -e "${GREEN}✓ DNS record created successfully!${NC}"
      echo "  Domain: ${domain}"
      echo "  IP: ${LB_IP}"
      echo "  Record ID: ${new_record_id}"
    else
      local error_msg
      error_msg=$(echo "$create_response" | jq -r '.errors[0].message // "Unknown error"')
      echo -e "${RED}Error: Failed to create DNS record for ${domain}: ${error_msg}${NC}"
      exit 1
    fi
  fi
}

# Iterate over all domains
for domain in "${DOMAINS[@]}"; do
  update_dns_record "$domain"
done

echo ""
echo -e "${GREEN}DNS propagation may take a few minutes.${NC}"
echo "You can verify with: dig <domain> +short (e.g., dig ${DOMAINS[0]} +short)"
echo ""
