#!/bin/bash

# ============================================================================
# Tanti Project Management - Google Cloud Run Deployment Script
# ============================================================================
# This script builds and deploys the application to Google Cloud Run.
#
# Required: PROJECT_ID environment variable must be set
# Optional: REGION (default: us-central1), SERVICE_NAME (default: tanti-app)
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Configuration with environment variables
# ============================================================================

# Required: GCP Project ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}ERROR: PROJECT_ID environment variable is not set${NC}"
    echo ""
    echo "Usage:"
    echo "  export PROJECT_ID=your-gcp-project-id"
    echo "  export REGION=us-central1              # Optional, defaults to us-central1"
    echo "  export SERVICE_NAME=tanti-app          # Optional, defaults to tanti-app"
    echo "  ./deploy.sh"
    echo ""
    exit 1
fi

# Optional: Cloud Run region (default: us-central1)
REGION="${REGION:-us-central1}"

# Optional: Cloud Run service name (default: tanti-app)
SERVICE_NAME="${SERVICE_NAME:-tanti-app}"

# Compute image name
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# ============================================================================
# Display configuration
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  Deploying to Google Cloud Run${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo -e "  Project ID:    ${YELLOW}${PROJECT_ID}${NC}"
echo -e "  Region:        ${YELLOW}${REGION}${NC}"
echo -e "  Service Name:  ${YELLOW}${SERVICE_NAME}${NC}"
echo -e "  Image:         ${YELLOW}${IMAGE}${NC}"
echo ""

# ============================================================================
# Set active project
# ============================================================================

echo -e "${GREEN}Setting active GCP project...${NC}"
gcloud config set project "$PROJECT_ID"
echo ""

# ============================================================================
# Build container image using Cloud Build
# ============================================================================

echo -e "${GREEN}Building container image...${NC}"
echo -e "${YELLOW}This may take 3-5 minutes...${NC}"
echo ""

gcloud builds submit --tag "$IMAGE" .

echo ""
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# ============================================================================
# Deploy to Cloud Run
# ============================================================================

echo -e "${GREEN}Deploying to Cloud Run...${NC}"
echo ""

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production"

echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}  ✓ Deployment Complete!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${BLUE}Your application is now live at:${NC}"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format "value(status.url)"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "  gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit 50 --format json"
echo ""
echo -e "${YELLOW}To manage the service:${NC}"
echo "  https://console.cloud.google.com/run?project=$PROJECT_ID"
echo ""

