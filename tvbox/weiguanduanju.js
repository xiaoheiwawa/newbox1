var rule = {
    title: '围观短剧',
    host: 'https://api.drama.9ddm.com',
    homeUrl: '/drama/home/shortVideoTags?version_code=1600&os_type=1',
    url: '/drama/home/search?version_code=1600&os_type=1',
    detailUrl: '/drama/home/shortVideoDetail?version_code=1600&os_type=1&oneId=fyid&page=1&pageSize=1000',
    searchUrl: '/drama/home/search?version_code=1600&os_type=1',
    searchable: 1,
    quickSearch: 1,
    filterable: 1,
    play_parse: true,
    limit: 30,
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
        'Accept': 'application/json'
    },
    filter: {},
    预处理: `js:
        globalThis.WG_POST = function (body) {
            let html = request(rule.host + rule.url, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: Object.assign({}, rule.headers, { 'Content-Type': 'application/json' })
            });
            try { return JSON.parse(html) } catch (e) { return null }
        };
        globalThis.WG_LIST = function (data) {
            let d = [];
            if (data && data.code === 200 && Array.isArray(data.data)) {
                data.data.forEach(function (it) {
                    if (it && it.oneId) {
                        d.push({
                            url: String(it.oneId),
                            title: it.title || '未知标题',
                            img: it.vertPoster || it.horizonPoster || '',
                            desc: '集数:' + (it.episodeCount || 0) + ' 播放:' + (it.viewCount || 0),
                            content: it.description || ''
                        })
                    }
                })
            }
            return d
        };
    `,
    class_parse: `js:
        let classes = [{ type_id: '全部', type_name: '全部' }];
        let filters = { '全部': [] };
        try {
            let data = JSON.parse(request(input, {
                headers: Object.assign({}, rule.headers, { 'Content-Type': 'application/json' })
            }));
            if (data && data.code === 200 && Array.isArray(data.audiences)) {
                let tagValues = [{ n: '全部', v: '' }];
                if (Array.isArray(data.tags)) {
                    data.tags.forEach(function (t) { if (t) tagValues.push({ n: t, v: t }) })
                }
                let orderValues = [];
                if (Array.isArray(data.orders)) {
                    data.orders.forEach(function (o) { if (o) orderValues.push({ n: o, v: o }) })
                }
                data.audiences.forEach(function (a) {
                    classes.push({ type_id: a, type_name: a });
                    let fl = [];
                    if (tagValues.length > 1) fl.push({ key: 'tag', name: '标签', value: tagValues });
                    if (orderValues.length > 0) fl.push({ key: 'order', name: '排序', value: orderValues });
                    filters[a] = fl
                })
            }
        } catch (e) {
            log('围观短剧分类获取失败:' + e.message)
        }
        rule.filter = filters;
        input = classes;
    `,
    推荐: `js:
        let data = WG_POST({ audience: '', page: 1, pageSize: 30, searchWord: '', subject: '', order: '' });
        setResult(WG_LIST(data).slice(0, 12));
    `,
    一级: `js:
        let data = WG_POST({
            audience: MY_CATE === '全部' ? '' : MY_CATE,
            page: MY_PAGE,
            pageSize: 30,
            searchWord: '',
            subject: (MY_FL && MY_FL.tag) ? MY_FL.tag : '',
            order: (MY_FL && MY_FL.order) ? MY_FL.order : ''
        });
        setResult(WG_LIST(data));
    `,
    二级: `js:
        VOD = {};
        try {
            let data = JSON.parse(request(input, {
                headers: Object.assign({}, rule.headers, { 'Content-Type': 'application/json' })
            }));
            if (data && data.code === 200 && Array.isArray(data.data)) {
                let episodes = data.data.filter(function (ep) { return ep });
                let first = episodes[0] || {};
                let playItems = [];
                episodes.forEach(function (ep, i) {
                    let ps = ep.playSetting || ep.videoClarityList || [];
                    if (typeof ps === 'string') {
                        try { ps = JSON.parse(ps) } catch (e) { ps = [] }
                    }
                    if (!Array.isArray(ps)) ps = [];
                    let clarity = {};
                    ps.forEach(function (item) {
                        if (item && item.url && item.name) clarity[item.name] = item.url
                    });
                    if (Object.keys(clarity).length > 0) {
                        let num = ep.playOrder || ep.episodeNumber || (i + 1);
                        playItems.push('第' + num + '集$' + base64Encode(JSON.stringify(clarity)))
                    }
                });
                VOD = {
                    vod_id: String(input.split('oneId=')[1].split('&')[0]),
                    vod_name: data.title || first.title || '未知剧名',
                    vod_pic: data.vertPoster || first.vertPoster || '',
                    vod_remarks: '共' + (data.totalEpisodeCount || episodes.length) + '集',
                    vod_content: data.description || '',
                    vod_year: data.publishDate ? String(data.publishDate) : '',
                    vod_tag: Array.isArray(data.shortPlayTag) ? data.shortPlayTag.join(',') : '',
                    vod_play_from: '围观短剧',
                    vod_play_url: playItems.join('#')
                }
            }
        } catch (e) {
            log('围观短剧二级失败:' + e.message)
        }
    `,
    搜索: `js:
        let data = WG_POST({ audience: '', page: MY_PAGE, pageSize: 30, searchWord: KEY, subject: '' });
        setResult(WG_LIST(data));
    `,
    lazy: `js:
        try {
            let raw = input;
            if (raw.trim().charAt(0) !== '{') {
                try { raw = base64Decode(raw) } catch (e) {}
            }
            let clarity = {};
            if (raw.trim().charAt(0) === '{') clarity = JSON.parse(raw);
            let order = ['4K', '超清', '1080P', '高清', '720P', '流畅', '480P'];
            let urls = [];
            order.forEach(function (c) {
                let u = clarity[c];
                if (u && typeof u === 'string' && u.startsWith('http')) urls.push(c, u)
            });
            Object.keys(clarity).forEach(function (c) {
                let u = clarity[c];
                if (order.indexOf(c) < 0 && u && typeof u === 'string' && u.startsWith('http')) urls.push(c, u)
            });
            if (urls.length > 0) {
                input = { parse: 0, jx: 0, url: urls, header: JSON.stringify({ 'User-Agent': rule.headers['User-Agent'] }) }
            } else if (typeof input === 'string' && input.startsWith('http')) {
                input = { parse: 0, jx: 0, url: input, header: JSON.stringify({ 'User-Agent': rule.headers['User-Agent'] }) }
            } else {
                input = { parse: 0, jx: 0, url: '' }
            }
        } catch (e) {
            log('围观短剧lazy失败:' + e.message);
            input = { parse: 0, jx: 0, url: '' }
        }
    `
}
