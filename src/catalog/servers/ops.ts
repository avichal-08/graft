import { server, t } from '../dsl.js'

const region = 'region AWS region, e.g. us-east-1; defaults to the profile region'

export const aws = server('aws', 'AWS', 'S3, EC2, Lambda, CloudWatch and IAM on AWS.', [
  t('s3_list_buckets', 'List S3 buckets with creation date and region.', [], { gives: ['aws.bucket'], caps: ['list storage'] }),
  t('s3_list_objects', 'List objects under a prefix with size and last modified time.', ['bucket! Bucket name', 'prefix Key prefix', 'maxKeys:int Max keys'], { needs: ['aws.bucket'], gives: ['aws.object'], caps: ['list files', 'list storage'] }),
  t('s3_get_object', 'Read an object; text content is returned inline, binary as base64.', ['bucket! Bucket name', 'key! Object key'], { needs: ['aws.bucket', 'aws.object'], gives: ['text'], caps: ['read file'] }),
  t('s3_put_object', 'Write an object from text or base64 content.', ['bucket! Bucket name', 'key! Object key', 'body! Content', 'contentType MIME type'], { needs: ['aws.bucket', 'path', 'text'], gives: ['aws.object'], caps: ['upload file'] }),
  t('s3_presign_url', 'Create a time limited download url for an object.', ['bucket! Bucket name', 'key! Object key', 'expiresIn:int Seconds until expiry'], { needs: ['aws.bucket', 'aws.object'], gives: ['url'], caps: ['share file'] }),
  t('ec2_describe_instances', 'Describe EC2 instances with state, type, tags and private ip, filtered by tag or id.', [region, 'filters:arr Filters as Name=tag:env,Values=prod', 'instanceIds:arr Instance ids'], { gives: ['aws.instance'], caps: ['list servers', 'infrastructure status'] }),
  t('ec2_start_instances', 'Start stopped instances.', [region, 'instanceIds:arr! Instance ids'], { needs: ['aws.instance'], caps: ['start server'] }),
  t('ec2_stop_instances', 'Stop running instances.', [region, 'instanceIds:arr! Instance ids', 'force:bool Force stop'], { needs: ['aws.instance'], caps: ['stop server'] }),
  t('ec2_reboot_instances', 'Reboot instances.', [region, 'instanceIds:arr! Instance ids'], { needs: ['aws.instance'], caps: ['restart server', 'mitigate incident'] }),
  t('lambda_list_functions', 'List Lambda functions with runtime, memory and last modified.', [region], { gives: ['aws.lambda'], caps: ['list functions'] }),
  t('lambda_invoke', 'Invoke a Lambda function synchronously with a JSON payload.', [region, 'functionName! Function name or arn', 'payload:obj JSON payload'], { needs: ['aws.lambda'], gives: ['text'], caps: ['run function'] }),
  t('lambda_update_config', 'Update memory, timeout or environment variables on a function.', [region, 'functionName! Function name', 'memorySize:int Memory in MB', 'timeout:int Timeout seconds', 'environment:obj Environment variables'], { needs: ['aws.lambda'], caps: ['change config', 'mitigate incident'] }),
  t('logs_describe_groups', 'List CloudWatch log groups by prefix.', [region, 'prefix Log group name prefix'], { gives: ['aws.log_group'], caps: ['find logs'] }),
  t('logs_query', 'Run a CloudWatch Logs Insights query over a time range and wait for results.', [region, 'logGroupNames:arr! Log groups', 'query! Insights query, e.g. fields @timestamp, @message | filter @message like /ERROR/', 'startTime:date! Range start', 'endTime:date! Range end'], { needs: ['aws.log_group', 'query', 'date'], gives: ['text'], caps: ['search logs', 'debug production error'] }),
  t('cloudwatch_get_metric', 'Get datapoints for a CloudWatch metric.', [region, 'namespace! Namespace, e.g. AWS/EC2', 'metricName! Metric name', 'dimensions:arr Dimensions', 'startTime:date! Start', 'endTime:date! End', 'period:int Period seconds', 'statistic:enum(Average|Sum|Maximum|Minimum|SampleCount) Statistic'], { needs: ['date'], gives: ['number'], caps: ['check metrics'] }),
  t('iam_list_users', 'List IAM users with creation date and last activity.', [], { gives: ['aws.iam_user'], caps: ['access review'] }),
  t('iam_get_user_policies', 'List attached and inline policies for an IAM user.', ['userName! IAM user name'], { needs: ['aws.iam_user'], gives: ['text'], caps: ['access review'] }),
])

export const datadog = server('datadog', 'Datadog', 'Metrics, monitors, logs, dashboards and incidents in Datadog.', [
  t('query_metrics', 'Query timeseries metrics with Datadog query syntax over a time range.', ['query! Metric query, e.g. avg:system.cpu.user{service:api} by {host}', 'from:date! Start', 'to:date! End'], { needs: ['query', 'date'], gives: ['number'], caps: ['check metrics', 'performance regression'] }),
  t('search_logs', 'Search logs with Datadog log query syntax.', ['query! Log query, e.g. service:checkout status:error', 'from:date! Start', 'to:date! End', 'limit:int Max logs'], { needs: ['query', 'date'], gives: ['text'], caps: ['search logs', 'debug production error'] }),
  t('list_monitors', 'List monitors with current state, filtered by tags or name.', ['name Name filter', 'tags Comma separated tags', 'monitor_tags Monitor tags'], { gives: ['datadog.monitor'], caps: ['list alerts', 'infrastructure status'] }),
  t('get_monitor', 'Get a monitor with query, thresholds, notification targets and state per group.', ['monitor_id:int! Monitor id'], { needs: ['datadog.monitor'], gives: ['text'], caps: ['read alert'] }),
  t('mute_monitor', 'Mute a monitor, optionally for a scope and until a time.', ['monitor_id:int! Monitor id', 'scope Scope to mute, e.g. host:web-1', 'end:int Unix time to unmute'], { needs: ['datadog.monitor'], caps: ['silence alert'] }),
  t('create_monitor', 'Create a metric, log or apm monitor.', ['name! Monitor name', 'type! Monitor type, e.g. metric alert', 'query! Monitor query', 'message! Notification message with @-handles', 'thresholds:obj Critical and warning thresholds'], { needs: ['query', 'text'], gives: ['datadog.monitor'], caps: ['create alert'] }),
  t('list_dashboards', 'List dashboards by name.', ['filter Name filter'], { gives: ['datadog.dashboard'], caps: ['find dashboard'] }),
  t('get_dashboard', 'Get a dashboard definition and widget queries.', ['dashboard_id! Dashboard id'], { needs: ['datadog.dashboard'], gives: ['query', 'url'], caps: ['find dashboard'] }),
  t('list_incidents', 'List incidents with severity, state and commander.', ['state:enum(active|stable|resolved) State'], { gives: ['datadog.incident'], caps: ['incident status'] }),
  t('create_incident', 'Declare an incident with severity and customer impact.', ['title! Incident title', 'severity:enum(SEV-1|SEV-2|SEV-3|SEV-4|SEV-5)! Severity', 'customer_impacted:bool Customer impact', 'commander Commander handle'], { needs: ['title'], gives: ['datadog.incident'], caps: ['declare incident'] }),
  t('update_incident', 'Update incident state, severity or add a timeline note.', ['incident_id! Incident id', 'state:enum(active|stable|resolved) State', 'severity Severity', 'note Timeline note'], { needs: ['datadog.incident'], caps: ['incident status', 'resolve incident'] }),
  t('list_apm_services', 'List APM services with request rate, error rate and p95 latency.', ['env Environment, e.g. prod'], { gives: ['datadog.service'], caps: ['service health'] }),
])

export const pagerduty = server('pagerduty', 'PagerDuty', 'Incidents, on-call schedules, services and escalation in PagerDuty.', [
  t('list_incidents', 'List incidents filtered by status, urgency, service or time.', ['statuses:arr triggered, acknowledged, resolved', 'urgencies:arr high, low', 'service_ids:arr Service ids', 'since:date Start time'], { gives: ['pagerduty.incident'], caps: ['incident status', 'list alerts'] }),
  t('get_incident', 'Get an incident with service, assignees, escalation policy and alert details.', ['id! Incident id'], { needs: ['pagerduty.incident'], gives: ['pagerduty.service', 'pagerduty.user'], caps: ['incident status'] }),
  t('create_incident', 'Trigger an incident on a service.', ['service_id! Service id', 'title! Incident title', 'urgency:enum(high|low) Urgency', 'body Details', 'escalation_policy_id Escalation policy id'], { needs: ['pagerduty.service', 'title'], gives: ['pagerduty.incident'], caps: ['page on call', 'declare incident'] }),
  t('acknowledge_incident', 'Acknowledge an incident.', ['id! Incident id', 'from_email! Email of the acknowledging user'], { needs: ['pagerduty.incident', 'email'], caps: ['acknowledge alert'] }),
  t('resolve_incident', 'Resolve an incident with an optional resolution note.', ['id! Incident id', 'from_email! Email of the resolving user', 'resolution Resolution note'], { needs: ['pagerduty.incident', 'email'], caps: ['resolve incident'] }),
  t('reassign_incident', 'Reassign an incident to users or an escalation policy.', ['id! Incident id', 'assignee_ids:arr User ids', 'escalation_policy_id Escalation policy id'], { needs: ['pagerduty.incident', 'pagerduty.user'], caps: ['escalate incident'] }),
  t('add_note', 'Add a note to an incident timeline.', ['id! Incident id', 'content! Note text'], { needs: ['pagerduty.incident', 'text'], caps: ['incident update'] }),
  t('list_services', 'List services with status and escalation policy.', ['query Name filter'], { gives: ['pagerduty.service'], caps: ['service health'] }),
  t('list_oncalls', 'List who is on call now for schedules or escalation policies.', ['schedule_ids:arr Schedule ids', 'escalation_policy_ids:arr Policy ids', 'since:date Window start', 'until:date Window end'], { gives: ['pagerduty.user', 'pagerduty.schedule'], caps: ['who is on call', 'page on call'] }),
  t('get_user', 'Get a PagerDuty user with email, phone contact methods and teams.', ['id! User id'], { needs: ['pagerduty.user'], gives: ['email', 'phone', 'person'], caps: ['look up person'] }),
  t('list_schedules', 'List on-call schedules.', ['query Name filter'], { gives: ['pagerduty.schedule'], caps: ['who is on call'] }),
  t('create_override', 'Create a schedule override so someone else covers a shift.', ['schedule_id! Schedule id', 'user_id! Covering user id', 'start:date! Start', 'end:date! End'], { needs: ['pagerduty.schedule', 'pagerduty.user', 'date'], caps: ['swap on call'] }),
])

export const postgres = server('postgres', 'Postgres', 'Read only SQL access to the production replica and schema inspection.', [
  t('list_schemas', 'List schemas in the database.', [], { gives: ['postgres.schema'], caps: ['explore database'] }),
  t('list_tables', 'List tables in a schema with row estimates.', ['schema Schema name, default public'], { needs: ['postgres.schema'], gives: ['postgres.table'], caps: ['explore database'] }),
  t('describe_table', 'Describe columns, types, indexes and foreign keys of a table.', ['table! Table name, optionally schema qualified'], { needs: ['postgres.table'], gives: ['text'], caps: ['explore database'] }),
  t('query', 'Run a read only SQL query and return up to 500 rows as JSON.', ['sql! SELECT statement', 'params:arr Positional parameters'], { needs: ['sql'], gives: ['text', 'number', 'email'], caps: ['query database', 'look up user record', 'analytics'] }),
  t('explain', 'Return the EXPLAIN ANALYZE plan for a query.', ['sql! SELECT statement'], { needs: ['sql'], gives: ['text'], caps: ['debug slow query'] }),
  t('list_slow_queries', 'List the slowest statements from pg_stat_statements.', ['limit:int Max rows'], { gives: ['sql'], caps: ['debug slow query', 'performance regression'] }),
])

export const vercel = server('vercel', 'Vercel', 'Deployments, projects, domains and logs on Vercel.', [
  t('list_projects', 'List projects with framework and production url.', [], { gives: ['vercel.project'], caps: ['list projects'] }),
  t('list_deployments', 'List deployments for a project with state, git branch and commit.', ['projectId! Project id', 'target:enum(production|preview) Target', 'limit:int Max results'], { needs: ['vercel.project'], gives: ['vercel.deployment', 'github.commit'], caps: ['deploy status', 'recent changes'] }),
  t('get_deployment', 'Get a deployment with build status, url, aliases and creator.', ['id! Deployment id'], { needs: ['vercel.deployment'], gives: ['url'], caps: ['deploy status'] }),
  t('get_deployment_logs', 'Fetch build and runtime logs for a deployment.', ['id! Deployment id', 'since:date Start time'], { needs: ['vercel.deployment'], gives: ['text'], caps: ['read build logs', 'debug failing build'] }),
  t('promote_deployment', 'Promote a deployment to production, which is how rollbacks are done.', ['projectId! Project id', 'deploymentId! Deployment id'], { needs: ['vercel.project', 'vercel.deployment'], caps: ['rollback deploy', 'mitigate incident'] }),
  t('create_deployment', 'Trigger a deployment from a git ref.', ['projectId! Project id', 'ref! Branch or sha', 'target:enum(production|preview) Target'], { needs: ['vercel.project', 'github.branch'], gives: ['vercel.deployment'], caps: ['deploy'] }),
  t('set_env_var', 'Add or update an environment variable for a project.', ['projectId! Project id', 'key! Variable name', 'value! Value', 'target:arr production, preview, development'], { needs: ['vercel.project'], caps: ['change config'] }),
])

export const ops = [aws, datadog, pagerduty, postgres, vercel]
