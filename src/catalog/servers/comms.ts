import { server, t } from '../dsl.js'

export const slack = server('slack', 'Slack', 'Channels, messages, threads, users and reactions in a Slack workspace.', [
  t('list_channels', 'List public and private channels the bot can see, with id, name, topic and member count.', ['types Comma separated: public_channel, private_channel, mpim, im', 'exclude_archived:bool Skip archived channels', 'limit:int Max results, default 200', 'cursor Pagination cursor'], { gives: ['slack.channel'], caps: ['find channel'] }),
  t('find_channel', 'Look up a channel id by its name, e.g. #support.', ['name! Channel name with or without #'], { needs: ['text'], gives: ['slack.channel'], caps: ['find channel'] }),
  t('post_message', 'Post a message to a channel or DM. Supports mrkdwn and Block Kit blocks.', ['channel_id! Channel or DM id', 'text! Message text in mrkdwn', 'blocks:arr Optional Block Kit blocks as JSON', 'unfurl_links:bool Unfurl links'], { needs: ['slack.channel', 'text'], gives: ['slack.message'], caps: ['send message', 'notify team', 'post update'] }),
  t('reply_to_thread', 'Reply in a message thread.', ['channel_id! Channel id', 'thread_ts! Timestamp of the parent message', 'text! Reply text', 'reply_broadcast:bool Also send to the channel'], { needs: ['slack.channel', 'slack.message', 'text'], gives: ['slack.message'], caps: ['reply in thread', 'send message'] }),
  t('get_channel_history', 'Fetch recent messages from a channel, newest first.', ['channel_id! Channel id', 'limit:int Max messages', 'oldest Only messages after this ts', 'latest Only messages before this ts'], { needs: ['slack.channel'], gives: ['slack.message', 'slack.user'], caps: ['read messages', 'summarize channel'] }),
  t('get_thread_replies', 'Fetch all replies in a thread.', ['channel_id! Channel id', 'thread_ts! Parent message ts'], { needs: ['slack.channel', 'slack.message'], gives: ['slack.message', 'slack.user'], caps: ['read messages'] }),
  t('search_messages', 'Search messages across the workspace using Slack search modifiers like in:#chan from:@user.', ['query! Search query', 'sort:enum(score|timestamp) Sort order', 'count:int Max results'], { needs: ['query'], gives: ['slack.message', 'slack.channel', 'slack.user'], caps: ['search messages', 'read messages'] }),
  t('add_reaction', 'Add an emoji reaction to a message.', ['channel_id! Channel id', 'timestamp! Message ts', 'name! Emoji name without colons'], { needs: ['slack.channel', 'slack.message'], caps: ['react to message'] }),
  t('list_users', 'List workspace members with id, display name, real name, title and timezone.', ['limit:int Max results', 'cursor Pagination cursor'], { gives: ['slack.user'], caps: ['look up person'] }),
  t('lookup_user_by_email', 'Find a Slack user by email address.', ['email! Email address'], { needs: ['email'], gives: ['slack.user'], caps: ['look up person'] }),
  t('get_user_profile', 'Get a user profile with email, title, phone and status.', ['user_id! User id'], { needs: ['slack.user'], gives: ['email', 'person', 'phone'], caps: ['look up person'] }),
  t('open_dm', 'Open or resume a direct message conversation with one or more users. Returns a channel id to post into.', ['users:arr! User ids'], { needs: ['slack.user'], gives: ['slack.channel'], caps: ['message person', 'send message'] }),
  t('create_channel', 'Create a channel.', ['name! Channel name, lowercase, no spaces', 'is_private:bool Create as private'], { needs: ['title'], gives: ['slack.channel'], caps: ['create channel'] }),
  t('invite_to_channel', 'Invite users to a channel.', ['channel_id! Channel id', 'users:arr! User ids'], { needs: ['slack.channel', 'slack.user'], caps: ['add people to channel'] }),
  t('set_channel_topic', 'Set the topic of a channel.', ['channel_id! Channel id', 'topic! New topic'], { needs: ['slack.channel', 'text'], caps: ['update channel'] }),
  t('upload_file', 'Upload a file or text snippet to channels.', ['channel_id! Channel id', 'filename! File name', 'content! File content as text', 'initial_comment Message to post with it'], { needs: ['slack.channel', 'text'], gives: ['slack.message'], caps: ['share file'] }),
  t('schedule_message', 'Schedule a message to post later.', ['channel_id! Channel id', 'text! Message text', 'post_at:int! Unix time to post'], { needs: ['slack.channel', 'text', 'date'], caps: ['send message later'] }),
])

export const gmail = server('gmail', 'Gmail', 'Read, search, draft and send email in Gmail.', [
  t('search_threads', 'Search mail with Gmail query syntax such as from:, to:, subject:, after:, has:attachment.', ['q! Gmail search query', 'maxResults:int Max threads', 'labelIds:arr Restrict to labels'], { needs: ['query'], gives: ['gmail.thread', 'email'], caps: ['search email', 'read email'] }),
  t('get_thread', 'Get a thread with every message, headers and decoded plain text bodies.', ['threadId! Thread id', 'format:enum(full|metadata|minimal) Response format'], { needs: ['gmail.thread'], gives: ['gmail.message', 'email', 'text'], caps: ['read email'] }),
  t('get_message', 'Get one message with headers, body and attachment metadata.', ['messageId! Message id'], { needs: ['gmail.message'], gives: ['email', 'text', 'gmail.attachment'], caps: ['read email'] }),
  t('send_email', 'Send an email. Supports cc, bcc, html bodies and replying within a thread.', ['to:arr! Recipient addresses', 'subject! Subject line', 'body! Plain text or html body', 'cc:arr Cc addresses', 'bcc:arr Bcc addresses', 'threadId Thread to reply in', 'inReplyTo Message-Id header being replied to'], { needs: ['email', 'text'], gives: ['gmail.message'], caps: ['send email', 'email customer', 'notify person'] }),
  t('create_draft', 'Create a draft without sending it.', ['to:arr! Recipient addresses', 'subject! Subject', 'body! Body', 'threadId Thread to attach the draft to'], { needs: ['email', 'text'], gives: ['gmail.draft'], caps: ['draft email'] }),
  t('send_draft', 'Send an existing draft.', ['draftId! Draft id'], { needs: ['gmail.draft'], gives: ['gmail.message'], caps: ['send email'] }),
  t('list_labels', 'List labels including system labels.', [], { gives: ['gmail.label'], caps: ['organize email'] }),
  t('modify_thread_labels', 'Add or remove labels on a thread, e.g. archive by removing INBOX.', ['threadId! Thread id', 'addLabelIds:arr Labels to add', 'removeLabelIds:arr Labels to remove'], { needs: ['gmail.thread', 'gmail.label'], caps: ['organize email', 'archive email'] }),
  t('get_attachment', 'Download an attachment as base64.', ['messageId! Message id', 'attachmentId! Attachment id'], { needs: ['gmail.message', 'gmail.attachment'], gives: ['text'], caps: ['read attachment'] }),
  t('create_filter', 'Create a filter that labels, archives or forwards matching mail.', ['criteria:obj! Match criteria such as from or query', 'action:obj! Actions such as addLabelIds'], { needs: ['query'], caps: ['organize email'] }),
])

export const gcal = server('gcal', 'Google Calendar', 'Events, availability and calendars in Google Calendar.', [
  t('list_calendars', 'List calendars on the account with ids, names and access roles.', [], { gives: ['gcal.calendar'], caps: ['list calendars'] }),
  t('list_events', 'List events in a time range, expanding recurring events.', ['calendarId Calendar id, default primary', 'timeMin:date! Range start', 'timeMax:date! Range end', 'q Free text filter', 'maxResults:int Max events'], { needs: ['date'], gives: ['gcal.event', 'email'], caps: ['check schedule', 'list meetings'] }),
  t('get_event', 'Get an event with attendees, conference link, description and recurrence.', ['calendarId Calendar id', 'eventId! Event id'], { needs: ['gcal.event'], gives: ['email', 'url'], caps: ['read meeting'] }),
  t('create_event', 'Create an event and optionally invite attendees and add a Meet link.', ['calendarId Calendar id', 'summary! Title', 'start:date! Start time', 'end:date! End time', 'attendees:arr Attendee emails', 'description Description', 'location Location', 'addMeet:bool Add a Google Meet link'], { needs: ['date', 'title', 'email'], gives: ['gcal.event'], caps: ['schedule meeting', 'book time'] }),
  t('update_event', 'Update an existing event: time, attendees, title or description.', ['calendarId Calendar id', 'eventId! Event id', 'summary New title', 'start:date New start', 'end:date New end', 'attendees:arr Replace attendees'], { needs: ['gcal.event'], caps: ['reschedule meeting'] }),
  t('delete_event', 'Cancel an event and notify attendees.', ['calendarId Calendar id', 'eventId! Event id', 'sendUpdates:enum(all|externalOnly|none) Who to notify'], { needs: ['gcal.event'], caps: ['cancel meeting'] }),
  t('find_free_time', 'Query free/busy for a set of people and return open slots of a given length.', ['attendees:arr! Emails to check', 'timeMin:date! Window start', 'timeMax:date! Window end', 'durationMinutes:int! Slot length'], { needs: ['email', 'date'], gives: ['date'], caps: ['find meeting time', 'schedule meeting'] }),
  t('respond_to_event', 'Accept, decline or tentatively accept an invitation.', ['eventId! Event id', 'response:enum(accepted|declined|tentative)! Response'], { needs: ['gcal.event'], caps: ['rsvp'] }),
])

export const twilio = server('twilio', 'Twilio', 'SMS, voice calls and phone numbers through Twilio.', [
  t('send_sms', 'Send an SMS or MMS from one of your Twilio numbers.', ['to! Destination number in E.164', 'from! Your Twilio number', 'body! Message text', 'mediaUrl:arr Media urls for MMS'], { needs: ['phone', 'twilio.number', 'text'], gives: ['twilio.message'], caps: ['send sms', 'notify person'] }),
  t('list_messages', 'List sent and received messages filtered by number and date.', ['to Filter by recipient', 'from Filter by sender', 'dateSent:date Filter by date', 'pageSize:int Max results'], { gives: ['twilio.message', 'phone'], caps: ['read sms'] }),
  t('get_message', 'Get delivery status, price and error code for a message.', ['sid! Message sid'], { needs: ['twilio.message'], caps: ['check delivery'] }),
  t('make_call', 'Start an outbound call that plays a message or runs TwiML.', ['to! Number to call', 'from! Your Twilio number', 'twiml! TwiML instructions, e.g. <Say>', 'record:bool Record the call'], { needs: ['phone', 'twilio.number', 'text'], gives: ['twilio.call'], caps: ['call person'] }),
  t('list_phone_numbers', 'List phone numbers owned by the account with capabilities.', [], { gives: ['twilio.number'], caps: ['list phone numbers'] }),
  t('lookup_number', 'Validate a phone number and return carrier and line type.', ['phoneNumber! Number to look up'], { needs: ['phone'], caps: ['validate phone'] }),
])

export const zendesk = server('zendesk', 'Zendesk', 'Support tickets, requesters, organizations and macros in Zendesk.', [
  t('search', 'Search tickets, users and organizations with Zendesk search syntax, e.g. "type:ticket status:open requester:jane@acme.com".', ['query! Search query', 'sort_by:enum(updated_at|created_at|priority|status) Sort field', 'per_page:int Max results'], { needs: ['query'], gives: ['zendesk.ticket', 'zendesk.user'], caps: ['search tickets', 'find support ticket'] }),
  t('get_ticket', 'Get a ticket with subject, description, status, priority, requester, assignee and tags.', ['ticket_id:int! Ticket id'], { needs: ['zendesk.ticket'], gives: ['zendesk.user', 'zendesk.organization'], caps: ['read ticket'] }),
  t('list_ticket_comments', 'List public replies and internal notes on a ticket.', ['ticket_id:int! Ticket id'], { needs: ['zendesk.ticket'], gives: ['text', 'zendesk.user'], caps: ['read ticket'] }),
  t('create_ticket', 'Create a ticket on behalf of a requester.', ['subject! Subject', 'comment! First comment body', 'requester_email Requester email', 'priority:enum(low|normal|high|urgent) Priority', 'tags:arr Tags'], { needs: ['title', 'text'], gives: ['zendesk.ticket'], caps: ['create ticket'] }),
  t('update_ticket', 'Update status, priority, assignee or tags, and optionally add a reply or internal note.', ['ticket_id:int! Ticket id', 'status:enum(new|open|pending|hold|solved|closed) Status', 'priority:enum(low|normal|high|urgent) Priority', 'assignee_id:int Agent id', 'comment Reply or note body', 'public:bool Public reply instead of internal note', 'tags:arr Replace tags'], { needs: ['zendesk.ticket'], caps: ['reply to customer', 'update ticket', 'close ticket'] }),
  t('get_user', 'Get a Zendesk user with name, email, phone, organization and role.', ['user_id:int! User id'], { needs: ['zendesk.user'], gives: ['email', 'phone', 'person', 'zendesk.organization'], caps: ['look up customer', 'look up person'] }),
  t('search_users', 'Find users by name, email or external id.', ['query! Name or email'], { needs: ['query'], gives: ['zendesk.user'], caps: ['look up customer'] }),
  t('get_organization', 'Get an organization with domain names, notes and custom fields.', ['organization_id:int! Organization id'], { needs: ['zendesk.organization'], gives: ['text'], caps: ['look up account'] }),
  t('list_macros', 'List macros that agents can apply to tickets.', ['active:bool Only active macros'], { gives: ['zendesk.macro'], caps: ['canned response'] }),
  t('apply_macro', 'Apply a macro to a ticket and return the resulting changes.', ['ticket_id:int! Ticket id', 'macro_id:int! Macro id'], { needs: ['zendesk.ticket', 'zendesk.macro'], caps: ['canned response', 'reply to customer'] }),
])

export const intercom = server('intercom', 'Intercom', 'Conversations and contacts in Intercom.', [
  t('search_conversations', 'Search conversations by state, assignee, contact or text.', ['query! Search text or filter expression', 'state:enum(open|closed|snoozed) State'], { needs: ['query'], gives: ['intercom.conversation'], caps: ['search tickets', 'read chat'] }),
  t('get_conversation', 'Get a conversation with all parts, the contact and assignee.', ['conversation_id! Conversation id'], { needs: ['intercom.conversation'], gives: ['intercom.contact', 'text'], caps: ['read chat'] }),
  t('reply_to_conversation', 'Reply to a conversation as an admin, or add a note.', ['conversation_id! Conversation id', 'body! Reply body', 'message_type:enum(comment|note) Public reply or internal note'], { needs: ['intercom.conversation', 'text'], caps: ['reply to customer'] }),
  t('close_conversation', 'Close a conversation.', ['conversation_id! Conversation id'], { needs: ['intercom.conversation'], caps: ['close ticket'] }),
  t('search_contacts', 'Find contacts by email, name or custom attribute.', ['query! Email or name'], { needs: ['query'], gives: ['intercom.contact'], caps: ['look up customer'] }),
  t('get_contact', 'Get a contact with email, company, plan and last seen.', ['contact_id! Contact id'], { needs: ['intercom.contact'], gives: ['email', 'person'], caps: ['look up customer'] }),
])

export const comms = [slack, gmail, gcal, twilio, zendesk, intercom]
