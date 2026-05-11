import { label, getQuotaColor, quotaBar, RESET } from './colors.js';
import { t } from '../i18n/index.js';
import { formatResetTime } from './format-reset-time.js';

export function formatUsagePercent(percent, colors) {
    if (percent === null) {
        return label('--', colors);
    }
    const color = getQuotaColor(percent, colors);
    return `${color}${percent}%${RESET}`;
}

export function formatCompactWindowPart(windowLabel, percent, resetAt, timeFormat, colors) {
    const usageDisplay = formatUsagePercent(percent, colors);
    const reset = formatResetTime(resetAt, timeFormat);
    const styledLabel = label(`${windowLabel}:`, colors);
    return reset
        ? `${styledLabel} ${usageDisplay} ${label(`(${reset})`, colors)}`
        : `${styledLabel} ${usageDisplay}`;
}

export function formatUsageWindowPart({ label: windowLabel, labelKey, percent, resetAt, colors, usageBarEnabled, barWidth, timeFormat = 'relative', showResetLabel, forceLabel = false, alignLabels = false, barResetStyle = 'standard', progressLabelFn = null, }) {
    const usageDisplay = formatUsagePercent(percent, colors);
    const reset = formatResetTime(resetAt, timeFormat);
    const styledLabel = (progressLabelFn && labelKey)
        ? progressLabelFn(labelKey, colors, alignLabels)
        : label(windowLabel, colors);
    const resetsKey = timeFormat === 'absolute' ? 'format.resets' : 'format.resetsIn';
    if (usageBarEnabled) {
        let barReset;
        if (barResetStyle === 'compact-duration') {
            barReset = timeFormat === 'relative'
                ? (reset ? `${reset} / ${windowLabel}` : null)
                : (reset ? (showResetLabel ? `${t(resetsKey)} ${reset}` : reset) : null);
        } else {
            barReset = reset
                ? (showResetLabel ? `${t(resetsKey)} ${reset}` : reset)
                : null;
        }
        const body = barReset
            ? `${quotaBar(percent ?? 0, barWidth, colors)} ${usageDisplay} (${barReset})`
            : `${quotaBar(percent ?? 0, barWidth, colors)} ${usageDisplay}`;
        return forceLabel ? `${styledLabel} ${body}` : body;
    }
    const resetSuffix = reset
        ? showResetLabel
            ? `(${t(resetsKey)} ${reset})`
            : `(${reset})`
        : '';
    return resetSuffix
        ? `${styledLabel} ${usageDisplay} ${resetSuffix}`
        : `${styledLabel} ${usageDisplay}`;
}
//# sourceMappingURL=format-usage.js.map
