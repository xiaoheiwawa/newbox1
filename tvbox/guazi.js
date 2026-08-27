var rule = {
    title: '瓜子',
    host: 'https://api.w32z7vtd.com',
    url: '/App/IndexList/indexList',
    searchUrl: '/App/Index/findMoreVod',
    detailUrl: 'fyid',
    searchable: 1,
    quickSearch: 1,
    filterable: 1,
    play_parse: true,
    limit: 30,
    timeout: 15000,
    class_name: '电影&电视剧&动漫&综艺&短剧&纪录片&体育&电竞&音乐&AI漫剧&电影解说&短剧解说',
    class_url: '1&2&4&3&64&20&71&70&72&74&73&39',
    headers: {
        'Cache-Control': 'no-cache',
        'Version': '2604028',
        'PackageName': 'com.ae06aebdbb.y286327f5a.ofe849883320260517',
        'Ver': '3.0.3.2',
        'Referer': 'https://api.w32z7vtd.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Lavf/57.83.100',
        'code': 'GZ0369',
        'lang': 'zh_cn'
    },
    filter: {},
    预处理: `js:
        globalThis.GZ = {
            hosts: ['https://api.w32z7vtd.com','https://api.umygrx3.com','https://api.rmedphk.com','https://apinew.uozvr.com','https://api.6a7nnf7.com'],
            hi: 0,
            aes_key: 'mvXBSW7ekreItNsT',
            aes_iv: '2U3IrJL8szAKp0Fj',
            pub: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDUM5+/y8sPsWkd1/RQS64X259EUwxFXFE5HlA65MqrxnPs0JqoSRojSDy5QhwvROlaD6TwRQHKMY2OAZ6SnQeUJsChTEFIR9qUkwrs3/MVUMxjsv6JS6Oe/juclyJGTgVmDhB55EafXsD0SQYVj/QXXsxR6ewR5E2kL52yAAD4yQIDAQAB',
            priv: 'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGAe6hKrWLi1zQmjTT1ozbE4QdFeJGNxubxld6GrFGximxfMsMB6BpJhpcTouAqywAFppiKetUBBbXwYsYU1wNr648XVmPmCMCy4rY8vdliFnbMUj086DU6Z+/oXBdWU3/b1G0DN3E9wULRSwcKZT3wj/cCI1vsCm3gj2R5SqkA9Y0CAwEAAQKBgAJH+4CxV0/zBVcLiBCHvSANm0l7HetybTh/j2p0Y1sTXro4ALwAaCTUeqdBjWiLSo9lNwDHFyq8zX90+gNxa7c5EqcWV9FmlVXr8VhfBzcZo1nXeNdXFT7tQ2yah/odtdcx+vRMSGJd1t/5k5bDd9wAvYdIDblMAg+wiKKZ5KcdAkEA1cCakEN4NexkF5tHPRrR6XOY/XHfkqXxEhMqmNbB9U34saTJnLWIHC8IXys6Qmzz30TtzCjuOqKRRy+FMM4TdwJBAJQZFPjsGC+RqcG5UvVMiMPhnwe/bXEehShK86yJK/g/UiKrO87h3aEu5gcJqBygTq3BBBoH2md3pr/W+hUMWBsCQQChfhTIrdDinKi6lRxrdBnn0Ohjg2cwuqK5zzU9p/N+S9x7Ck8wUI53DKm8jUJE8WAG7WLj/oCOWEh+ic6NIwTdAkEAj0X8nhx6AXsgCYRql1klbqtVmL8+95KZK7PnLWG/IfjQUy3pPGoSaZ7fdquG8bq8oyf5+dzjE/oTXcByS+6XRQJAP/5ciy1bL3NhUhsaOVy55MHXnPjdcTX0FaLi+ybXZIfIQ2P4rb19mVq1feMbCXhz+L1rG8oat5lYKfpe8k83ZA==',
            SALT: '*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br',
            token: '',
            token_id: '',
            NO_AREA: ['70','71','72','73','74','39'],
            SINGLE: ['70','71','72','73','39']
        };

        GZ.pickHost = function () {
            GZ.hi = (GZ.hi + 1) % GZ.hosts.length;
            rule.host = GZ.hosts[GZ.hi];
            rule.headers.Referer = rule.host;
            log('[瓜子] 切换域名: ' + rule.host);
        };

        GZ.aesEnc = function (t) {
            try {
                let k = CryptoJS.enc.Utf8.parse(GZ.aes_key);
                let v = CryptoJS.enc.Utf8.parse(GZ.aes_iv);
                let e = CryptoJS.AES.encrypt(t, k, { iv: v, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
                return e.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
            } catch (e) { log('[瓜子] AES加密失败:' + e.message); return '' }
        };

        GZ.aesDec = function (t, k, v) {
            try {
                let kk = CryptoJS.enc.Utf8.parse(k);
                let vv = CryptoJS.enc.Utf8.parse(v);
                let cp = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse(t) });
                return CryptoJS.AES.decrypt(cp, kk, { iv: vv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString(CryptoJS.enc.Utf8);
            } catch (e) { log('[瓜子] AES解密失败:' + e.message); return '' }
        };

        GZ.rsaEnc = function (t) {
            try {
                let r = rsaX('RSA/PKCS1', true, true, t, false, GZ.pub, true);
                if (r) return r;
            } catch (e) { log('[瓜子] rsaX加密失败:' + e.message) }
            return '';
        };

        GZ.rsaDec = function (t) {
            try {
                let r = rsaX('RSA/PKCS1', false, false, t, true, GZ.priv, false);
                if (r) return r;
            } catch (e) { log('[瓜子] rsaX解密失败:' + e.message) }
            return '';
        };

        GZ.call = function (path, data, isAuth) {
            let rk = GZ.aesEnc(JSON.stringify(data));
            let keys = GZ.rsaEnc(JSON.stringify({ iv: GZ.aes_iv, key: GZ.aes_key }));
            if (!rk || !keys) return null;
            let t = String(Math.floor(Date.now() / 1000));
            let tid = isAuth ? '' : (GZ.token_id || '');
            let tok = isAuth ? '' : (GZ.token || '');
            let sign = 'token_id=' + tid + ',token=' + tok + ',phone_type=1,request_key=' + rk + ',app_id=1,time=' + t + ',keys=' + keys + GZ.SALT;
            let body = {
                token: tok, token_id: tid, phone_type: '1', time: t,
                phone_model: 'xiaomi-22021211rc', keys: keys, request_key: rk,
                signature: md5(sign), app_id: '1', ad_version: '1'
            };
            let form = Object.keys(body).map(function (k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(body[k])
            }).join('&');

            let tries = isAuth ? GZ.hosts.length : 1;
            for (let i = 0; i < tries; i++) {
                try {
                    let html = request(rule.host + path, { method: 'POST', body: form, headers: rule.headers });
                    if (html) {
                        let res = JSON.parse(html);
                        if (res && res.data && res.data.keys && res.data.response_key) {
                            let bk = JSON.parse(GZ.rsaDec(res.data.keys));
                            let plain = GZ.aesDec(res.data.response_key, bk.key, bk.iv);
                            if (plain) return JSON.parse(plain);
                        }
                    }
                } catch (e) {
                    log('[瓜子] ' + path + ' 请求异常:' + e.message);
                }
                if (i < tries - 1) GZ.pickHost();
            }
            return null;
        };

        GZ.signUp = function () {
            let dk = '';
            for (let i = 0; i < 40; i++) dk += '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16));
            rule.headers.deviceId = String(864150060000000 + Math.floor(Math.random() * 99999));
            let r = GZ.call('/App/Authentication/Device/signUp', {
                new_key: dk, old_key: 'aLFBMWpxBrIDAD1Si/KVvm41', phone_type: 1, code: ''
            }, true);
            if (r && r.token) {
                GZ.token = r.token;
                GZ.token_id = r.app_user_id || '';
                log('[瓜子] 注册成功 token_id=' + GZ.token_id);
            } else {
                log('[瓜子] 注册失败: 所有域名不可用');
            }
        };

        GZ.remarks = function (item, tid) {
            let nc = String(item.new_continue || '').trim();
            if (nc) return nc;
            let vc = Number(item.vod_continu || 0);
            tid = String(tid);
            if (vc > 0 && GZ.SINGLE.indexOf(tid) < 0) return '更新至' + vc + '集';
            if (tid === '1') return '电影';
            return '';
        };

        GZ.map = function (list, tid) {
            let d = [];
            if (!Array.isArray(list)) return d;
            list.forEach(function (it) {
                if (!it || !it.vod_id) return;
                d.push({
                    url: String(it.vod_id) + '/' + Number(it.vod_continu || 0),
                    title: it.vod_name || '',
                    img: it.vod_pic || '',
                    desc: GZ.remarks(it, tid)
                })
            });
            return d;
        };

        GZ.signUp();

        let areaF = { key: 'area', name: '地区', value: [{ n: '全部', v: '0' }, { n: '大陆', v: '大陆' }, { n: '香港', v: '香港' }, { n: '台湾', v: '台湾' }, { n: '美国', v: '美国' }, { n: '韩国', v: '韩国' }, { n: '日本', v: '日本' }, { n: '英国', v: '英国' }, { n: '法国', v: '法国' }, { n: '泰国', v: '泰国' }, { n: '印度', v: '印度' }, { n: '其他', v: '其他' }] };
        let commonF = [
            { key: 'year', name: '年份', value: [{ n: '全部', v: '0' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }, { n: '2023', v: '2023' }, { n: '2022', v: '2022' }, { n: '2021', v: '2021' }, { n: '2020', v: '2020' }, { n: '2019', v: '2019' }, { n: '2018', v: '2018' }, { n: '2017', v: '2017' }, { n: '2016', v: '2016' }, { n: '2015', v: '2015' }, { n: '2014', v: '2014' }, { n: '2013', v: '2013' }, { n: '2012', v: '2012' }, { n: '更早', v: '2004' }] },
            { key: 'sort', name: '排序', value: [{ n: '最新', v: 'd_id' }, { n: '最热', v: 'd_hits' }, { n: '推荐', v: 'd_score' }] }
        ];
        let fl = {};
        ['1', '2', '3', '4', '64', '20'].forEach(function (id) { fl[id] = [areaF].concat(commonF) });
        GZ.NO_AREA.forEach(function (id) { fl[id] = commonF });
        rule.filter = fl;
    `,
    推荐: `js:
        setResult([]);
    `,
    一级: `js:
        let tid = String(MY_CATE || '1');
        if (!GZ.token) GZ.signUp();
        let data = GZ.call('/App/IndexList/indexList', {
            area: (MY_FL && MY_FL.area) ? MY_FL.area : '0',
            year: (MY_FL && MY_FL.year) ? MY_FL.year : '0',
            pageSize: '30',
            sort: (MY_FL && MY_FL.sort) ? MY_FL.sort : 'd_id',
            page: String(MY_PAGE),
            tid: tid
        });
        setResult(GZ.map(data && data.list, tid));
    `,
    二级: `js:
        VOD = {};
        try {
            if (!GZ.token) GZ.signUp();
            let vid = String(input).split('/')[0];
            let t = String(Math.floor(Date.now() / 1000));
            let q = GZ.call('/App/IndexPlay/playInfo', { token_id: GZ.token_id, vod_id: vid, mobile_time: t, token: GZ.token });
            if (q && q.vodInfo) {
                let v = q.vodInfo;
                let vod = {
                    vod_id: vid,
                    vod_name: v.vod_name || '',
                    vod_pic: v.vod_pic || '',
                    vod_year: v.vod_year || '',
                    vod_area: v.vod_area || '',
                    vod_actor: v.vod_actor || '',
                    vod_director: v.vod_director || '',
                    vod_content: (v.vod_use_content || '').trim(),
                    vod_play_from: '瓜子',
                    vod_play_url: ''
                };
                let j = GZ.call('/App/Resource/Vurl/show', { vurl_cloud_id: '2', vod_d_id: vid });
                let items = [];
                if (j && Array.isArray(j.list)) {
                    j.list.forEach(function (item, idx) {
                        if (!item || !item.play) return;
                        let names = [];
                        let params = [];
                        Object.keys(item.play).forEach(function (k) {
                            let val = item.play[k];
                            if (val && val.param) { names.push(k); params.push(val.param) }
                        });
                        if (params.length > 0) {
                            let nm = j.list.length === 1 ? (v.vod_name || '正片') : String(idx + 1);
                            items.push(nm + '$' + params[params.length - 1] + '||' + names.join('@'))
                        }
                    })
                }
                vod.vod_play_url = items.join('#');
                VOD = vod;
            }
        } catch (e) {
            log('[瓜子] 二级失败:' + e.message)
        }
    `,
    搜索: `js:
        if (!GZ.token) GZ.signUp();
        let data = GZ.call('/App/Index/findMoreVod', {
            keywords: KEY, order_val: '1', page: String(MY_PAGE)
        });
        let d = [];
        if (data && Array.isArray(data.list)) {
            data.list.forEach(function (it) {
                if (!it || !it.vod_id) return;
                d.push({
                    url: String(it.vod_id) + '/' + Number(it.vod_continu || 0),
                    title: it.vod_name || '',
                    img: it.vod_pic || '',
                    desc: GZ.remarks(it, it.t_id)
                })
            })
        }
        setResult(d);
    `,
    lazy: `js:
        try {
            let parts = String(input).split('||');
            if (parts.length < 2) {
                input = { parse: 0, jx: 0, url: '' };
            } else {
                if (!GZ.token) GZ.signUp();
                let p = {};
                parts[0].split('&').forEach(function (kv) {
                    if (kv.indexOf('=') > -1) {
                        let a = kv.split('=');
                        p[a[0]] = a.slice(1).join('=')
                    }
                });
                let res = parts[1].split('@').sort(function (a, b) { return parseInt(b) - parseInt(a) });
                p.resolution = res[0];
                let data = GZ.call('/App/Resource/VurlDetail/showOne', p);
                if (data && data.url) {
                    input = { parse: 0, jx: 0, url: data.url, header: JSON.stringify({ 'User-Agent': 'Lavf/57.83.100' }) };
                } else {
                    input = { parse: 0, jx: 0, url: '' };
                }
            }
        } catch (e) {
            log('[瓜子] lazy失败:' + e.message);
            input = { parse: 0, jx: 0, url: '' };
        }
    `
}
