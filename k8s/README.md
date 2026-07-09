# Kubernetes manifests for BhojanOS staging spine

Apply base resources before Helm releases:

```bash
kubectl apply -k k8s/staging/
```

Helm charts deploy workloads into `bhojanos-staging-spine`.
