#!/usr/bin/env node
/**
 * Stop Hook (Session End) - Persist learnings during active sessions
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs on Stop events (after each response). Extracts a meaningful summary
 * from the session transcript (via stdin JSON transcript_path) and updates a
 * session file for cross-session continuity.
 */

const path = require('path');
const fs = require('fs');
const {
  getSessionsDir,
  getDateString,
  getTimeString,
  getSessionIdShort,
  sanitizeSessionId,
  getProjectName,
  ensureDir,
  readFile,
  writeFile,
  runCommand,
  stripAnsi,
  log
} = require('../lib/utils');

const SUMMARY_START_MARKER = '<!-- CT:SUMMARY:START -->';
const SUMMARY_END_MARKER = '<!-- CT:SUMMARY:END -->';
const SESSION_SEPARATOR = '\n---\n';

/**
 * Extract a meaningful summary from the session transcript.
 * Reads the JSONL transcript and pulls out key information:
 * - User messages (tasks requested)
 * - Tools used
 * - Files modified
 */
function isNoiseUserMessage(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  const noisePrefixes = [
    'Your tool call was malformed',
    '## Context Usage',
    'Context Usage',
    '[Request interrupted',
    '<command-name>',
    '<local-command',
    'Caveat:',
    '※ recap:',
  ];
  return noisePrefixes.some(prefix => t.startsWith(prefix));
}

function extractSessionSummary(transcriptPath) {
  const content = readFile(transcriptPath);
  if (!content) return null;

  const lines = content.split('\n').filter(Boolean);
  const userMessages = [];
  const toolsUsed = new Set();
  const filesModified = new Set();
  let parseErrors = 0;
  let aiTitle = '';
  let lastAssistantText = '';
  let recap = '';

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // Collect user messages (first 200 chars each)
      if (entry.type === 'user' || entry.role === 'user' || entry.message?.role === 'user') {
        // Support both direct content and nested message.content (Claude Code JSONL format)
        const rawContent = entry.message?.content ?? entry.content;
        const text = typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent.map(c => (c && c.text) || '').join(' ')
            : '';
        const cleaned = stripAnsi(text).trim();
        if (cleaned && !isNoiseUserMessage(cleaned)) {
          userMessages.push(cleaned.slice(0, 200));
        }
      }

      // Claude Code's auto-generated session title (latest wins)
      if (entry.type === 'ai-title' && entry.aiTitle) {
        aiTitle = String(entry.aiTitle).trim();
      }

      // Claude Code's periodic session recap (away_summary): progress + next
      // step. The richest single field — closest thing to an auto handoff.
      if (entry.type === 'system' && entry.subtype === 'away_summary' && entry.content) {
        recap = String(entry.content).replace(/\s*\(disable recaps in \/config\)\s*$/, '').trim();
      }

      // Collect tool names and modified files (direct tool_use entries)
      if (entry.type === 'tool_use' || entry.tool_name) {
        const toolName = entry.tool_name || entry.name || '';
        if (toolName) toolsUsed.add(toolName);

        const filePath = entry.tool_input?.file_path || entry.input?.file_path || '';
        if (filePath && (toolName === 'Edit' || toolName === 'Write')) {
          filesModified.add(filePath);
        }
      }

      // Extract tool uses from assistant message content blocks (Claude Code JSONL format)
      if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'tool_use') {
            const toolName = block.name || '';
            if (toolName) toolsUsed.add(toolName);

            const filePath = block.input?.file_path || '';
            if (filePath && (toolName === 'Edit' || toolName === 'Write')) {
              filesModified.add(filePath);
            }
          } else if (block.type === 'text' && block.text && block.text.trim()) {
            // Keep the latest non-empty assistant prose as the session outcome
            lastAssistantText = block.text.trim();
          }
        }
      }
    } catch {
      parseErrors++;
    }
  }

  if (parseErrors > 0) {
    log(`[SessionEnd] Skipped ${parseErrors}/${lines.length} unparseable transcript lines`);
  }

  if (userMessages.length === 0) return null;

  return {
    aiTitle,
    recap: recap.replace(/\s+/g, ' ').trim().slice(0, 800),
    conclusion: lastAssistantText.replace(/\s+/g, ' ').trim().slice(0, 600),
    userMessages: userMessages.slice(-10), // Last 10 user messages
    toolsUsed: Array.from(toolsUsed).slice(0, 20),
    filesModified: Array.from(filesModified).slice(0, 30),
    totalMessages: userMessages.length
  };
}

// Read hook input from stdin (Claude Code provides transcript_path via stdin JSON)
const MAX_STDIN = 1024 * 1024;
let stdinData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (stdinData.length < MAX_STDIN) {
    const remaining = MAX_STDIN - stdinData.length;
    stdinData += chunk.substring(0, remaining);
  }
});

process.stdin.on('end', () => {
  runMain();
});

function runMain() {
  main().catch(err => {
    console.error('[SessionEnd] Error:', err.message);
    process.exit(0);
  });
}

function getSessionMetadata() {
  const branchResult = runCommand('git rev-parse --abbrev-ref HEAD');

  return {
    project: getProjectName() || 'unknown',
    branch: branchResult.success ? branchResult.output : 'unknown',
    worktree: process.cwd()
  };
}

function extractHeaderField(header, label) {
  const match = header.match(new RegExp(`\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function buildSessionHeader(today, currentTime, metadata, existingContent = '') {
  const headingMatch = existingContent.match(/^#\s+.+$/m);
  const heading = headingMatch ? headingMatch[0] : `# Session: ${today}`;
  const date = extractHeaderField(existingContent, 'Date') || today;
  const started = extractHeaderField(existingContent, 'Started') || currentTime;

  return [
    heading,
    `**Date:** ${date}`,
    `**Started:** ${started}`,
    `**Last Updated:** ${currentTime}`,
    `**Project:** ${metadata.project}`,
    `**Branch:** ${metadata.branch}`,
    `**Worktree:** ${metadata.worktree}`,
    ''
  ].join('\n');
}

function mergeSessionHeader(content, today, currentTime, metadata) {
  const separatorIndex = content.indexOf(SESSION_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }

  const existingHeader = content.slice(0, separatorIndex);
  const body = content.slice(separatorIndex + SESSION_SEPARATOR.length);
  const nextHeader = buildSessionHeader(today, currentTime, metadata, existingHeader);
  return `${nextHeader}${SESSION_SEPARATOR}${body}`;
}

async function main() {
  // Parse stdin JSON to get transcript_path; fall back to env var on missing,
  // empty, or non-string values as well as on malformed JSON.
  let transcriptPath = null;
  try {
    const input = JSON.parse(stdinData);
    if (input && typeof input.transcript_path === 'string' && input.transcript_path.length > 0) {
      transcriptPath = input.transcript_path;
    }
  } catch {
    // Malformed stdin: fall through to the env-var fallback below.
  }
  if (!transcriptPath) {
    const envTranscriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
    if (typeof envTranscriptPath === 'string' && envTranscriptPath.length > 0) {
      transcriptPath = envTranscriptPath;
    }
  }

  const sessionsDir = getSessionsDir();
  const today = getDateString();
  // Derive shortId from transcript_path UUID when available, using the SAME
  // last-8-chars convention as getSessionIdShort(sessionId.slice(-8)). This keeps
  // backward compatibility for normal sessions (the derived shortId matches what
  // getSessionIdShort() would have produced from the same UUID), while making
  // every session map to a unique filename based on its own transcript UUID.
  //
  // Without this, a parent session and any `claude -p ...` subprocess spawned by
  // another Stop hook share the project-name fallback filename, and the subprocess
  // overwrites the parent's summary. See issue #1494 for full repro details.
  let shortId = null;
  if (transcriptPath) {
    const m = path.basename(transcriptPath).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
    if (m) {
      // Run through sanitizeSessionId() for byte-for-byte parity with
      // getSessionIdShort(sessionId.slice(-8)).
      shortId = sanitizeSessionId(m[1].slice(-8).toLowerCase());
    }
  }
  if (!shortId) { shortId = getSessionIdShort(); }
  const sessionFile = path.join(sessionsDir, `${today}-${shortId}-session.tmp`);
  const sessionMetadata = getSessionMetadata();

  ensureDir(sessionsDir);

  const currentTime = getTimeString();

  // Try to extract summary from transcript
  let summary = null;

  if (transcriptPath) {
    if (fs.existsSync(transcriptPath)) {
      summary = extractSessionSummary(transcriptPath);
    } else {
      log(`[SessionEnd] Transcript not found: ${transcriptPath}`);
    }
  }

  if (fs.existsSync(sessionFile)) {
    const existing = readFile(sessionFile);
    let updatedContent = existing;

    if (existing) {
      const merged = mergeSessionHeader(existing, today, currentTime, sessionMetadata);
      if (merged) {
        updatedContent = merged;
      } else {
        log(`[SessionEnd] Failed to normalize header in ${sessionFile}`);
      }
    }

    // If we have a new summary, update only the generated summary block.
    // This keeps repeated Stop invocations idempotent and preserves
    // user-authored sections in the same session file.
    if (summary && updatedContent) {
      const summaryBlock = buildSummaryBlock(summary);

      if (updatedContent.includes(SUMMARY_START_MARKER) && updatedContent.includes(SUMMARY_END_MARKER)) {
        updatedContent = updatedContent.replace(
          new RegExp(`${escapeRegExp(SUMMARY_START_MARKER)}[\\s\\S]*?${escapeRegExp(SUMMARY_END_MARKER)}`),
          summaryBlock
        );
      } else {
        // Migration path for files created before summary markers existed.
        updatedContent = updatedContent.replace(
          /## (?:Session Summary|Current State)[\s\S]*?$/,
          `${summaryBlock}\n\n### Notes for Next Session\n-\n\n### Context to Load\n\`\`\`\n[relevant files]\n\`\`\`\n`
        );
      }
    }

    if (updatedContent) {
      writeFile(sessionFile, updatedContent);
    }

    log(`[SessionEnd] Updated session file: ${sessionFile}`);
  } else {
    // Create new session file
    const summarySection = summary
      ? `${buildSummaryBlock(summary)}\n\n### Notes for Next Session\n-\n\n### Context to Load\n\`\`\`\n[relevant files]\n\`\`\``
      : `## Current State\n\n[Session context goes here]\n\n### Completed\n- [ ]\n\n### In Progress\n- [ ]\n\n### Notes for Next Session\n-\n\n### Context to Load\n\`\`\`\n[relevant files]\n\`\`\``;

    const template = `${buildSessionHeader(today, currentTime, sessionMetadata)}${SESSION_SEPARATOR}${summarySection}
`;

    writeFile(sessionFile, template);
    log(`[SessionEnd] Created session file: ${sessionFile}`);
  }

  process.exit(0);
}

function buildSummarySection(summary) {
  let section = '## Session Summary\n\n';

  // Topic (Claude Code's auto-generated session title)
  if (summary.aiTitle) {
    section += `**Topic:** ${summary.aiTitle.replace(/\n/g, ' ')}\n\n`;
  }

  // Recap (Claude Code's periodic progress summary — progress + next step)
  if (summary.recap) {
    section += `### Recap\n${summary.recap.replace(/`/g, '\\`')}\n\n`;
  }

  // Tasks (from user messages — collapse newlines and escape backticks to prevent markdown breaks)
  section += '### Tasks\n';
  for (const msg of summary.userMessages) {
    section += `- ${msg.replace(/\n/g, ' ').replace(/`/g, '\\`')}\n`;
  }
  section += '\n';

  // Files modified
  if (summary.filesModified.length > 0) {
    section += '### Files Modified\n';
    for (const f of summary.filesModified) {
      section += `- ${f}\n`;
    }
    section += '\n';
  }

  // Tools used
  if (summary.toolsUsed.length > 0) {
    section += `### Tools Used\n${summary.toolsUsed.join(', ')}\n\n`;
  }

  // Outcome (latest assistant prose — what was actually done/concluded)
  if (summary.conclusion) {
    section += `### Outcome\n${summary.conclusion.replace(/`/g, '\\`')}\n\n`;
  }

  section += `### Stats\n- Total user messages: ${summary.totalMessages}\n`;

  return section;
}

function buildSummaryBlock(summary) {
  return `${SUMMARY_START_MARKER}\n${buildSummarySection(summary).trim()}\n${SUMMARY_END_MARKER}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
