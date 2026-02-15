# ERD Structure

## Tables

### users
| Column | Type | Constraints |
| :--- | :--- | :--- |
| id | UUID | PK |
| id | string | NULL |
| email | string | NULL |
| subscription_tier | string | NULL |
| generation_credits | integer | NULL |

### projects
| Column | Type | Constraints |
| :--- | :--- | :--- |
| id | UUID | PK |
| id | string | NULL |
| user_id | string | NULL |
| title | string | NULL |
| seed_keyword | string | NULL |
| status | string | NULL |
| tone_voice_settings | json | NULL |
| target_audience | string | NULL |

### bookconcepts
| Column | Type | Constraints |
| :--- | :--- | :--- |
| id | UUID | PK |
| id | string | NULL |
| thesis_statement | string | NULL |
| brainstorm_map | json | NULL |
| selected_tagline | string | NULL |
| market_positioning | string | NULL |

### chapters
| Column | Type | Constraints |
| :--- | :--- | :--- |
| id | UUID | PK |
| id | string | NULL |
| project_id | string | NULL |
| title | string | NULL |
| order_index | integer | NULL |
| content_markdown | string | NULL |
| summary_context | string | NULL |
| word_count | integer | NULL |
| status | string | NULL |

### coverdesigns
| Column | Type | Constraints |
| :--- | :--- | :--- |
| id | UUID | PK |
| id | string | NULL |
| image_prompt | string | NULL |
| image_url | string | NULL |
| style_variant | string | NULL |

