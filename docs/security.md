# A3-Agent Security Architecture & Standards

A3-Agent is built with enterprise security controls covering authentication, authorization, multi-tenancy, data integrity, and AI safety.

---

## 1. Authentication & Session Management
- **Passwords**: Hashed with `bcrypt` using cryptographically secure random salts.
- **JWT Tokens**: Signed using `HS256` with strict signature verification, expiration claims (`exp`), and issued-at timestamps (`iat`).
- **API Keys**: Programmatic keys prefixed with `a3_live_`, stored only as SHA-256 hashes. Full key string is exposed only once upon generation.

---

## 2. Role-Based Access Control (RBAC)
Four standard access tiers:
1. `OWNER`: Full organization ownership, billing, and team lifecycle management.
2. `ADMIN`: Dataset management, user invitations, audit log review, and API key provisioning.
3. `ANALYST`: Upload datasets, run cleanings, configure forecasting, and execute what-if simulations.
4. `VIEWER`: Read-only access to datasets, profiles, charts, and generated reports.

---

## 3. Multi-Tenant Data Isolation
- Every database query for tenant assets (`datasets`, `reports`, `audit_logs`, `jobs`, `api_keys`) is strictly scoped by `org_id`.
- Automated test suites verify cross-organization access denial for reads, mutations, and deletions.

---

## 4. File Upload & Storage Security
- **Size Limit**: Enforced maximum upload size (25MB default, configurable).
- **Extension Allow-list**: Strict extension and MIME validation (`.csv`, `.tsv`, `.json`, `.txt`).
- **Path Traversal Protection**: Storage paths are verified using directory containment logic to prevent traversal outside configured roots.

---

## 5. AI Safety & Prompt Injection Mitigation
- Untrusted user input and dataset cell values are isolated from system instructions.
- Prompt injection filter blocks directive override patterns, secret extraction attempts, and destructive query syntax.
