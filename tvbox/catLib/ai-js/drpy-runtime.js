import requestClient from '../../../utils/req.js';

function toContent(data) {
    if (typeof data === 'string') return data;
    if (data === undefined || data === null) return '';
    return JSON.stringify(data);
}

export function installDrpyRuntime() {
    if (globalThis.__drpyCatRuntimeInstalled) return;
    globalThis.__drpyCatRuntimeInstalled = true;

    globalThis.req = async (url, options = {}) => {
        const {postType, body, data, ...requestOptions} = options;
        let requestData = data ?? body;

        if (postType === 'json' && typeof requestData === 'string') {
            try {
                requestData = JSON.parse(requestData);
            } catch {
            }
        }

        const response = await requestClient(url, {
            ...requestOptions,
            data: requestData,
        });
        return {
            ...response,
            content: toContent(response.data),
        };
    };
}
