import { fileURLToPath } from 'node:url';
import { main } from '../claude-hud/dist/index.js';

const transcriptPath = fileURLToPath(new URL('./statusline-sample.jsonl', import.meta.url));

await main({
  readStdin: async () => ({
    cwd: 'E:/Work/test',
    transcript_path: transcriptPath,
    model: { display_name: 'gpt-5.5[1m]' },
    context_window: {
      used_percentage: 12,
      context_window_size: 200000,
      current_usage: {
        input_tokens: 20000,
        output_tokens: 3000,
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 15000
      }
    }
  }),
  getGitStatus: async () => null
});
