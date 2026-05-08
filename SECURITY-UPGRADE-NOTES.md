# Security Upgrade - Pre-Deployment Steps

## ⚠️ Required Before Deploying

### 1. Create Redis Secret
```bash
kubectl create secret generic redis-password --from-literal=REDIS_PASSWORD=<your-secure-password>
```

### 2. Update Ingress Domain
Edit `k8s/ingress-service.yaml` and replace `your-domain.com` with your actual domain name (both in the `tls.hosts` and `rules.host` fields).

### 3. Install cert-manager (for TLS)
If not already installed in your cluster:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```
Then create a ClusterIssuer for Let's Encrypt:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

### 4. Generate package-lock.json files
Run in each service directory to ensure deterministic builds:
```bash
cd client && npm install && cd ..
cd server && npm install && cd ..
cd worker && npm install && cd ..
```
Then commit the generated `package-lock.json` files.

### 5. Rebuild Docker Images
After merging, rebuild and push all Docker images:
```bash
docker build -t dayhunter/multi-client ./client
docker build -t dayhunter/multi-server ./server
docker build -t dayhunter/multi-worker ./worker
```

---

## CVEs Addressed

| Package | CVEs Fixed |
|---------|-----------|
| axios (0.18.0 → 1.7.9) | CVE-2019-10742, CVE-2020-28168, CVE-2021-3749, CVE-2023-45857, CVE-2025-62718, CVE-2026-40175 |
| express (4.16.3 → 4.21.0) | CVE-2022-24999, CVE-2024-29041, CVE-2024-43796, CVE-2024-10491 |
| react-scripts (1.1.4 → 5.0.1) | CVE-2021-3803 (nth-check ReDoS) |
| Redis server (untagged → 7.2-alpine + auth) | CVE-2022-0543, CVE-2025-49844, CVE-2026-23479, CVE-2026-25243, CVE-2026-25588, CVE-2026-25589, CVE-2026-23631 |
| PostgreSQL (untagged → 16.4-alpine) | Multiple historical CVEs mitigated |

## Additional Security Improvements

- **Docker**: All containers now run as non-root users with `npm ci` for deterministic builds
- **Kubernetes**: SecurityContexts, resource limits/requests, liveness/readiness probes on all pods
- **Network**: NetworkPolicies restrict pod-to-pod traffic (least privilege)
- **TLS**: Ingress configured with cert-manager for HTTPS enforcement
- **Application**: Input validation, iterative fibonacci (DoS prevention), CORS restrictions, error handling
