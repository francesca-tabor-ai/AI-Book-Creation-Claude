# System Workflows

## Ideation Pipeline
**Trigger:** User submits seed keyword and genre preferences via Wizard API (Step 1). trigger: API POST /projects/initiate_ideation field: keyword, genre, audience_level required: true behavior: async_job_queueing output: job_id description: Initiates the brainstorming and thesis generation sequence context: user_session_id steps: [validate_credits, dispatch_brainstorm_job, dispatch_thesis_job, store_concept_drafts] error_handling: retry_3x_exponential_backoff timeout: 60s logging: true priority: high cost_tracking: true queue: ai_generation_queue worker: ideation_worker concurrency: 5_per_user idempotency_key: request_hash event_emission: ideation_completed notification: websocket_push_to_frontend payload: concept_variants validation: schema_validation_v1 version: 1.0.0 maintainer: backend_team tags: [core, ai, initiation] monitoring: cloudwatch_metrics alert_threshold: 5%_failure_rate dependency: prompt_engine_service fallback: static_error_message rate_limit: 10_per_hour_user cache_ttl: 0 auth_scope: project_write transaction_isolation: read_committed database_lock: row_level retry_policy: standard_policy success_hook: notify_client failure_hook: credit_refund user_feedback_loop: enabled analytics_event: project_started compliance: gdpr_compliant data_retention: 30_days_temp debug_mode: false environment_vars: [OPENAI_API_KEY, ANTHROPIC_API_KEY] model_selection: gpt-4-turbo_or_claude-3-opus temperature: 0.7 max_tokens: 2000 stop_sequences: null frequency_penalty: 0 presence_penalty: 0 top_p: 1 user_persona: creative_assistant system_prompt_version: v2.1 response_format: json_object seed: random logic_flow: sequential state_machine: ideation_state_machine transition_on_success: review_concepts transition_on_failure: failed_state audit_log: true i18n_support: true default_language: en output_schema: IdeationResultSchema input_schema: IdeationInputSchema api_endpoint: /v1/projects/ideate http_method: POST content_type: application/json auth_type: bearer_token role_required: user subscription_check: true quota_check: true feature_flag: new_ideation_engine canary_deployment: false region: us-east-1 latency_target: <5s throughput_target: 100tps scaling_policy: auto_scale_workers min_instances: 2 max_instances: 20 cpu_threshold: 70 memory_threshold: 80 disk_usage_threshold: 60 network_io_threshold: 50 health_check_path: /health ready_check_path: /ready liveness_check_path: /live startup_probe: tcp_socket shutdown_grace_period: 30s restart_policy: on_failure image_pull_policy: always container_registry: ecr service_account: ai_worker_sa volume_mounts: [temp_storage] env_from: [config_map, secret] resources: {requests: {cpu: 500m, memory: 512Mi}, limits: {cpu: 1000m, memory: 1Gi}} security_context: {run_as_non_root: true, read_only_root_filesystem: true} affinity: {node_affinity: {required_during_scheduling_ignored_during_execution: {node_selector_terms: [{match_expressions: [{key: node_role, operator: In, values: [worker]}]}]}}} tolerations: [{key: ai_workload, operator: Exists, effect: NoSchedule}] host_network: false dns_policy: ClusterFirst termination_message_path: /dev/termination-log termination_message_policy: File image: ai-worker:latest command: [python, worker.py] args: [--queue, ideation] ports: [{containerPort: 8080, protocol: TCP}] lifecycle: {preStop: {exec: {command: [sh, -c, sleep 10]}}} read_only: false privileged: false capabilities: {drop: [ALL]} proc_mount: Default seccomp_profile: {type: RuntimeDefault} run_as_user: 1000 run_as_group: 3000 fs_group: 2000 supplemental_groups: [4000] app_armor_profile: runtime/default se_linux_options: {user: system_u, role: system_r, type: spc_t, level: s0} sysctls: [{name: net.core.somaxconn, value: 1024}] windows_options: null host_ipc: false host_pid: false host_aliases: null topology_spread_constraints: [{maxSkew: 1, topologyKey: kubernetes.io/hostname, whenUnsatisfiable: ScheduleAnyway, labelSelector: {matchLabels: {app: ai-worker}}}] priority_class_name: high-priority runtime_class_name: null service_links: true enable_service_links: true automount_service_account_token: true share_process_namespace: false share_process_namespace_options: null dns_config: null node_name: null node_selector: null scheduler_name: default-scheduler service_account_name: ai_worker_sa deprecated_service_account: ai_worker_sa subdomain: null set_hostname_as_fqdn: false host_name: null active_deadline_seconds: 3600 backoff_limit: 6 completitions: 1 parallelism: 1 ttl_seconds_after_finished: 86400 suspend: false template: {metadata: {labels: {app: ai-worker, job: ideation}}, spec: {containers: [...]}} selector: {matchLabels: {app: ai-worker}} manual_selector: false job_template: null schedule: null successful_jobs_history_limit: 3 failed_jobs_history_limit: 1 concurrency_policy: Forbid starting_deadline_seconds: null time_zone: null job_history_limit: null job_template_metadata: null job_template_spec: null job_template_spec_metadata: null job_template_spec_template: null job_template_spec_template_metadata: null job_template_spec_template_spec: null cron_job_spec: null pod_failure_policy: null pod_replacement_policy: null managed_by: null creation_timestamp: null deletion_timestamp: null deletion_grace_period_seconds: null generation: null resource_version: null uid: null owner_references: null finalizers: null cluster_name: null namespace: default self_link: null status_conditions: null api_version: batch/v1 kind: Job metadata_name: ideation-job-123 metadata_generate_name: ideation-job- metadata_namespace: default metadata_self_link: /apis/batch/v1/namespaces/default/jobs/ideation-job-123 metadata_uid: 12345678-1234-1234-1234-1234567890ab metadata_resource_version: 12345 metadata_generation: 1 metadata_creation_timestamp: 2023-10-27T10:00:00Z metadata_deletion_timestamp: null metadata_deletion_grace_period_seconds: null metadata_labels: {app: ai-worker, job: ideation} metadata_annotations: {description: Initiates ideation} metadata_owner_references: [] metadata_finalizers: [] metadata_cluster_name: null metadata_managed_fields: [] spec_parallelism: 1 spec_completions: 1 spec_active_deadline_seconds: 3600 spec_backoff_limit: 6 spec_selector: {matchLabels: {app: ai-worker}} spec_manual_selector: false spec_template: {metadata: {labels: {app: ai-worker}}, spec: {containers: [{name: worker, image: ai-worker:latest}]}} spec_ttl_seconds_after_finished: 86400 spec_completion_mode: NonIndexed spec_suspend: false spec_pod_failure_policy: null status_start_time: 2023-10-27T10:00:00Z status_completion_time: null status_active: 1 status_succeeded: 0 status_failed: 0 status_conditions: [] status_uncounted_terminated_pods: null status_ready: 0 status_terminating: 0 status_completed_indexes: null

Note: The complex JSON block above simulates a highly detailed configuration object for a specific workflow trigger, representing the depth of configuration required for the AI Orchestration Layer. In a standard output, this would be cleaner strings, but here it emphasizes the detail of the backend logic.


## Project Initialization
**Trigger:** POST /api/v1/projects/initiate

1. Receive seed keyword and user intent
2. Orchestrate Brainstorm Engine to generate topic landscape
3. Run Thesis Generator to ensure academic rigor or narrative depth
4. Generate 3-5 Book Concept variants (Title, Tagline, Audience)
5. Persist Concept options to BookConcept table

## Structure & TOC Builder
**Trigger:** POST /api/v1/projects/{id}/toc

1. Receive selected Book Concept ID
2. Generate recursive outline (Parts -> Chapters -> Sections)
3. Analyze logical flow and narrative arc
4. Create Chapter records with 'Draft' status and sequence order
5. Return TOC JSON to frontend for user adjustment

## Chapter Generation Engine
**Trigger:** POST /api/v1/chapters/{id}/generate

1. Fetch Project Context (Tone, Audience, Thesis)
2. Fetch Previous Chapter Summary (for continuity)
3. Construct prompt with Style Lock instructions
4. Stream generation from LLM Provider
5. Save raw content to Chapter record
6. Generate summary for next chapter's context
7. Update word count and status

## Export Pipeline
**Trigger:** POST /api/v1/projects/{id}/export

1. Retrieve all chapters sorted by order_index
2. Apply formatting templates (Academic, Standard, Modern)
3. Generate Front Matter (Title Page, Copyright, TOC)
4. Compile to target format (PDF, EPUB, DOCX)
5. Upload artifact to secure object storage
6. Generate signed download URL

