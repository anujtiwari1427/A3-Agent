# A3-Agent API Reference

The A3-Agent REST API is structured under the `/api/v1` prefix.

---

## 1. Authentication
- `POST /api/v1/auth/register`: Register user and create/assign organization.
- `POST /api/v1/auth/login`: Authenticate email/password and receive JWT bearer token.
- `GET /api/v1/auth/me`: Retrieve current user profile and organization metadata.

## 2. API Keys
- `POST /api/v1/api-keys`: Provision new programmatic API key (Admin only).
- `GET /api/v1/api-keys`: List existing API keys for current organization.
- `DELETE /api/v1/api-keys/{id}`: Revoke an API key.

## 3. Datasets
- `POST /api/v1/datasets/upload`: Upload raw tabular dataset (`multipart/form-data`).
- `POST /api/v1/datasets/sample/{type}`: Inject sample dataset (`ecommerce`, `saas`, `fintech`).
- `GET /api/v1/datasets`: List organization datasets with pagination.
- `GET /api/v1/datasets/{id}`: Retrieve dataset metadata.
- `GET /api/v1/datasets/{id}/data`: Retrieve paginated row data.
- `PATCH /api/v1/datasets/{id}`: Rename dataset and update description.
- `POST /api/v1/datasets/{id}/duplicate`: Clone dataset.
- `DELETE /api/v1/datasets/{id}`: Delete dataset and underlying storage assets.
- `GET /api/v1/datasets/{id}/download`: Download raw or processed dataset file.

## 4. Analytics & Data Science
- `GET /api/v1/datasets/{id}/analytics`: Full data quality, health score, column summary, and distribution.
- `GET /api/v1/datasets/{id}/correlations`: Multi-variable correlation matrix and top pairs.
- `GET /api/v1/datasets/{id}/regression`: Linear regression formula, R², and scatter points.
- `GET /api/v1/datasets/{id}/groupby`: Dimensional aggregation and metric rollups.
- `POST /api/v1/datasets/{id}/hypothesis`: Welch's T-Test hypothesis validation.
- `GET /api/v1/datasets/{id}/anomalies`: Z-Score and IQR statistical outlier scan.
- `GET /api/v1/datasets/{id}/forecast`: Time-series projection with confidence intervals.
- `POST /api/v1/datasets/{id}/whatif`: Sensitivity scenario simulation.

## 5. Data Cleaning
- `POST /api/v1/datasets/{id}/clean/preview`: Non-destructive diff preview of transformation rules.
- `POST /api/v1/datasets/{id}/clean`: Apply cleaning transformations and create cleaned derivative dataset.

## 6. AI Copilot
- `POST /api/v1/ai/chat`: Query conversational agent backed by mathematical tool execution.

## 7. Reports
- `POST /api/v1/reports/generate`: Generate structured executive intelligence report.

## 8. Background Jobs
- `GET /api/v1/jobs`: List background jobs for organization.
- `GET /api/v1/jobs/{id}`: Check status and progress percentage.
- `POST /api/v1/jobs/{id}/cancel`: Cancel active background job.

## 9. Observability & Health
- `GET /api/v1/health`: Process liveness check.
- `GET /api/v1/ready`: Full readiness probe (database and storage connectivity).
