/**
 * 可分享 URL 工具
 * 将可视化状态编码到 URL hash，支持分享和恢复
 */

// 编码配置到 URL hash
export function encodeStateToUrl(state) {
    try {
        const shareState = {
            c: state.config,           // config
            v: state.viewState,        // viewState
            m: state.mapStyle,         // mapStyle
            d: state.globalDark,       // dark mode
            sl: state.selectedLocation // selected location
        };
        const json = JSON.stringify(shareState);
        const encoded = btoa(encodeURIComponent(json));
        return encoded;
    } catch (e) {
        console.error('URL encode failed:', e);
        return null;
    }
}

// 从 URL hash 解码配置
export function decodeStateFromUrl() {
    try {
        const hash = window.location.hash.slice(1); // 去掉 #
        if (!hash || hash.length < 10) return null;

        // 检查是否是 share= 前缀
        const prefix = 'share=';
        const encoded = hash.startsWith(prefix) ? hash.slice(prefix.length) : null;
        if (!encoded) return null;

        const json = decodeURIComponent(atob(encoded));
        const shareState = JSON.parse(json);
        return {
            config: shareState.c || null,
            viewState: shareState.v || null,
            mapStyle: shareState.m || null,
            globalDark: shareState.d || false,
            selectedLocation: shareState.sl || null,
        };
    } catch (e) {
        // hash 不是有效的分享链接，忽略
        return null;
    }
}

// 生成完整的分享 URL
export function generateShareUrl(state) {
    const encoded = encodeStateToUrl(state);
    if (!encoded) return null;
    const base = window.location.origin + window.location.pathname;
    return `${base}#share=${encoded}`;
}

// 复制到剪贴板
export async function copyShareUrl(state) {
    const url = generateShareUrl(state);
    if (!url) return false;
    try {
        await navigator.clipboard.writeText(url);
        return true;
    } catch (e) {
        // fallback
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    }
}
