import { fileURLToPath } from 'node:url';
import { main } from '../claude-hud/dist/index.js';

const transcriptPath = fileURLToPath(new URL('./statusline-sample.jsonl', import.meta.url));
const makeInput = (outputTokens) => ({
  cwd: 'E:/Work/test',
  transcript_path: transcriptPath,
  model: { display_name: 'gpt-5.5[1m]' },
  context_window: {
    used_percentage: 7,
    context_window_size: 200000,
    current_usage: {
      input_tokens: 12000,
      output_tokens: outputTokens,
      cache_creation_input_tokens: 1000,
      cache_read_input_tokens: 9000
    }
  },
  rate_limits: {
    five_hour: { used_percentage: 42, resets_at: Math.floor(Date.now() / 1000) + 7200 },
    seven_day: { used_percentage: 83, resets_at: Math.floor(Date.now() / 1000) + 345600 }
  }
});

const gitStatus = {
  branch: 'main',
  isDirty: true,
  ahead: 2,
  behind: 1,
  fileStats: {
    modified: 3,
    added: 1,
    deleted: 1,
    untracked: 4,
    trackedFiles: []
  }
};

await main({
  readStdin: async () => makeInput(1000),
  getGitStatus: async () => gitStatus,
  log: () => {}
});

await new Promise((resolve) => setTimeout(resolve, 700));

await main({
  readStdin: async () => makeInput(2200),
  getGitStatus: async () => gitStatus
});
