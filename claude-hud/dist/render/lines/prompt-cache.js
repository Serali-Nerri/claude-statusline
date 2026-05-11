import { getContextColor, RESET, label, warning as warningColor } from '../colors.js';
import { t } from '../../i18n/index.js';
function getPromptCacheWarningSeconds(ttlSeconds) {
    return Math.min(ttlSeconds, Math.max(60, Math.floor(ttlSeconds / 5)));
}
function colorPromptCacheValue(value, state, ctx) {
    if (state === 'expired') {
        return label(value, ctx.config?.colors);
    }
    if (state === 'warning') {
        return warningColor(value, ctx.config?.colors);
    }
    return `${getContextColor(0, ctx.config?.colors)}${value}${RESET}`;
}
export function formatPromptCacheCountdown(remainingMs) {
    if (remainingMs <= 0) {
        return t('status.expired');
    }
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
}
export function renderPromptCacheLine(ctx) {
    const display = ctx.config?.display;
    if (!display?.showPromptCache) {
        return null;
    }
    const tokens = ctx.transcript.sessionTokens;
    const inputTokens = tokens?.inputTokens ?? 0;
    const cacheCreationTokens = tokens?.cacheCreationTokens ?? 0;
    const cacheReadTokens = tokens?.cacheReadTokens ?? 0;
    const totalInputTokens = inputTokens + cacheCreationTokens + cacheReadTokens;
    const cacheRate = totalInputTokens > 0 ? (cacheReadTokens / totalInputTokens) * 100 : 0;
    return `\x1b[38;5;245mCache: ${cacheRate.toFixed(1)}%${RESET}`;
}
//# sourceMappingURL=prompt-cache.js.map