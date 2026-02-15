# Concurrency & Race Condition Safety

## Strategy
Use a distributed job queue (e.g., BullMQ or AWS SQS) for all AI generation tasks. Chapter generation is asynchronous; the client polls or opens a WebSocket for progress updates. Max concurrency set to 3 concurrent generations per user.

### Implementation Details
- **Isolation Level**: Read Committed (Default)
- **Conflict Resolution**: Optimistic locking via versioning or field-level validation.
