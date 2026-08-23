# A3-Agent Testing & Quality Standards

A3-Agent enforces continuous automated testing across frontend and backend layers.

---

## 1. Backend Testing

### Running Tests
```bash
cd a3/backend
python -m pytest -v
```

### Test Scope
- **Schema Validation**: Tests email normalization, password constraints, and payload parsing.
- **Data Ingestion**: Tests CSV, TSV, and JSON parser correctness, type coercion, and edge-case handling.
- **Tenant Isolation**: Verifies strict multi-tenant partition across datasets, reports, jobs, and audit logs.
- **RBAC & API Keys**: Tests role hierarchy permission trees, API key generation, SHA-256 validation, and revocation.
- **Storage Security**: Tests path traversal sanitization and atomic storage operations.
- **AI Safety**: Tests prompt injection mitigation and deterministic computational tool execution.
- **Background Jobs**: Tests asynchronous lifecycle status updates and state persistence.

---

## 2. Frontend Testing & Linting

### Typecheck
```bash
cd a3/frontend
npx tsc --noEmit
```

### ESLint Check
```bash
cd a3/frontend
npm run lint
```

### Production Build Verification
```bash
cd a3/frontend
npm run build
```

---

## 3. Database Migration Integrity
```bash
cd a3/backend
alembic check
```
Verifies zero drift between SQLAlchemy domain models and current Alembic revision chain.
