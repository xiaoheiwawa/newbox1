const PAN_ENV_KEYS = [
    'quark_cookie',
    'baidu_cookie',
    'uc_cookie',
    'uc_token',
    'uc_refresh_token',
    'threads',
];

export function applyDrpyPanEnv(credentials = {}) {
    if (!credentials || typeof credentials !== 'object') return;

    for (const key of PAN_ENV_KEYS) {
        if (credentials[key]) globalThis[key] = credentials[key];
    }
}