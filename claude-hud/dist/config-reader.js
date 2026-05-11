import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'node:crypto';
import { createDebug } from './debug.js';
import { getClaudeConfigDir, getClaudeConfigJsonPath, getHudPluginDir } from './claude-config-dir.js';
const debug = createDebug('config');
function readJsonConfig(filePath) {
    if (!fs.existsSync(filePath))
        return null;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
function getMcpServerNames(filePath) {
    if (!fs.existsSync(filePath))
        return new Set();
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(content);
        if (config.mcpServers && typeof config.mcpServers === 'object') {
            return new Set(Object.keys(config.mcpServers));
        }
    }
    catch (error) {
        debug(`Failed to read MCP servers from ${filePath}:`, error);
    }
    return new Set();
}
function getMcpServerNamesFromConfig(config) {
    if (config?.mcpServers && typeof config.mcpServers === 'object') {
        return new Set(Object.keys(config.mcpServers));
    }
    return new Set();
}
function countHooksFromConfig(config) {
    if (config?.hooks && typeof config.hooks === 'object') {
        return Object.keys(config.hooks).length;
    }
    return 0;
}
function readStringSettingFromConfig(config, key) {
    if (typeof config?.[key] === 'string') {
        const value = config[key].trim();
        return value.length > 0 ? value : undefined;
    }
    return undefined;
}
function getDisabledMcpServersFromConfig(config, key) {
    if (Array.isArray(config?.[key])) {
        const validNames = config[key].filter((s) => typeof s === 'string');
        return new Set(validNames);
    }
    return new Set();
}
function getDisabledMcpServers(filePath, key) {
    if (!fs.existsSync(filePath))
        return new Set();
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(content);
        if (Array.isArray(config[key])) {
            const validNames = config[key].filter((s) => typeof s === 'string');
            if (validNames.length !== config[key].length) {
                debug(`${key} in ${filePath} contains non-string values, ignoring them`);
            }
            return new Set(validNames);
        }
    }
    catch (error) {
        debug(`Failed to read ${key} from ${filePath}:`, error);
    }
    return new Set();
}
function countMcpServersInFile(filePath, excludeFrom) {
    const servers = getMcpServerNames(filePath);
    if (excludeFrom) {
        const exclude = getMcpServerNames(excludeFrom);
        for (const name of exclude) {
            servers.delete(name);
        }
    }
    return servers.size;
}
function countHooksInFile(filePath) {
    if (!fs.existsSync(filePath))
        return 0;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(content);
        if (config.hooks && typeof config.hooks === 'object') {
            return Object.keys(config.hooks).length;
        }
    }
    catch (error) {
        debug(`Failed to read hooks from ${filePath}:`, error);
    }
    return 0;
}
function readStringSetting(filePath, key) {
    if (!fs.existsSync(filePath))
        return undefined;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(content);
        if (typeof config[key] === 'string') {
            const value = config[key].trim();
            return value.length > 0 ? value : undefined;
        }
    }
    catch (error) {
        debug(`Failed to read ${key} from ${filePath}:`, error);
    }
    return undefined;
}
function countRulesInDir(rulesDir) {
    if (!fs.existsSync(rulesDir))
        return 0;
    let count = 0;
    try {
        const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(rulesDir, entry.name);
            if (entry.isDirectory()) {
                count += countRulesInDir(fullPath);
            }
            else if (entry.isFile() && entry.name.endsWith('.md')) {
                count++;
            }
        }
    }
    catch (error) {
        debug(`Failed to read rules from ${rulesDir}:`, error);
    }
    return count;
}
function normalizePathForComparison(inputPath) {
    let normalized = path.normalize(path.resolve(inputPath));
    const root = path.parse(normalized).root;
    while (normalized.length > root.length && normalized.endsWith(path.sep)) {
        normalized = normalized.slice(0, -1);
    }
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}
function pathsReferToSameLocation(pathA, pathB) {
    if (normalizePathForComparison(pathA) === normalizePathForComparison(pathB)) {
        return true;
    }
    if (!fs.existsSync(pathA) || !fs.existsSync(pathB)) {
        return false;
    }
    try {
        const realPathA = fs.realpathSync.native(pathA);
        const realPathB = fs.realpathSync.native(pathB);
        return normalizePathForComparison(realPathA) === normalizePathForComparison(realPathB);
    }
    catch {
        return false;
    }
}
function getConfigCachePath(cwd, claudeConfigDir, homeDir) {
    const identity = JSON.stringify({ cwd, claudeConfigDir });
    const hash = createHash('sha256').update(identity).digest('hex');
    return path.join(getHudPluginDir(homeDir), 'config-cache', `${hash}.json`);
}
function statSentinel(filePath) {
    try {
        const stat = fs.statSync(filePath);
        return { mtimeMs: stat.mtimeMs, size: stat.size };
    }
    catch {
        return null;
    }
}
function buildSentinelPaths(claudeDir, claudeConfigJsonPath, cwd) {
    // Note: We sentinel CLAUDE.md directly instead of claudeDir because the
    // cache itself is stored under claudeDir/plugins/, which would change
    // claudeDir's mtime and immediately invalidate the cache on every write.
    const paths = [
        path.join(claudeDir, 'CLAUDE.md'),
        path.join(claudeDir, 'rules'),
        path.join(claudeDir, 'settings.json'),
        path.join(claudeDir, 'settings.local.json'),
        claudeConfigJsonPath,
    ];
    if (cwd) {
        paths.push(cwd, path.join(cwd, '.claude'), path.join(cwd, '.claude', 'rules'), path.join(cwd, '.mcp.json'), path.join(cwd, '.claude', 'settings.json'), path.join(cwd, '.claude', 'settings.local.json'));
    }
    return paths;
}
function collectRuleDirectorySentinels(rulesDir) {
    if (!fs.existsSync(rulesDir))
        return [];
    const sentinels = [rulesDir];
    try {
        const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            sentinels.push(...collectRuleDirectorySentinels(path.join(rulesDir, entry.name)));
        }
    }
    catch (error) {
        debug(`Failed to read rule sentinel paths from ${rulesDir}:`, error);
    }
    return sentinels;
}
function statSentinels(paths) {
    const result = {};
    for (const p of paths) {
        result[p] = statSentinel(p);
    }
    return result;
}
function sentinelsMatch(a, b) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
        return false;
    for (const key of keysA) {
        const sa = a[key];
        const sb = b[key];
        if (sa === null && sb === null)
            continue;
        if (sa === null || sb === null)
            return false;
        if (sa.mtimeMs !== sb.mtimeMs || sa.size !== sb.size)
            return false;
    }
    return true;
}
function isConfigCounts(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const counts = value;
    return (typeof counts.claudeMdCount === 'number'
        && Number.isFinite(counts.claudeMdCount)
        && counts.claudeMdCount >= 0
        && typeof counts.rulesCount === 'number'
        && Number.isFinite(counts.rulesCount)
        && counts.rulesCount >= 0
        && typeof counts.mcpCount === 'number'
        && Number.isFinite(counts.mcpCount)
        && counts.mcpCount >= 0
        && typeof counts.hooksCount === 'number'
        && Number.isFinite(counts.hooksCount)
        && counts.hooksCount >= 0
        && (counts.outputStyle === undefined || typeof counts.outputStyle === 'string'));
}
function readConfigCache(cacheKey, homeDir) {
    try {
        const cachePath = getConfigCachePath(cacheKey.cwd, cacheKey.claudeConfigDir, homeDir);
        const raw = fs.readFileSync(cachePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.key?.cwd !== cacheKey.cwd || parsed.key?.claudeConfigDir !== cacheKey.claudeConfigDir) {
            return null;
        }
        if (!isConfigCounts(parsed.data)) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function writeConfigCache(key, data, homeDir) {
    try {
        const cachePath = getConfigCachePath(key.cwd, key.claudeConfigDir, homeDir);
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        const payload = { key, data };
        fs.writeFileSync(cachePath, JSON.stringify(payload), 'utf8');
    }
    catch {
        // Cache write failures are non-fatal.
    }
}
function computeConfigCountsFresh(cwd) {
    let claudeMdCount = 0;
    let rulesCount = 0;
    let hooksCount = 0;
    let outputStyle;
    const homeDir = os.homedir();
    const claudeDir = getClaudeConfigDir(homeDir);
    const userMcpServers = new Set();
    const projectMcpServers = new Set();
    // === USER SCOPE ===
    if (fs.existsSync(path.join(claudeDir, 'CLAUDE.md'))) {
        claudeMdCount++;
    }
    rulesCount += countRulesInDir(path.join(claudeDir, 'rules'));
    // Read user settings.json once, extract MCPs + hooks + outputStyle
    const userSettingsConfig = readJsonConfig(path.join(claudeDir, 'settings.json'));
    for (const name of getMcpServerNamesFromConfig(userSettingsConfig)) {
        userMcpServers.add(name);
    }
    hooksCount += countHooksFromConfig(userSettingsConfig);
    outputStyle = readStringSettingFromConfig(userSettingsConfig, 'outputStyle');
    // Read user settings.local.json once
    const userLocalConfig = readJsonConfig(path.join(claudeDir, 'settings.local.json'));
    outputStyle = readStringSettingFromConfig(userLocalConfig, 'outputStyle') ?? outputStyle;
    // {CLAUDE_CONFIG_DIR}.json (additional user-scope MCPs)
    const userClaudeJson = getClaudeConfigJsonPath(homeDir);
    const userClaudeJsonConfig = readJsonConfig(userClaudeJson);
    for (const name of getMcpServerNamesFromConfig(userClaudeJsonConfig)) {
        userMcpServers.add(name);
    }
    const disabledUserMcps = getDisabledMcpServersFromConfig(userClaudeJsonConfig, 'disabledMcpServers');
    for (const name of disabledUserMcps) {
        userMcpServers.delete(name);
    }
    // === PROJECT SCOPE ===
    const projectClaudeDir = cwd ? path.join(cwd, '.claude') : null;
    const projectClaudeOverlapsUserScope = projectClaudeDir
        ? pathsReferToSameLocation(projectClaudeDir, claudeDir)
        : false;
    if (cwd) {
        if (fs.existsSync(path.join(cwd, 'CLAUDE.md'))) {
            claudeMdCount++;
        }
        if (fs.existsSync(path.join(cwd, 'CLAUDE.local.md'))) {
            claudeMdCount++;
        }
        if (!projectClaudeOverlapsUserScope && fs.existsSync(path.join(cwd, '.claude', 'CLAUDE.md'))) {
            claudeMdCount++;
        }
        if (fs.existsSync(path.join(cwd, '.claude', 'CLAUDE.local.md'))) {
            claudeMdCount++;
        }
        if (!projectClaudeOverlapsUserScope) {
            rulesCount += countRulesInDir(path.join(cwd, '.claude', 'rules'));
        }
        const mcpJsonServers = getMcpServerNames(path.join(cwd, '.mcp.json'));
        // Read project settings.json once
        if (!projectClaudeOverlapsUserScope) {
            const projectSettingsConfig = readJsonConfig(path.join(cwd, '.claude', 'settings.json'));
            for (const name of getMcpServerNamesFromConfig(projectSettingsConfig)) {
                projectMcpServers.add(name);
            }
            hooksCount += countHooksFromConfig(projectSettingsConfig);
            outputStyle = readStringSettingFromConfig(projectSettingsConfig, 'outputStyle') ?? outputStyle;
        }
        // Read local project settings once
        const localSettingsConfig = readJsonConfig(path.join(cwd, '.claude', 'settings.local.json'));
        for (const name of getMcpServerNamesFromConfig(localSettingsConfig)) {
            projectMcpServers.add(name);
        }
        hooksCount += countHooksFromConfig(localSettingsConfig);
        outputStyle = readStringSettingFromConfig(localSettingsConfig, 'outputStyle') ?? outputStyle;
        const disabledMcpJsonServers = getDisabledMcpServersFromConfig(localSettingsConfig, 'disabledMcpjsonServers');
        for (const name of disabledMcpJsonServers) {
            mcpJsonServers.delete(name);
        }
        for (const name of mcpJsonServers) {
            projectMcpServers.add(name);
        }
    }
    const mcpCount = userMcpServers.size + projectMcpServers.size;
    return { claudeMdCount, rulesCount, mcpCount, hooksCount, outputStyle };
}
export async function countConfigs(cwd) {
    const homeDir = os.homedir();
    const claudeDir = getClaudeConfigDir(homeDir);
    const claudeConfigJsonPath = getClaudeConfigJsonPath(homeDir);
    const normalizedCwd = cwd ? path.resolve(cwd) : null;
    const staticSentinelPaths = buildSentinelPaths(claudeDir, claudeConfigJsonPath, normalizedCwd);
    const cached = readConfigCache({ cwd: normalizedCwd, claudeConfigDir: claudeDir }, homeDir);
    const cacheValidationPaths = cached
        ? Array.from(new Set([...staticSentinelPaths, ...Object.keys(cached.key.sentinels)]))
        : staticSentinelPaths;
    const currentSentinels = statSentinels(cacheValidationPaths);
    if (cached && sentinelsMatch(cached.key.sentinels, currentSentinels)) {
        return cached.data;
    }
    const result = computeConfigCountsFresh(cwd);
    const ruleSentinelPaths = collectRuleDirectorySentinels(path.join(claudeDir, 'rules'));
    const projectClaudeDir = normalizedCwd ? path.join(normalizedCwd, '.claude') : null;
    const projectClaudeOverlapsUserScope = projectClaudeDir
        ? pathsReferToSameLocation(projectClaudeDir, claudeDir)
        : false;
    if (normalizedCwd && !projectClaudeOverlapsUserScope) {
        ruleSentinelPaths.push(...collectRuleDirectorySentinels(path.join(normalizedCwd, '.claude', 'rules')));
    }
    const cacheSentinelPaths = Array.from(new Set([...staticSentinelPaths, ...ruleSentinelPaths]));
    const cacheKey = {
        cwd: normalizedCwd,
        claudeConfigDir: claudeDir,
        sentinels: statSentinels(cacheSentinelPaths),
    };
    writeConfigCache(cacheKey, result, homeDir);
    return result;
}
//# sourceMappingURL=config-reader.js.map