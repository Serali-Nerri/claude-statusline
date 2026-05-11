import { getTotalTokens } from '../stdin.js';

export function formatTokens(n) {
    if (n >= 1000000) {
        return `${(n / 1000000).toFixed(1)}M`;
    }
    if (n >= 1000) {
        return `${(n / 1000).toFixed(0)}k`;
    }
    return n.toString();
}

export function formatContextValue(ctx, percent, mode) {
    const totalTokens = getTotalTokens(ctx.stdin);
    const size = ctx.stdin.context_window?.context_window_size ?? 0;
    if (mode === 'tokens') {
        if (size > 0) {
            return `${formatTokens(totalTokens)}/${formatTokens(size)}`;
        }
        return formatTokens(totalTokens);
    }
    if (mode === 'both') {
        if (size > 0) {
            return `${percent}% (${formatTokens(totalTokens)}/${formatTokens(size)})`;
        }
        return `${percent}%`;
    }
    if (mode === 'remaining') {
        return `${Math.max(0, 100 - percent)}%`;
    }
    return `${percent}%`;
}
//# sourceMappingURL=format-tokens.js.map
