# Query Optimization Strategy (Indexes)

The following indexes are required to support performant data access patterns:

```sql
CREATE INDEX idx_chapters_project_order ON chapters (project_id, order_index)
```

```sql
CREATE INDEX idx_projects_user ON projects (user_id)
```

```sql
CREATE INDEX idx_concepts_project ON book_concepts (project_id)
```

