#!/bin/bash

# Generate SSL certificates for development
# This script creates self-signed certificates for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CERT_DIR="nginx/ssl"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"
DAYS=365
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORG="AI Pets Adventure"
ORG_UNIT="Development"
COMMON_NAME="localhost"

echo -e "${GREEN}🔐 Generating SSL certificates for development...${NC}"

# Create SSL directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSL is not installed. Please install OpenSSL first.${NC}"
    exit 1
fi

# Generate private key
echo -e "${YELLOW}📝 Generating private key...${NC}"
openssl genrsa -out "$KEY_FILE" 2048

# Generate certificate signing request
echo -e "${YELLOW}📝 Generating certificate signing request...${NC}"
openssl req -new -key "$KEY_FILE" -out "$CERT_DIR/cert.csr" -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$ORG_UNIT/CN=$COMMON_NAME"

# Generate self-signed certificate
echo -e "${YELLOW}📝 Generating self-signed certificate...${NC}"
openssl x509 -req -in "$CERT_DIR/cert.csr" -signkey "$KEY_FILE" -out "$CERT_FILE" -days $DAYS

# Clean up CSR file
rm "$CERT_DIR/cert.csr"

# Set proper permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

# Verify the certificate
echo -e "${YELLOW}🔍 Verifying certificate...${NC}"
openssl x509 -in "$CERT_FILE" -text -noout | grep -E "(Subject:|Issuer:|Not Before|Not After)"

echo -e "${GREEN}✅ SSL certificates generated successfully!${NC}"
echo -e "${GREEN}📁 Certificate: $CERT_FILE${NC}"
echo -e "${GREEN}🔑 Private Key: $KEY_FILE${NC}"
echo -e "${YELLOW}⚠️  Note: These are self-signed certificates for development only.${NC}"
echo -e "${YELLOW}⚠️  For production, use certificates from a trusted CA.${NC}"

# Display certificate info
echo -e "\n${GREEN}📋 Certificate Information:${NC}"
echo "Common Name: $COMMON_NAME"
echo "Organization: $ORG"
echo "Valid for: $DAYS days"
echo "Generated: $(date)"

echo -e "\n${GREEN}🚀 You can now start the production environment with:${NC}"
echo "make prod-build"
echo "or"
echo "docker-compose --profile prod up --build" 