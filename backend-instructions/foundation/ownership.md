# Ownership & Multi-Tenancy

## Strategy: Shared Database, Isolated Schema

Every request is scoped via a `workspace_id` or `org_id` context injected at the middleware layer. This ensures strict data isolation between tenants while maintaining a simplified infrastructure footprint.
