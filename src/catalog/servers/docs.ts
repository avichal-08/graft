import { server, t } from '../dsl.js'

export const notion = server('notion', 'Notion', 'Pages, databases and blocks in a Notion workspace.', [
  t('search', 'Search pages and databases the integration can access, by title.', ['query! Title text', 'filter:enum(page|database) Object type', 'page_size:int Max results'], { needs: ['query'], gives: ['notion.page', 'notion.database'], caps: ['search docs', 'find page'] }),
  t('get_page', 'Get a page with its properties.', ['page_id! Page id'], { needs: ['notion.page'], gives: ['notion.user', 'url'], caps: ['read doc'] }),
  t('get_page_content', 'Get the blocks of a page rendered as markdown.', ['page_id! Page id', 'depth:int Nested block depth'], { needs: ['notion.page'], gives: ['text'], caps: ['read doc'] }),
  t('create_page', 'Create a page under a parent page or as a database row, with markdown content.', ['parent_id! Parent page or database id', 'title! Page title', 'content Markdown body', 'properties:obj Database properties when parent is a database'], { needs: ['notion.page', 'title', 'text'], gives: ['notion.page'], caps: ['write doc', 'create page'] }),
  t('append_blocks', 'Append markdown content to the end of a page.', ['page_id! Page id', 'content! Markdown to append'], { needs: ['notion.page', 'text'], caps: ['update doc', 'write doc'] }),
  t('update_page_properties', 'Update properties on a page or database row.', ['page_id! Page id', 'properties:obj! Property values'], { needs: ['notion.page'], caps: ['update doc'] }),
  t('query_database', 'Query a database with filters and sorts.', ['database_id! Database id', 'filter:obj Notion filter object', 'sorts:arr Sorts', 'page_size:int Max rows'], { needs: ['notion.database'], gives: ['notion.page'], caps: ['query tracker', 'search docs'] }),
  t('get_database', 'Get a database schema with property names and types.', ['database_id! Database id'], { needs: ['notion.database'], gives: ['text'], caps: ['query tracker'] }),
  t('add_comment', 'Comment on a page.', ['page_id! Page id', 'text! Comment text'], { needs: ['notion.page', 'text'], caps: ['comment on doc'] }),
  t('list_users', 'List workspace members.', [], { gives: ['notion.user', 'email'], caps: ['look up person'] }),
])

export const gdrive = server('gdrive', 'Google Drive', 'Files, folders, Docs and Sheets in Google Drive.', [
  t('search_files', 'Search Drive with query syntax, e.g. name contains \'roadmap\' and mimeType = \'application/vnd.google-apps.document\'.', ['q! Drive query', 'pageSize:int Max results', 'orderBy Sort, e.g. modifiedTime desc'], { needs: ['query'], gives: ['gdrive.file'], caps: ['search docs', 'find file'] }),
  t('get_file', 'Get file metadata: name, owner, mime type, link and last modifier.', ['fileId! File id'], { needs: ['gdrive.file'], gives: ['email', 'url', 'gdrive.folder'], caps: ['find file'] }),
  t('read_file', 'Export a file as text: Docs as markdown, Sheets as CSV, Slides as plain text, PDFs extracted.', ['fileId! File id'], { needs: ['gdrive.file'], gives: ['text'], caps: ['read doc', 'read file'] }),
  t('create_doc', 'Create a Google Doc from markdown in a folder.', ['title! Document title', 'content! Markdown body', 'folderId Parent folder id'], { needs: ['title', 'text'], gives: ['gdrive.file'], caps: ['write doc'] }),
  t('update_doc', 'Replace or append text in a Google Doc.', ['fileId! File id', 'content! Markdown', 'mode:enum(append|replace) Write mode'], { needs: ['gdrive.file', 'text'], caps: ['update doc'] }),
  t('read_sheet', 'Read a range from a Google Sheet as rows.', ['spreadsheetId! Spreadsheet id', 'range! A1 range, e.g. Sheet1!A1:F200'], { needs: ['gdrive.file'], gives: ['text', 'number'], caps: ['read spreadsheet', 'analytics'] }),
  t('append_sheet_rows', 'Append rows to a sheet.', ['spreadsheetId! Spreadsheet id', 'range! Target range', 'values:arr! Rows as JSON arrays'], { needs: ['gdrive.file'], caps: ['update spreadsheet', 'log activity'] }),
  t('list_folder', 'List files in a folder.', ['folderId! Folder id'], { needs: ['gdrive.folder'], gives: ['gdrive.file'], caps: ['list files'] }),
  t('share_file', 'Share a file with a user, group or domain.', ['fileId! File id', 'email! Email to share with', 'role:enum(reader|commenter|writer)! Access role', 'notify:bool Send a notification email'], { needs: ['gdrive.file', 'email'], caps: ['share file'] }),
  t('move_file', 'Move a file into a folder.', ['fileId! File id', 'folderId! Destination folder id'], { needs: ['gdrive.file', 'gdrive.folder'], caps: ['organize files'] }),
])

export const confluence = server('confluence', 'Confluence', 'Spaces and pages in Confluence.', [
  t('search', 'Search pages with CQL, e.g. space = ENG and text ~ "runbook".', ['cql! CQL query', 'limit:int Max results'], { needs: ['query'], gives: ['confluence.page'], caps: ['search docs', 'find runbook'] }),
  t('get_page', 'Get a page body as markdown with version and author.', ['pageId! Page id'], { needs: ['confluence.page'], gives: ['text', 'url'], caps: ['read doc', 'find runbook'] }),
  t('create_page', 'Create a page in a space, optionally under a parent.', ['spaceKey! Space key', 'title! Title', 'body! Markdown body', 'parentId Parent page id'], { needs: ['confluence.space', 'title', 'text'], gives: ['confluence.page'], caps: ['write doc', 'write postmortem'] }),
  t('update_page', 'Update a page body; the current version number is required.', ['pageId! Page id', 'title! Title', 'body! New body', 'version:int! Current version number'], { needs: ['confluence.page', 'text'], caps: ['update doc'] }),
  t('list_spaces', 'List spaces with keys and descriptions.', [], { gives: ['confluence.space'], caps: ['search docs'] }),
  t('get_page_children', 'List child pages.', ['pageId! Page id'], { needs: ['confluence.page'], gives: ['confluence.page'], caps: ['read doc'] }),
  t('add_label', 'Add labels to a page.', ['pageId! Page id', 'labels:arr! Labels'], { needs: ['confluence.page'], caps: ['organize docs'] }),
])

export const filesystem = server('filesystem', 'Filesystem', 'Read and write files inside the allowed project directories.', [
  t('read_text_file', 'Read a text file. Use head or tail to read only the first or last lines.', ['path! File path', 'head:int First N lines', 'tail:int Last N lines'], { needs: ['path'], gives: ['text', 'code'], caps: ['read file', 'read code'] }),
  t('read_multiple_files', 'Read several files at once. Failed reads are reported per file.', ['paths:arr! File paths'], { needs: ['path'], gives: ['text', 'code'], caps: ['read file'] }),
  t('write_file', 'Create or overwrite a file.', ['path! File path', 'content! File content'], { needs: ['path', 'text'], caps: ['write file', 'edit code'] }),
  t('edit_file', 'Apply line based edits to a file and return a git style diff. Supports dry runs.', ['path! File path', 'edits:arr! Edits as JSON with oldText and newText', 'dryRun:bool Preview without writing'], { needs: ['path', 'code'], caps: ['edit code'] }),
  t('create_directory', 'Create a directory, including parents.', ['path! Directory path'], { needs: ['path'], caps: ['organize files'] }),
  t('list_directory', 'List files and directories in a path, marked [FILE] or [DIR].', ['path! Directory path'], { needs: ['path'], gives: ['path'], caps: ['list files'] }),
  t('directory_tree', 'Recursive JSON tree of a directory.', ['path! Root path', 'excludePatterns:arr Glob patterns to skip'], { needs: ['path'], gives: ['path'], caps: ['list files', 'explore codebase'] }),
  t('move_file', 'Move or rename a file or directory.', ['source! Source path', 'destination! Destination path'], { needs: ['path'], caps: ['organize files'] }),
  t('search_files', 'Recursively find files whose names match a glob pattern.', ['path! Root path', 'pattern! Glob, e.g. **/*.test.ts', 'excludePatterns:arr Globs to skip'], { needs: ['path', 'query'], gives: ['path'], caps: ['find file', 'search code'] }),
  t('get_file_info', 'Get size, timestamps and permissions of a file.', ['path! File path'], { needs: ['path'], caps: ['find file'] }),
])

export const web = server('web', 'Web', 'Search the web and fetch pages.', [
  t('search', 'Search the web and return titles, urls and snippets.', ['query! Search query', 'count:int Max results', 'freshness:enum(day|week|month|year) Recency filter'], { needs: ['query'], gives: ['url', 'text'], caps: ['web search', 'research'] }),
  t('fetch', 'Fetch a url and return the main content as markdown.', ['url! Page url', 'max_length:int Max characters', 'start_index:int Offset for long pages'], { needs: ['url'], gives: ['text'], caps: ['read webpage', 'research'] }),
  t('screenshot', 'Render a page in a headless browser and return a screenshot.', ['url! Page url', 'fullPage:bool Capture the full page', 'width:int Viewport width'], { needs: ['url'], caps: ['check website'] }),
  t('check_status', 'Request a url and report status code, latency and tls expiry.', ['url! Url to check'], { needs: ['url'], gives: ['number'], caps: ['check website', 'uptime check'] }),
])

export const docs = [notion, gdrive, confluence, filesystem, web]
