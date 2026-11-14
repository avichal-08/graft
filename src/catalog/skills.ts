// reusable recipes an agent has learned. stored as (:Skill)-[:USES]->(:Tool).
export type Skill = { key: string; description: string; steps: string[] }

export const skills: Skill[] = [
  {
    key: 'triage_error',
    description: 'Triage a production error: find it in Sentry, read the stack trace, check the release that introduced it and file an issue.',
    steps: ['sentry.search_issues', 'sentry.get_latest_event', 'sentry.get_release', 'linear.create_issue'],
  },
  {
    key: 'incident_kickoff',
    description: 'Kick off an incident: page the on-call engineer, open an incident channel and post the first update.',
    steps: ['pagerduty.list_oncalls', 'pagerduty.create_incident', 'slack.create_channel', 'slack.post_message'],
  },
  {
    key: 'refund_customer',
    description: 'Refund a customer: find them by email, find the charge and refund it.',
    steps: ['stripe.search_customers', 'stripe.list_charges', 'stripe.create_refund'],
  },
  {
    key: 'ship_fix',
    description: 'Ship a code fix: branch, commit the change and open a pull request.',
    steps: ['github.create_branch', 'github.create_or_update_file', 'github.create_pull_request'],
  },
  {
    key: 'weekly_pipeline_review',
    description: 'Review the sales pipeline: list open deals, check owners and post a summary.',
    steps: ['hubspot.search_deals', 'hubspot.get_deal', 'hubspot.list_owners', 'slack.post_message'],
  },
  {
    key: 'schedule_with_person',
    description: 'Find a free slot with someone and send them an invite.',
    steps: ['gcal.find_free_time', 'gcal.create_event'],
  },
  {
    key: 'answer_support_ticket',
    description: 'Answer a support ticket: read it, look up the requester and reply.',
    steps: ['zendesk.get_ticket', 'zendesk.get_user', 'zendesk.update_ticket'],
  },
  {
    key: 'debug_failed_build',
    description: 'Debug a failed CI build: find the failing run, read its logs and the commit that triggered it.',
    steps: ['github.list_workflow_runs', 'github.get_workflow_run_logs', 'github.get_commit'],
  },
  {
    key: 'rollback_frontend',
    description: 'Roll back a bad frontend deploy to the previous production deployment.',
    steps: ['vercel.list_projects', 'vercel.list_deployments', 'vercel.promote_deployment'],
  },
  {
    key: 'write_postmortem',
    description: 'Write a postmortem from the incident timeline into the docs space.',
    steps: ['pagerduty.get_incident', 'slack.get_channel_history', 'confluence.list_spaces', 'confluence.create_page'],
  },
  {
    key: 'order_problem',
    description: 'Handle a problem with an online order: find the order, check fulfillment and make it right.',
    steps: ['shopify.search_orders', 'shopify.get_order', 'shopify.get_fulfillment', 'shopify.create_discount_code'],
  },
  {
    key: 'dm_teammate',
    description: 'Send a direct message to a teammate you know by email.',
    steps: ['slack.lookup_user_by_email', 'slack.open_dm', 'slack.post_message'],
  },
]
