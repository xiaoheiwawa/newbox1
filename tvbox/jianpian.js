var rule = {
    title: '荐片',
    host: 'https://api.ztcgi.com',
    homeUrl: '/api/v2/settings/homeCategory',
    url: '/api/crumb/list?fcate_pid=fyclass&category_id=&page=fypage',
    detailUrl: '/api/video/detailv2?id=fyid',
    searchUrl: '/api/v2/search/videoV2?key=**&category_id=88&page=fypage&pageSize=20',
    searchable: 1,
    quickSearch: 0,
    filterable: 1,
    play_parse: true,
    limit: 20,
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    filter: {},
    filter_url: '&area={{fl.area}}&year={{fl.year}}&type={{fl.cateId}}&sort={{fl.sort}}',
    预处理: `js:
        globalThis.JP_TITLE_REMOVE = ['名称排除', '广告', '破解', '群'];
        globalThis.JP_LINE_REMOVE = ['线路排除', '广告', '666', 'mymv'];
        globalThis.JP_LINE_ORDER = ['线路排序', '蓝光', 'ft', '官', 'ace', '1080p', 'dytt'];
        globalThis.JP_CATE_REMOVE = ['分类排除', '推荐', '首页'];
        globalThis.JP_IMGHOST = 'https://img.jgsfnl.com';
        try {
            let cfg = JSON.parse(request(rule.host + '/api/v2/settings/resourceDomainConfig', { headers: rule.headers }));
            if (cfg && cfg.code === 1 && cfg.data && cfg.data.imgDomain) {
                let list = cfg.data.imgDomain.split(',');
                JP_IMGHOST = 'https://' + list[Math.floor(Math.random() * list.length)].trim()
            }
        } catch (e) {
            log('荐片图片域名获取失败,使用默认:' + e.message)
        }
        globalThis.JP_PIC = function (p) {
            if (!p) return '';
            if (String(p).startsWith('http')) return p;
            return JP_IMGHOST + p
        };
        globalThis.JP_BAD_TITLE = function (t) {
            if (!t) return true;
            return JP_TITLE_REMOVE.some(function (w) { return new RegExp(w, 'i').test(t) })
        };
        globalThis.JP_MAP = function (arr) {
            let d = [];
            if (!Array.isArray(arr)) return d;
            arr.forEach(function (it) {
                if (!it) return;
                let title = it.title || '未知标题';
                if (JP_BAD_TITLE(title)) return;
                d.push({
                    url: String(it.id != null ? it.id : it.jump_id),
                    title: title,
                    img: JP_PIC(it.path || it.thumbnail),
                    desc: it.mask || ''
                })
            });
            return d
        };
        globalThis.JP_DOMAIN = function (url) {
            if (!url) return '';
            let clean = String(url).replace(/^https?:/, '').replace(/^\\/\\//, '');
            let dp = clean.split('/')[0];
            if (dp.includes('-')) return dp.split('-')[0];
            if (dp.includes('.')) {
                let parts = dp.split('.');
                if (parts.length > 2) return parts[parts.length - 2];
                if (parts.length === 2) return parts[0]
            }
            return dp
        };
        globalThis.JP_FILTER = [
            { key: 'cateId', name: '分类', value: [{ v: '', n: '全部' }, { v: '1', n: '剧情' }, { v: '2', n: '爱情' }, { v: '3', n: '动画' }, { v: '4', n: '喜剧' }, { v: '5', n: '战争' }, { v: '6', n: '歌舞' }, { v: '7', n: '古装' }, { v: '8', n: '奇幻' }, { v: '9', n: '冒险' }, { v: '10', n: '动作' }, { v: '11', n: '科幻' }, { v: '12', n: '悬疑' }, { v: '13', n: '犯罪' }, { v: '14', n: '家庭' }, { v: '15', n: '传记' }, { v: '16', n: '运动' }, { v: '18', n: '惊悚' }, { v: '20', n: '短片' }, { v: '21', n: '历史' }, { v: '22', n: '音乐' }, { v: '23', n: '西部' }, { v: '24', n: '武侠' }, { v: '25', n: '恐怖' }] },
            { key: 'area', name: '地区', value: [{ v: '', n: '全部' }, { v: '1', n: '国产' }, { v: '3', n: '中国香港' }, { v: '6', n: '中国台湾' }, { v: '5', n: '美国' }, { v: '18', n: '韩国' }, { v: '2', n: '日本' }] },
            { key: 'year', name: '年代', value: [{ v: '', n: '全部' }, { v: '162', n: '2026' }, { v: '107', n: '2025' }, { v: '119', n: '2024' }, { v: '153', n: '2023' }, { v: '101', n: '2022' }, { v: '118', n: '2021' }, { v: '16', n: '2020' }, { v: '7', n: '2019' }, { v: '2', n: '2018' }, { v: '3', n: '2017' }, { v: '22', n: '2016' }, { v: '2015', n: '2015以前' }] },
            { key: 'sort', name: '排序', value: [{ v: 'update', n: '最新' }, { v: 'hot', n: '最热' }, { v: 'rating', n: '评分' }] }
        ];
    `,
    class_parse: `js:
        let classes = [];
        let filters = {};
        try {
            let data = JSON.parse(request(input, { headers: rule.headers }));
            if (data && Array.isArray(data.data)) {
                data.data.forEach(function (it) {
                    if (it && it.id && it.name) {
                        let bad = JP_CATE_REMOVE.some(function (w) { return new RegExp(w, 'i').test(it.name) });
                        if (bad) return;
                        let tid = String(it.id);
                        classes.push({ type_id: tid, type_name: it.name });
                        if (tid !== '88' && tid !== '99') filters[tid] = JP_FILTER
                    }
                })
            }
        } catch (e) {
            log('荐片分类获取失败:' + e.message)
        }
        rule.filter = filters;
        input = classes;
    `,
    推荐: `js:
        let d = [];
        try {
            let data = JSON.parse(request(rule.host + '/api/slide/list?pos_id=88', { headers: rule.headers }));
            if (data && Array.isArray(data.data)) d = JP_MAP(data.data)
        } catch (e) {
            log('荐片推荐失败:' + e.message)
        }
        setResult(d);
    `,
    一级: `js:
        let d = [];
        try {
            let url = String(MY_CATE) === '99'
                ? rule.host + '/api/dyTag/tpl2_data?id=70&page=' + MY_PAGE
                : input;
            let data = JSON.parse(request(url, { headers: rule.headers }));
            if (data && Array.isArray(data.data)) d = JP_MAP(data.data)
        } catch (e) {
            log('荐片一级失败:' + e.message)
        }
        setResult(d);
    `,
    二级: `js:
        VOD = {};
        try {
            let data = JSON.parse(request(input, { headers: rule.headers }));
            let res = data && data.data;
            if (res) {
                let combined = [];
                if (Array.isArray(res.source_list_source)) {
                    res.source_list_source.forEach(function (item) {
                        if (!item) return;
                        let form = item.name || '未知线路';
                        if (item.source_list && item.source_list.length > 0 && item.source_list[0] && item.source_list[0].url) {
                            let domain = JP_DOMAIN(item.source_list[0].url);
                            if (domain.length > 8) domain = domain.substring(0, 8);
                            form = form + '(' + domain + ')'
                        }
                        let bad = JP_LINE_REMOVE.some(function (p) { return form.toLowerCase().includes(p.toLowerCase()) });
                        if (bad) return;
                        let urls = [];
                        if (Array.isArray(item.source_list)) {
                            item.source_list.forEach(function (s) {
                                if (s && s.source_name && s.url) urls.push(s.source_name + '$' + s.url)
                            })
                        }
                        if (urls.length > 0) combined.push({ form: form, url: urls.join('#') })
                    })
                }
                combined.sort(function (a, b) {
                    let pri = function (n) {
                        let idx = JP_LINE_ORDER.findIndex(function (k) { return n.toLowerCase().includes(k.toLowerCase()) });
                        return idx === -1 ? 999 : idx
                    };
                    return pri(a.form) - pri(b.form)
                });
                let playFrom = [];
                let playUrls = [];
                combined.forEach(function (it) {
                    playFrom.push(it.form.replace(/常规线路/g, '边下边播'));
                    playUrls.push(it.url)
                });
                VOD = {
                    vod_id: String(input.split('id=')[1]),
                    vod_name: res.title || '未知标题',
                    vod_year: res.year || '',
                    vod_area: res.area || '',
                    vod_remarks: res.mask || '',
                    vod_content: res.description || '',
                    vod_pic: JP_PIC(res.thumbnail),
                    vod_play_from: playFrom.join('$$$'),
                    vod_play_url: playUrls.join('$$$')
                }
            }
        } catch (e) {
            log('荐片二级失败:' + e.message)
        }
    `,
    搜索: `js:
        let d = [];
        try {
            let data = JSON.parse(request(input, { headers: rule.headers }));
            if (data && Array.isArray(data.data)) {
                let arr = [];
                data.data.forEach(function (it) {
                    if (it && it.id && it.title && new RegExp(KEY, 'i').test(it.title)) arr.push(it)
                });
                d = JP_MAP(arr)
            }
        } catch (e) {
            log('荐片搜索失败:' + e.message)
        }
        setResult(d);
    `,
    lazy: `js:
        try {
            let u = input;
            if (u && u.indexOf('.m3u8') > -1) {
                input = { parse: 0, jx: 0, url: u }
            } else if (u) {
                input = { parse: 0, jx: 0, url: 'tvbox-xg:' + u }
            } else {
                input = { parse: 0, jx: 0, url: '' }
            }
        } catch (e) {
            log('荐片lazy失败:' + e.message);
            input = { parse: 0, jx: 0, url: '' }
        }
    `
}
