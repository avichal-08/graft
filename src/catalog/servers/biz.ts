import { server, t } from '../dsl.js'

const lim = ['limit:int Max objects to return, 1 to 100', 'starting_after Cursor for pagination']

export const stripe = server('stripe', 'Stripe', 'Customers, payments, refunds, subscriptions and invoices in Stripe.', [
  t('search_customers', 'Search customers with Stripe search query syntax, e.g. email:"jane@acme.com" or name~"acme".', ['query! Search query', ...lim], { needs: ['email'], gives: ['stripe.customer'], caps: ['look up customer', 'find billing account'] }),
  t('get_customer', 'Retrieve a customer with email, name, default payment method, balance and metadata.', ['customer! Customer id, cus_...'], { needs: ['stripe.customer'], gives: ['email', 'person'], caps: ['look up customer'] }),
  t('create_customer', 'Create a customer.', ['email! Email', 'name Full name', 'description Internal description', 'metadata:obj Key value metadata'], { needs: ['email'], gives: ['stripe.customer'], caps: ['create customer'] }),
  t('update_customer', 'Update a customer email, name, address or metadata.', ['customer! Customer id', 'email New email', 'name New name', 'metadata:obj Metadata to merge'], { needs: ['stripe.customer'], caps: ['update customer'] }),
  t('list_charges', 'List charges, optionally for one customer, newest first, with amount, status and refunded flag.', ['customer Customer id', 'created:obj Range filter on creation time', ...lim], { needs: ['stripe.customer'], gives: ['stripe.charge'], caps: ['payment history', 'find payment'] }),
  t('get_charge', 'Retrieve a charge with amount, currency, card details, outcome and dispute status.', ['charge! Charge id, ch_...'], { needs: ['stripe.charge'], gives: ['stripe.customer', 'stripe.payment_intent'], caps: ['find payment'] }),
  t('list_payment_intents', 'List payment intents for a customer with status and amount.', ['customer Customer id', ...lim], { needs: ['stripe.customer'], gives: ['stripe.payment_intent'], caps: ['payment history'] }),
  t('get_payment_intent', 'Retrieve a payment intent with its latest charge and last payment error.', ['payment_intent! Payment intent id, pi_...'], { needs: ['stripe.payment_intent'], gives: ['stripe.charge'], caps: ['find payment', 'debug failed payment'] }),
  t('create_refund', 'Refund a charge or payment intent, fully or partially. Funds return to the original payment method.', ['charge Charge id to refund', 'payment_intent Payment intent id to refund', 'amount:int Amount in the smallest currency unit; defaults to the full amount', 'reason:enum(duplicate|fraudulent|requested_by_customer) Reason'], { needs: ['stripe.charge'], gives: ['stripe.refund'], caps: ['refund payment', 'issue refund'] }),
  t('list_refunds', 'List refunds, optionally for one charge.', ['charge Charge id', ...lim], { gives: ['stripe.refund'], caps: ['refund status'] }),
  t('list_subscriptions', 'List subscriptions for a customer with status, plan and current period.', ['customer Customer id', 'status:enum(active|past_due|canceled|trialing|all) Status', ...lim], { needs: ['stripe.customer'], gives: ['stripe.subscription', 'stripe.price'], caps: ['subscription status', 'find billing account'] }),
  t('update_subscription', 'Change a subscription price, quantity, trial end or proration behavior.', ['subscription! Subscription id, sub_...', 'items:arr Items as JSON with price and quantity', 'proration_behavior:enum(create_prorations|none|always_invoice) Proration', 'trial_end Unix time or "now"'], { needs: ['stripe.subscription', 'stripe.price'], caps: ['change plan', 'upgrade subscription'] }),
  t('cancel_subscription', 'Cancel a subscription now or at period end.', ['subscription! Subscription id', 'at_period_end:bool Cancel at period end instead of now', 'cancellation_details:obj Reason and feedback'], { needs: ['stripe.subscription'], caps: ['cancel subscription', 'churn customer'] }),
  t('list_invoices', 'List invoices for a customer or subscription.', ['customer Customer id', 'subscription Subscription id', 'status:enum(draft|open|paid|uncollectible|void) Status', ...lim], { needs: ['stripe.customer'], gives: ['stripe.invoice'], caps: ['billing history', 'find invoice'] }),
  t('get_invoice', 'Retrieve an invoice with lines, totals, hosted url and payment status.', ['invoice! Invoice id, in_...'], { needs: ['stripe.invoice'], gives: ['url', 'stripe.charge'], caps: ['find invoice'] }),
  t('send_invoice', 'Email an open invoice to the customer.', ['invoice! Invoice id'], { needs: ['stripe.invoice'], caps: ['send invoice'] }),
  t('void_invoice', 'Void an open invoice.', ['invoice! Invoice id'], { needs: ['stripe.invoice'], caps: ['void invoice'] }),
  t('create_credit_note', 'Issue a credit note against a paid invoice.', ['invoice! Invoice id', 'amount:int Credit amount', 'reason:enum(duplicate|fraudulent|order_change|product_unsatisfactory) Reason', 'memo Note shown to the customer'], { needs: ['stripe.invoice'], caps: ['issue credit', 'issue refund'] }),
  t('list_products', 'List products with active state and default price.', ['active:bool Only active products', ...lim], { gives: ['stripe.product', 'stripe.price'], caps: ['list plans'] }),
  t('list_prices', 'List prices for a product with amount, interval and currency.', ['product Product id', 'active:bool Only active prices', ...lim], { needs: ['stripe.product'], gives: ['stripe.price'], caps: ['list plans'] }),
  t('create_payment_link', 'Create a shareable checkout link for one or more prices.', ['line_items:arr! Items as JSON with price and quantity', 'after_completion_url Redirect url after payment'], { needs: ['stripe.price'], gives: ['url'], caps: ['collect payment', 'create checkout link'] }),
  t('list_disputes', 'List disputes with reason, status and evidence due date.', ['charge Charge id', ...lim], { gives: ['stripe.dispute', 'stripe.charge'], caps: ['chargebacks'] }),
  t('update_dispute', 'Submit evidence for a dispute.', ['dispute! Dispute id', 'evidence:obj! Evidence fields', 'submit:bool Submit now'], { needs: ['stripe.dispute', 'text'], caps: ['chargebacks'] }),
  t('get_balance', 'Get the available and pending account balance by currency.', [], { caps: ['account balance'] }),
])

export const hubspot = server('hubspot', 'HubSpot', 'CRM contacts, companies, deals and tickets in HubSpot.', [
  t('search_contacts', 'Search contacts by email, name, company or any property with filter groups.', ['query! Free text or email', 'properties:arr Properties to return', 'limit:int Max results'], { needs: ['query'], gives: ['hubspot.contact'], caps: ['look up customer', 'find lead'] }),
  t('get_contact', 'Get a contact with properties such as email, phone, lifecycle stage and owner.', ['contactId! Contact id', 'properties:arr Properties to return', 'associations:arr Associated object types to include, e.g. companies, deals'], { needs: ['hubspot.contact'], gives: ['email', 'phone', 'person', 'hubspot.company', 'hubspot.deal', 'hubspot.owner'], caps: ['look up customer'] }),
  t('create_contact', 'Create a contact.', ['email! Email', 'firstname First name', 'lastname Last name', 'company Company name', 'phone Phone'], { needs: ['email'], gives: ['hubspot.contact'], caps: ['create lead', 'add contact'] }),
  t('update_contact', 'Update contact properties.', ['contactId! Contact id', 'properties:obj! Properties to set'], { needs: ['hubspot.contact'], caps: ['update crm'] }),
  t('search_companies', 'Search companies by name or domain.', ['query! Name or domain', 'limit:int Max results'], { needs: ['query'], gives: ['hubspot.company'], caps: ['look up account'] }),
  t('get_company', 'Get a company with domain, industry, size, owner and associated contacts and deals.', ['companyId! Company id', 'associations:arr Associated types'], { needs: ['hubspot.company'], gives: ['hubspot.contact', 'hubspot.deal', 'hubspot.owner'], caps: ['look up account'] }),
  t('search_deals', 'Search deals by name, stage, owner or close date.', ['query Free text', 'dealstage Pipeline stage id', 'ownerId Owner id', 'limit:int Max results'], { gives: ['hubspot.deal'], caps: ['pipeline review', 'find deal'] }),
  t('get_deal', 'Get a deal with amount, stage, close date, owner and associated contacts and company.', ['dealId! Deal id'], { needs: ['hubspot.deal'], gives: ['hubspot.contact', 'hubspot.company', 'hubspot.owner'], caps: ['find deal'] }),
  t('create_deal', 'Create a deal and associate it with contacts or a company.', ['dealname! Deal name', 'pipeline Pipeline id', 'dealstage! Stage id', 'amount:num Amount', 'closedate:date Expected close', 'associations:arr Object ids to associate'], { needs: ['title'], gives: ['hubspot.deal'], caps: ['create deal'] }),
  t('update_deal', 'Move a deal to a new stage or update its amount, owner or close date.', ['dealId! Deal id', 'properties:obj! Properties to set'], { needs: ['hubspot.deal'], caps: ['update crm', 'move deal stage'] }),
  t('create_note', 'Log a note on a contact, company or deal timeline.', ['body! Note text', 'associations:arr! Object ids to attach to'], { needs: ['text'], caps: ['log activity', 'update crm'] }),
  t('create_task', 'Create a follow up task for an owner.', ['title! Task title', 'body Details', 'dueDate:date Due date', 'ownerId Owner id', 'associations:arr Object ids'], { needs: ['title'], caps: ['create follow up'] }),
  t('list_owners', 'List CRM owners (sales reps) with email and teams.', [], { gives: ['hubspot.owner', 'email'], caps: ['find account owner'] }),
  t('create_ticket', 'Create a support ticket in HubSpot.', ['subject! Subject', 'content Description', 'hs_pipeline_stage! Stage id', 'associations:arr Object ids'], { needs: ['title', 'text'], gives: ['hubspot.ticket'], caps: ['create ticket'] }),
  t('enroll_in_sequence', 'Enroll a contact in an email sequence.', ['contactId! Contact id', 'sequenceId! Sequence id', 'senderEmail! Sender inbox'], { needs: ['hubspot.contact', 'email'], caps: ['start outreach'] }),
])

export const shopify = server('shopify', 'Shopify', 'Orders, products, customers and fulfillments in a Shopify store.', [
  t('search_orders', 'Search orders by name (#1001), email, financial or fulfillment status.', ['query! Search, e.g. "email:jane@acme.com financial_status:paid"', 'first:int Max results'], { needs: ['query'], gives: ['shopify.order'], caps: ['find order'] }),
  t('get_order', 'Get an order with line items, totals, shipping address, customer and fulfillment status.', ['id! Order id'], { needs: ['shopify.order'], gives: ['shopify.customer', 'shopify.product', 'email'], caps: ['find order', 'order status'] }),
  t('refund_order', 'Refund some or all line items and shipping on an order.', ['orderId! Order id', 'lineItems:arr Line item ids and quantities as JSON', 'shipping:bool Refund shipping', 'notify:bool Email the customer', 'note Reason'], { needs: ['shopify.order'], caps: ['refund payment', 'issue refund', 'refund order'] }),
  t('cancel_order', 'Cancel an order, optionally restocking and refunding.', ['orderId! Order id', 'reason:enum(customer|fraud|inventory|declined|other) Reason', 'restock:bool Restock items', 'refund:bool Refund payment'], { needs: ['shopify.order'], caps: ['cancel order'] }),
  t('create_fulfillment', 'Mark items as fulfilled with tracking details.', ['orderId! Order id', 'trackingNumber Tracking number', 'trackingCompany Carrier', 'notifyCustomer:bool Send shipping email'], { needs: ['shopify.order'], gives: ['shopify.fulfillment'], caps: ['ship order'] }),
  t('get_fulfillment', 'Get tracking info and delivery status of a fulfillment.', ['id! Fulfillment id'], { needs: ['shopify.fulfillment'], gives: ['url'], caps: ['track shipment', 'order status'] }),
  t('search_customers', 'Search customers by email, name or tag.', ['query! Email or name', 'first:int Max results'], { needs: ['query'], gives: ['shopify.customer'], caps: ['look up customer'] }),
  t('get_customer', 'Get a customer with email, phone, order count, lifetime spend and tags.', ['id! Customer id'], { needs: ['shopify.customer'], gives: ['email', 'phone', 'person', 'shopify.order'], caps: ['look up customer'] }),
  t('list_products', 'List products with variants, inventory and status.', ['query Title or sku filter', 'first:int Max results'], { gives: ['shopify.product'], caps: ['list products', 'check inventory'] }),
  t('update_inventory', 'Adjust available inventory for a variant at a location.', ['inventoryItemId! Inventory item id', 'locationId! Location id', 'delta:int! Quantity change'], { needs: ['shopify.product'], caps: ['update inventory'] }),
  t('create_discount_code', 'Create a discount code for a percentage or fixed amount.', ['code! Code customers enter', 'value:num! Discount value', 'valueType:enum(percentage|fixed_amount)! Type', 'endsAt:date Expiry', 'usageLimit:int Max uses'], { needs: ['amount'], gives: ['shopify.discount'], caps: ['create coupon', 'make it right for customer'] }),
])

export const salesforce = server('salesforce', 'Salesforce', 'Accounts, opportunities, leads and cases in Salesforce.', [
  t('soql_query', 'Run a SOQL query and return records.', ['query! SOQL, e.g. SELECT Id, Name FROM Account WHERE Name LIKE \'Acme%\''], { needs: ['sql'], gives: ['salesforce.account', 'salesforce.opportunity', 'salesforce.contact'], caps: ['query crm'] }),
  t('get_account', 'Get an account with owner, industry, ARR and related contacts.', ['id! Account id'], { needs: ['salesforce.account'], gives: ['salesforce.contact', 'salesforce.user'], caps: ['look up account'] }),
  t('get_opportunity', 'Get an opportunity with stage, amount, close date and account.', ['id! Opportunity id'], { needs: ['salesforce.opportunity'], gives: ['salesforce.account', 'salesforce.user'], caps: ['find deal'] }),
  t('update_opportunity', 'Update stage, amount, close date or next step on an opportunity.', ['id! Opportunity id', 'fields:obj! Field values'], { needs: ['salesforce.opportunity'], caps: ['update crm', 'move deal stage'] }),
  t('create_lead', 'Create a lead.', ['LastName! Last name', 'Company! Company', 'Email Email', 'Phone Phone', 'LeadSource Source'], { needs: ['email'], gives: ['salesforce.lead'], caps: ['create lead'] }),
  t('create_case', 'Open a support case on an account or contact.', ['Subject! Subject', 'Description Description', 'AccountId Account id', 'ContactId Contact id', 'Priority:enum(Low|Medium|High) Priority'], { needs: ['title', 'text'], gives: ['salesforce.case'], caps: ['create ticket'] }),
  t('get_contact', 'Get a contact with email, phone, title and account.', ['id! Contact id'], { needs: ['salesforce.contact'], gives: ['email', 'phone', 'person'], caps: ['look up customer'] }),
  t('log_activity', 'Log a call, email or meeting as a task on a record.', ['WhatId! Related record id', 'Subject! Subject', 'Description Notes', 'ActivityDate:date Date'], { needs: ['text'], caps: ['log activity'] }),
])

export const biz = [stripe, hubspot, shopify, salesforce]
