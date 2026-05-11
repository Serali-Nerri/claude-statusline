import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getHudPluginDir } from './claude-config-dir.js';
export const DEFAULT_ELEMENT_ORDER = [
    'project',
    'addedDirs',
    'context',
    'usage',
    'promptCache',
    'memory',
    'environment',
    'tools',
    'agents',
    'todos',
];
export const DEFAULT_MERGE_GROUPS = [
    ['context', 'usage'],
];
const KNOWN_ELEMENTS = new Set(DEFAULT_ELEMENT_ORDER);
export const DEFAULT_CONFIG = {
    language: 'en',
    lineLayout: 'expanded',
    showSeparators: false,
    pathLevels: 1,
    maxWidth: null,
    forceMaxWidth: false,
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    gitStatus: {
        enabled: true,
        showDirty: true,
        showAheadBehind: false,
        showFileStats: false,
        branchOverflow: 'truncate',
        pushWarningThreshold: 0,
        pushCriticalThreshold: 0,
    },
    display: {
        showModel: true,
        showProject: true,
        showAddedDirs: true,
        addedDirsLayout: 'inline',
        showContextBar: true,
        contextValue: 'percent',
        showConfigCounts: false,
        showCost: false,
        showDuration: false,
        showSpeed: false,
        showTokenBreakdown: true,
        showUsage: true,
        usageBarEnabled: true,
        showResetLabel: true,
        usageCompact: false,
        showTools: false,
        showAgents: false,
        showTodos: false,
        showSessionName: false,
        showClaudeCodeVersion: false,
        showEffortLevel: false,
        showMemoryUsage: false,
        showPromptCache: false,
        promptCacheTtlSeconds: 300,
        showSessionTokens: false,
        showOutputStyle: false,
        mergeGroups: DEFAULT_MERGE_GROUPS.map(group => [...group]),
        autocompactBuffer: 'enabled',
        contextWarningThreshold: 70,
        contextCriticalThreshold: 85,
        usageThreshold: 0,
        sevenDayThreshold: 80,
        environmentThreshold: 0,
        externalUsagePath: '',
        externalUsageFreshnessMs: 300000,
        modelFormat: 'full',
        modelOverride: '',
        customLine: '',
        timeFormat: 'relative',
    },
    colors: {
        context: 'green',
        usage: 'brightBlue',
        warning: 'yellow',
        usageWarning: 'brightMagenta',
        critical: 'red',
        model: 'cyan',
        project: 'yellow',
        git: 'magenta',
        gitBranch: 'cyan',
        label: 'dim',
        custom: 208,
        barFilled: '█',
        barEmpty: '░',
    },
};
export function getConfigPath() {
    const homeDir = os.homedir();
    return path.join(getHudPluginDir(homeDir), 'config.json');
}
function validatePathLevels(value) {
    return value === 1 || value === 2 || value === 3;
}
function validateLineLayout(value) {
    return value === 'compact' || value === 'expanded';
}
function validateAutocompactBuffer(value) {
    return value === 'enabled' || value === 'disabled';
}
function validateGitBranchOverflow(value) {
    return value === 'truncate' || value === 'wrap';
}
function validateContextValue(value) {
    return value === 'percent' || value === 'tokens' || value === 'remaining' || value === 'both';
}
function validateLanguage(value) {
    return value === 'en' || value === 'zh';
}
function validateModelFormat(value) {
    return value === 'full' || value === 'compact' || value === 'short';
}
function validateTimeFormat(value) {
    return value === 'relative' || value === 'absolute' || value === 'both';
}
function validateColorName(value) {
    return value === 'dim'
        || value === 'red'
        || value === 'green'
        || value === 'yellow'
        || value === 'magenta'
        || value === 'cyan'
        || value === 'brightBlue'
        || value === 'brightMagenta';
}
const UNSAFE_CODEPOINT = /[\p{Cc}\p{Cf}\p{Variation_Selector}\p{Zl}\p{Zp}\p{Cn}]/u;
function validateBarChar(value) {
    if (typeof value !== 'string' || value.length === 0)
        return false;
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    if (Array.from(segmenter.segment(value)).length !== 1)
        return false;
    for (const ch of value) {
        if (UNSAFE_CODEPOINT.test(ch))
            return false;
    }
    return true;
}
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
function validateColorValue(value) {
    if (validateColorName(value))
        return true;
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255)
        return true;
    if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value))
        return true;
    return false;
}
function validateElementOrder(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return [...DEFAULT_ELEMENT_ORDER];
    }
    const seen = new Set();
    const elementOrder = [];
    for (const item of value) {
        if (typeof item !== 'string' || !KNOWN_ELEMENTS.has(item)) {
            continue;
        }
        const element = item;
        if (seen.has(element)) {
            continue;
        }
        seen.add(element);
        elementOrder.push(element);
    }
    return elementOrder.length > 0 ? elementOrder : [...DEFAULT_ELEMENT_ORDER];
}
function validateMergeGroups(value) {
    if (!Array.isArray(value)) {
        return DEFAULT_MERGE_GROUPS.map(group => [...group]);
    }
    if (value.length === 0) {
        return [];
    }
    const usedElements = new Set();
    const mergeGroups = [];
    for (const group of value) {
        if (!Array.isArray(group)) {
            continue;
        }
        const seenInGroup = new Set();
        const normalizedGroup = [];
        const pendingElements = [];
        for (const item of group) {
            if (typeof item !== 'string' || !KNOWN_ELEMENTS.has(item)) {
                continue;
            }
            const element = item;
            if (seenInGroup.has(element) || usedElements.has(element)) {
                continue;
            }
            seenInGroup.add(element);
            normalizedGroup.push(element);
            pendingElements.push(element);
        }
        if (normalizedGroup.length >= 2) {
            for (const element of pendingElements) {
                usedElements.add(element);
            }
            mergeGroups.push(normalizedGroup);
        }
    }
    return mergeGroups.length > 0
        ? mergeGroups
        : DEFAULT_MERGE_GROUPS.map(group => [...group]);
}
function migrateConfig(userConfig) {
    const migrated = { ...userConfig };
    if ('layout' in userConfig && !('lineLayout' in userConfig)) {
        if (typeof userConfig.layout === 'string') {
            // Legacy string migration (v0.0.x → v0.1.x)
            if (userConfig.layout === 'separators') {
                migrated.lineLayout = 'compact';
                migrated.showSeparators = true;
            }
            else {
                migrated.lineLayout = 'compact';
                migrated.showSeparators = false;
            }
        }
        else if (typeof userConfig.layout === 'object' && userConfig.layout !== null) {
            // Object layout written by third-party tools — extract nested fields
            const obj = userConfig.layout;
            if (typeof obj.lineLayout === 'string')
                migrated.lineLayout = obj.lineLayout;
            if (typeof obj.showSeparators === 'boolean')
                migrated.showSeparators = obj.showSeparators;
            if (typeof obj.pathLevels === 'number')
                migrated.pathLevels = obj.pathLevels;
        }
        delete migrated.layout;
    }
    return migrated;
}
function validateThreshold(value, max = 100) {
    if (typeof value !== 'number')
        return 0;
    return Math.max(0, Math.min(max, value));
}
function validateContextThreshold(value, fallback) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return fallback;
    return Math.max(0, Math.min(100, value));
}
function validateCountThreshold(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.floor(value));
}
function validateDurationSeconds(value, fallback) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return fallback;
    }
    return Math.floor(value);
}
function validateOptionalPath(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function validateFreshnessMs(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return DEFAULT_CONFIG.display.externalUsageFreshnessMs;
    }
    return Math.max(0, Math.floor(value));
}
function mergeBool(obj, key, fallback) {
    return typeof obj?.[key] === 'boolean' ? obj[key] : fallback;
}
function mergeValidated(obj, key, validator, fallback) {
    return validator(obj?.[key]) ? obj[key] : fallback;
}
function mergeColor(obj, key, fallback) {
    return validateColorValue(obj?.[key]) ? obj[key] : fallback;
}
export function mergeConfig(userConfig) {
    const migrated = migrateConfig(userConfig);
    const language = mergeValidated(migrated, 'language', validateLanguage, DEFAULT_CONFIG.language);
    const lineLayout = mergeValidated(migrated, 'lineLayout', validateLineLayout, DEFAULT_CONFIG.lineLayout);
    const showSeparators = mergeBool(migrated, 'showSeparators', DEFAULT_CONFIG.showSeparators);
    const pathLevels = mergeValidated(migrated, 'pathLevels', validatePathLevels, DEFAULT_CONFIG.pathLevels);
    const rawMaxWidth = migrated.maxWidth;
    const maxWidth = (typeof rawMaxWidth === 'number' && Number.isFinite(rawMaxWidth) && rawMaxWidth > 0)
        ? Math.floor(rawMaxWidth)
        : null;
    const elementOrder = validateElementOrder(migrated.elementOrder);
    const forceMaxWidth = mergeBool(migrated, 'forceMaxWidth', DEFAULT_CONFIG.forceMaxWidth);
    const gs = migrated.gitStatus;
    const gitStatus = {
        enabled: mergeBool(gs, 'enabled', DEFAULT_CONFIG.gitStatus.enabled),
        showDirty: mergeBool(gs, 'showDirty', DEFAULT_CONFIG.gitStatus.showDirty),
        showAheadBehind: mergeBool(gs, 'showAheadBehind', DEFAULT_CONFIG.gitStatus.showAheadBehind),
        showFileStats: mergeBool(gs, 'showFileStats', DEFAULT_CONFIG.gitStatus.showFileStats),
        branchOverflow: mergeValidated(gs, 'branchOverflow', validateGitBranchOverflow, DEFAULT_CONFIG.gitStatus.branchOverflow),
        pushWarningThreshold: validateCountThreshold(gs?.pushWarningThreshold),
        pushCriticalThreshold: validateCountThreshold(gs?.pushCriticalThreshold),
    };
    const d = migrated.display;
    const dd = DEFAULT_CONFIG.display;
    const display = {
        showModel: mergeBool(d, 'showModel', dd.showModel),
        showProject: mergeBool(d, 'showProject', dd.showProject),
        showAddedDirs: mergeBool(d, 'showAddedDirs', dd.showAddedDirs),
        addedDirsLayout: (d?.addedDirsLayout === 'inline' || d?.addedDirsLayout === 'line')
            ? d.addedDirsLayout
            : dd.addedDirsLayout,
        showContextBar: mergeBool(d, 'showContextBar', dd.showContextBar),
        contextValue: mergeValidated(d, 'contextValue', validateContextValue, dd.contextValue),
        showConfigCounts: mergeBool(d, 'showConfigCounts', dd.showConfigCounts),
        showCost: mergeBool(d, 'showCost', dd.showCost),
        showDuration: mergeBool(d, 'showDuration', dd.showDuration),
        showSpeed: mergeBool(d, 'showSpeed', dd.showSpeed),
        showTokenBreakdown: mergeBool(d, 'showTokenBreakdown', dd.showTokenBreakdown),
        showUsage: mergeBool(d, 'showUsage', dd.showUsage),
        usageBarEnabled: mergeBool(d, 'usageBarEnabled', dd.usageBarEnabled),
        showResetLabel: mergeBool(d, 'showResetLabel', dd.showResetLabel),
        usageCompact: mergeBool(d, 'usageCompact', dd.usageCompact),
        showTools: mergeBool(d, 'showTools', dd.showTools),
        showAgents: mergeBool(d, 'showAgents', dd.showAgents),
        showTodos: mergeBool(d, 'showTodos', dd.showTodos),
        showSessionName: mergeBool(d, 'showSessionName', dd.showSessionName),
        showClaudeCodeVersion: mergeBool(d, 'showClaudeCodeVersion', dd.showClaudeCodeVersion),
        showEffortLevel: mergeBool(d, 'showEffortLevel', dd.showEffortLevel),
        showMemoryUsage: mergeBool(d, 'showMemoryUsage', dd.showMemoryUsage),
        showPromptCache: mergeBool(d, 'showPromptCache', dd.showPromptCache),
        promptCacheTtlSeconds: validateDurationSeconds(d?.promptCacheTtlSeconds, dd.promptCacheTtlSeconds),
        showSessionTokens: mergeBool(d, 'showSessionTokens', dd.showSessionTokens),
        showOutputStyle: mergeBool(d, 'showOutputStyle', dd.showOutputStyle),
        mergeGroups: validateMergeGroups(d?.mergeGroups),
        autocompactBuffer: mergeValidated(d, 'autocompactBuffer', validateAutocompactBuffer, dd.autocompactBuffer),
        contextWarningThreshold: validateContextThreshold(d?.contextWarningThreshold, dd.contextWarningThreshold),
        contextCriticalThreshold: validateContextThreshold(d?.contextCriticalThreshold, dd.contextCriticalThreshold),
        usageThreshold: validateThreshold(d?.usageThreshold, 100),
        sevenDayThreshold: validateThreshold(d?.sevenDayThreshold, 100),
        environmentThreshold: validateThreshold(d?.environmentThreshold, 100),
        externalUsagePath: validateOptionalPath(d?.externalUsagePath),
        externalUsageFreshnessMs: validateFreshnessMs(d?.externalUsageFreshnessMs),
        modelFormat: mergeValidated(d, 'modelFormat', validateModelFormat, dd.modelFormat),
        modelOverride: typeof d?.modelOverride === 'string'
            ? d.modelOverride.slice(0, 80)
            : dd.modelOverride,
        customLine: typeof d?.customLine === 'string'
            ? d.customLine.slice(0, 80)
            : dd.customLine,
        timeFormat: mergeValidated(d, 'timeFormat', validateTimeFormat, dd.timeFormat),
    };
    const c = migrated.colors;
    const dc = DEFAULT_CONFIG.colors;
    const colors = {
        context: mergeColor(c, 'context', dc.context),
        usage: mergeColor(c, 'usage', dc.usage),
        warning: mergeColor(c, 'warning', dc.warning),
        usageWarning: mergeColor(c, 'usageWarning', dc.usageWarning),
        critical: mergeColor(c, 'critical', dc.critical),
        model: mergeColor(c, 'model', dc.model),
        project: mergeColor(c, 'project', dc.project),
        git: mergeColor(c, 'git', dc.git),
        gitBranch: mergeColor(c, 'gitBranch', dc.gitBranch),
        label: mergeColor(c, 'label', dc.label),
        custom: mergeColor(c, 'custom', dc.custom),
        barFilled: validateBarChar(c?.barFilled) ? c.barFilled : dc.barFilled,
        barEmpty: validateBarChar(c?.barEmpty) ? c.barEmpty : dc.barEmpty,
    };
    return { language, lineLayout, showSeparators, pathLevels, maxWidth, forceMaxWidth, elementOrder, gitStatus, display, colors };
}
export async function loadConfig() {
    const configPath = getConfigPath();
    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(content);
        return mergeConfig(userConfig);
    }
    catch {
        return mergeConfig({});
    }
}
//# sourceMappingURL=config.js.map