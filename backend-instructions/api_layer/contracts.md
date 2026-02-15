# Contract Specifications

Payload definitions for the application's API interface:

## User Contract

### Request Payload
```json
{
  "email": "...",
  "subscription_tier": "...",
  "generation_credits": "..."
}
```

### Response Payload
```json
{
  "id": "uuid",
  "email": "...",
  "subscription_tier": "...",
  "generation_credits": "..."
}
```

---

## Project Contract

### Request Payload
```json
{
  "user_id": "...",
  "title": "...",
  "seed_keyword": "...",
  "status": "...",
  "tone_voice_settings": "...",
  "target_audience": "..."
}
```

### Response Payload
```json
{
  "id": "uuid",
  "user_id": "...",
  "title": "...",
  "seed_keyword": "...",
  "status": "...",
  "tone_voice_settings": "...",
  "target_audience": "..."
}
```

---

## BookConcept Contract

### Request Payload
```json
{
  "thesis_statement": "...",
  "brainstorm_map": "...",
  "selected_tagline": "...",
  "market_positioning": "..."
}
```

### Response Payload
```json
{
  "id": "uuid",
  "thesis_statement": "...",
  "brainstorm_map": "...",
  "selected_tagline": "...",
  "market_positioning": "..."
}
```

---

## Chapter Contract

### Request Payload
```json
{
  "project_id": "...",
  "title": "...",
  "order_index": "...",
  "content_markdown": "...",
  "summary_context": "...",
  "word_count": "...",
  "status": "..."
}
```

### Response Payload
```json
{
  "id": "uuid",
  "project_id": "...",
  "title": "...",
  "order_index": "...",
  "content_markdown": "...",
  "summary_context": "...",
  "word_count": "...",
  "status": "..."
}
```

---

## CoverDesign Contract

### Request Payload
```json
{
  "image_prompt": "...",
  "image_url": "...",
  "style_variant": "..."
}
```

### Response Payload
```json
{
  "id": "uuid",
  "image_prompt": "...",
  "image_url": "...",
  "style_variant": "..."
}
```

---

