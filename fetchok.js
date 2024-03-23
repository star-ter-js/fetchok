((name, context, definition) => {
  if (typeof module !== 'undefined' && module.exports) module.exports = definition();
  else context[name] = definition();
})('fetchok', this, () => {
  //https://www.freecodecamp.org/news/javascript-fetch-api-for-beginners/
  //fetch config keys: method, headers, body, mode, credentials, cache, redirect, referrer, integrity
  //fetch methods: POST, PUT, DELETE, PATCH

  //const { fetch: orfetch } = window;
  function fetchok( /*url [, config] */) { return fetch(...arguments).then(checkFetchResponse) };
  Object.assign(fetchok, {
    async getAllJSON(urls = [], config = {}) {
      const {
        settle = true,
        split = false,
        blockLength = 10, //10
        delay = 200, //200
      } = config;
      const promises = urls.map(url => this.getJSON(url, config));

      //NO splitting code
      if (!split || urls.length <= blockLength) return (settle) ? Promise.allSettled(promises).then(checkSettled) : Promise.all(promises);

      //splitting code
      const PromiseAll = settle ? ((args) => Promise.allSettled(args)) : ((args) => Promise.all(args));
      const splittedPromises = _splitArray(promises, blockLength);
      console.log(delay);
      let out = [];
      for (_promises of splittedPromises) { setTimeout(out.push(...(await PromiseAll(_promises))), delay) }
      return settle ? checkSettled(out) : out;
    }, //getAllJSON
    getJSON() { return this['get'](...arguments) },
    getText(...args) {
      let [url, opt = {}] = args;
      Object.assign(opt, { forceText: true });
      return this['get'](url, opt);
    }, //getText
    async get(...args) {
      let [url, opt = {}] = args;
      let params, transformResponse;
      if (opt && '[object Object]' === Object.prototype.toString.call(opt)) ({
        forceText = false,
        params,
        transformResponse,
      } = opt);
      'forceText,params,transformResponse'.split(',').forEach(key => (delete opt[key]));

      /*
      //sanitize url
      url = url.trim().replace(/[\?\/]+$/, '');

      // add params to url
      if (params && '[object Object]' === Object.prototype.toString.call(params)) params = queryStringFromObjects(params);
      if (params) url += url.includes('?') ? `&${params}` : `?${params}`;
      //console.log('URL', url);
      */
      url = this.buildURL(url, { params });

      // await the resp
      let resp = (!forceText) ? (await this(url, opt).then(mimefyResponse)) : (await this(url, opt).then(r => r.text()));

      //transform the response
      if (transformResponse && '[object Function]' === Object.prototype.toString.call(transformResponse)) resp = transformResponse(resp);

      return resp;
    }, //get
    delete(...args) {
      let [url, config = {}] = args;
      Object.assign(config, { method: 'DELETE' });

      return fetchok(url, config).then(mimefyResponse);
    }, //delete
    qs() { return queryStringFromObjects(...arguments) },
    buildURL() { return buildURL(...arguments) },
  }); //assign
  ['post', 'put', 'patch'].forEach(method => {
    fetchok[method] = function (...args) {
      method = method.toUpperCase();
      let [url, config] = args;
      let { body, data } = config;
      body = data || body;

      if ('[object Object]' === Object.prototype.toString.call(body)) body = JSON.stringify(body);

      Object.assign(config, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      return this(url, config).then(mimefyResponse);
    };
  }); //post, put, patch

  return fetchok;

  // function definition
  function buildURL(origin = '', {
    path = null,
    params = null,
    suffix = '',
  } = {}) {
    if (!origin) throw new Error('invalid origin');

    let url = origin.trim().replace(/[\?\/]+$/, '');
    if (path) url += `/${path}`;
    if (params && '[object Object]' === Object.prototype.toString.call(params)) params = queryStringFromObjects(params);
    if (params) url += url.includes('?') ? `&${params}` : `?${params}`;
    if (suffix && 'string' === typeof suffix) url += suffix;

    return url;
  } //buildURL
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
  function queryStringFromObjects(...args) {
    //console.log(args);
    if (0 === args.length) return '';

    if (1 === args.length && Array.isArray(args[0])) args = args[0];
    //console.log(args);
    const obj = Object.assign({}, ...args);
    //console.log(obj);

    return Object.entries(obj).map(([key, val]) => encodeURI(`${key}=${val}`)).join('&').replace(/null|undefined/g, '');
  } // queryStringFromObjects
  function checkSettled(resps) {
    return resps.map(resp => ("fulfilled" === resp.status) ? resp.value : null)
  } // checkSettled
  function _splitArray(arr = [], block = 10) {
    const arrayLength = arr.length;
    if (arrayLength === 0) return arr;

    let blocks = Math.floor(arrayLength / block);
    //console.log('blocks:', blocks);
    let i;
    let out = [];

    for (i = 1; i <= blocks; i++) out.push(arr.slice((i - 1) * block, i * block));
    if ((block * blocks) < arr.length) out.push(arr.slice(block * blocks, arr.length));

    return out;
  } // _splitArray
  function mimefyResponse(resp) {
    if (undefined === resp) return Promise.reject('responce server is undefined');
    if (null === resp) console.warn('server returns null value');

    const contentType = resp.headers.get('content-type').trim()
      .replace(/;\s+/, ';').replace(/;$/, '');
    const mime = contentType.match(/^(.+);/)[1].trim();
    //console.log(mime);
    let out;
    switch (mime) {
      case 'application/json':
        out = resp.json();
        break;
      case 'text/html':
      case 'text/plain':
        out = resp.text();
        break;
      default:
        out = resp;
    } // switch

    return out;
  } // mimefyResponse
  async function checkFetchResponse(resp) {
    // error 400: Bad Request; 404: Page not found; 500: Internal Server Error
    if (!resp.ok && [400, 401, 404, 500].includes(resp.status)) return Promise.reject(resp);
    return resp;
  } // checkFetchResponse
}); /* module */

(async (execute = false) => { /*TESTING CODE */
  if (!execute) return;

  //console.log(Object.prototype.toString.call(function (){}));

  //console.log(fetchok.getJSON);
  //console.log(new URLSearchParams({ foo: "1", bar: "2 5" }).toString());
  const endpoint = 'https://jsonplaceholder.typicode.com';
  const urls = '1,2,4,5,11'.split(',').map(id => `${endpoint}/users/${id}`);
  const data_post = { name: 'Nathan Sebhastian', email: 'ns@mail.com' };
  const data_put = { name: 'Nathan Sebhastian', email: 'nathan@mail.com' };
  const data_patch = { name: 'Nathan Sebhastian', username: 'nsebhastian' };

  try {
    console.log(fetchok.buildURL((endpoint + '/////????/'), { params: data_patch, suffix: '.json' }));
    fetchok.getAllJSON(urls).then(resp => console.log('getAllJSON:', resp));
    //fetchok.getAllJSON(urls).then(r => console.log('getAllJSON:', r.map((it, i) => ({ 'url': urls[i], 'resp': it }))));

    ///*
    console.log(fetchok.qs({ foo: "1", bar: "2 5" }));
    fetchok.getText(`${endpoint}/users/9`).then(r => console.log('getText:', r));
    fetchok.getJSON(`${endpoint}/users/3`, { params: { foo: "1", bar: "2 5" }, transformResponse: r => JSON.stringify(r) }).then(r => console.log('getJSON:', r)); // retrive a resource
    fetchok.delete(`${endpoint}/users/1`).then(r => console.log('delete:', r));
    fetchok.patch(`${endpoint}/users/1`, { data: data_patch }).then((r) => console.log('patch:', r)); // update a resource
    fetchok.put(`${endpoint}/users/1`, { data: data_put }).then(r => console.log('put:', r)); //create a new resource or update an existing one
    fetchok.post(`${endpoint}/users`, { data: data_post }).then(r => console.log('post:', r)); //create a new resource
    fetchok.get(`${endpoint}/users/3`).then(r => console.log('get:', r)); // retrive a resource
    fetchok(`${endpoint}/users/10`).then(r => console.log('promise:', r));
    //*/
  } catch (error) {
    console.error(error);
  }
})();
