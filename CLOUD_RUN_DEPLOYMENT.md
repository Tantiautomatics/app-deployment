# Google Cloud Run Deployment - Quick Reference

## 📋 Prerequisites Checklist

- [ ] Google Cloud SDK (`gcloud`) installed
- [ ] GCP Project created
- [ ] Cloud Run API enabled
- [ ] Cloud Build API enabled
- [ ] Container Registry API enabled
- [ ] Service account with deployment permissions (optional but recommended)

## 🚀 Quick Deployment

### 1. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Authenticate (Choose One)

**Option A: Service Account (Recommended)**
```bash
gcloud auth activate-service-account YOUR_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com \
  --key-file=credentials/key.json

gcloud config set project YOUR_PROJECT_ID
```

**Option B: User Account**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 3. Set Environment Variables

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1              # Optional, defaults to us-central1
export SERVICE_NAME=tanti-app          # Optional, defaults to tanti-app
```

### 4. Deploy

**Linux/Mac/Git Bash:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows PowerShell:**
```powershell
bash deploy.sh
```

**Using config file:**
```bash
cp deploy.config.example deploy.config
# Edit deploy.config with your values
source deploy.config
./deploy.sh
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROJECT_ID` | Yes | - | Your GCP project ID |
| `REGION` | No | `us-central1` | Cloud Run deployment region |
| `SERVICE_NAME` | No | `tanti-app` | Cloud Run service name |

### Common Regions

- `us-central1` - Iowa (recommended for US)
- `us-east1` - South Carolina
- `us-west1` - Oregon
- `europe-west1` - Belgium
- `asia-south1` - Mumbai
- `asia-southeast1` - Singapore

Full list: https://cloud.google.com/run/docs/locations

## 📊 Post-Deployment

### Get Service URL

```bash
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format "value(status.url)"
```

### View Logs

```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
  --limit 50 \
  --format json
```

### View in Console

```
https://console.cloud.google.com/run?project=YOUR_PROJECT_ID
```

## 🔒 Security

### Allow Public Access

```bash
gcloud run services add-iam-policy-binding $SERVICE_NAME \
  --region=$REGION \
  --member=allUsers \
  --role=roles/run.invoker
```

### Restrict Access (Remove Public)

```bash
gcloud run services remove-iam-policy-binding $SERVICE_NAME \
  --region=$REGION \
  --member=allUsers \
  --role=roles/run.invoker
```

### Add Specific User Access

```bash
gcloud run services add-iam-policy-binding $SERVICE_NAME \
  --region=$REGION \
  --member=user:email@example.com \
  --role=roles/run.invoker
```

## 🐛 Troubleshooting

### Check Build Status

```bash
gcloud builds list --limit=5
```

### View Build Logs

```bash
gcloud builds log BUILD_ID
```

### Check Service Status

```bash
gcloud run services list --region=$REGION
```

### Test Health Endpoint

```bash
curl https://YOUR_SERVICE_URL/health
```

### Common Issues

**Build fails:**
- Check Cloud Build logs
- Verify Dockerfile syntax
- Ensure all files are accessible (not in .dockerignore)

**Service starts but returns errors:**
- Check Cloud Run logs
- Verify environment variables
- Test locally first with `docker build` and `docker run`

**403 Forbidden:**
- Add public access policy (see Security section)
- Or authenticate requests with proper credentials

**Cold starts are slow:**
- Set minimum instances: `gcloud run services update $SERVICE_NAME --min-instances=1 --region=$REGION`
- Optimize Dockerfile

## 💰 Cost Optimization

### Set Resource Limits

```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10
```

### Enable CPU Throttling (Reduce Idle Costs)

```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --cpu-throttling
```

### Delete Service When Not Needed

```bash
gcloud run services delete $SERVICE_NAME --region=$REGION
```

## 📚 Additional Resources

- Cloud Run Documentation: https://cloud.google.com/run/docs
- Pricing Calculator: https://cloud.google.com/products/calculator
- Best Practices: https://cloud.google.com/run/docs/best-practices
- Security Guide: https://cloud.google.com/run/docs/securing/overview

## 🔄 Redeployment

To redeploy after making changes:

```bash
# Make your code changes
git add .
git commit -m "Your changes"

# Redeploy (same command as initial deployment)
export PROJECT_ID=your-project-id
./deploy.sh
```

The script is idempotent and safe to run multiple times.


