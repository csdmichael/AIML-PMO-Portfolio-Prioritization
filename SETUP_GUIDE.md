# Azure Setup & Deployment Guide

For the complete, detailed Azure architecture and step-by-step deployment instructions, please see:

👉 **[Complete Azure Setup & Deployment Guide (docs/SETUP_GUIDE.md)](docs/SETUP_GUIDE.md)**

For the end-user guide with multi-device screenshots and AI Copilot documentation:

👉 **[End-User Guide in Markdown (docs/USER_GUIDE.md)](docs/USER_GUIDE.md)**  
👉 **[End-User Guide in PDF format (docs/USER_GUIDE.pdf)](docs/USER_GUIDE.pdf)**

---

## Quick Deployment Commands Summary

```powershell
# 1. Sign in to Azure
az login
az account set --subscription "cf824570-a8ba-497a-a184-0a52f1830aa9"

# 2. Generate data & upload to Microsoft Fabric OneLake
python data-generator/generate_pmo_data.py
python data-generator/upload_to_onelake.py

# 3. Deploy Fabric Notebooks & Pipeline
python fabric/scripts/build_notebooks.py
python fabric/scripts/deploy_fabric_items.py

# 4. Deploy Infrastructure (Bicep)
pwsh infra/scripts/deploy.ps1 -IacTool bicep -Mode infra

# 5. Deploy Applications (API & UI)
pwsh infra/scripts/deploy.ps1 -Mode deploy -Component both
```

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for full architecture diagrams, prerequisites, and configuration details.
