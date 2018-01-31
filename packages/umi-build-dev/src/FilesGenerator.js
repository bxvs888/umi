import assert from 'assert';
import { join, relative } from 'path';
import { sync as mkdirp } from 'mkdirp';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import chokidar from 'chokidar';
import chalk from 'chalk';
import debounce from 'lodash.debounce';
import { applyPlugins } from 'umi-plugin';
import getRouteConfig from './getRouteConfig';
import { getRequest } from './requestCache';
import winPath from './winPath';
import normalizeEntry from './normalizeEntry';

const debug = require('debug')('umi:FilesGenerator');

export default class FilesGenerator {
  constructor(service) {
    this.service = service;
    this.routesContent = null;
    this.hasRebuildError = false;
  }

  generate(opts = {}) {
    const { paths } = this.service;
    const { absTmpDirPath, tmpDirPath } = paths;
    debug(`Mkdir tmp dir: ${tmpDirPath}`);
    mkdirp(absTmpDirPath);

    this.generateFiles();
    if (opts.onChange) opts.onChange();
  }

  createWatcher(path) {
    const watcher = chokidar.watch(path, {
      ignored: /(^|[\/\\])\../, // ignore .dotfiles
      ignoreInitial: true,
    });
    watcher.on(
      'all',
      debounce((event, path) => {
        debug(`${event} ${path}`);
        this.rebuild();
      }, 100),
    );
    return watcher;
  }

  watch() {
    const { paths } = this.service;
    this.watchers = [
      this.createWatcher(paths.absPagesPath),
      this.createWatcher(paths.absLayoutPath),
    ];
    process.on('SIGINT', () => {
      this.unwatch();
    });
  }

  unwatch() {
    if (this.watchers) {
      this.watchers.forEach(watcher => {
        watcher.close();
      });
    }
  }

  rebuild() {
    const { devServer } = this.service;
    try {
      // rebuild 时只生成 router.js
      this.generateRouterJS();
      if (this.onChange) this.onChange();
      if (this.hasRebuildError) {
        // 从出错中恢复时，刷新浏览器
        devServer.sockWrite(devServer.sockets, 'content-changed');
        this.hasRebuildError = false;
      }
    } catch (e) {
      // 向浏览器发送出错信息
      devServer.sockWrite(devServer.sockets, 'errors', [e.message]);

      this.hasRebuildError = true;
      this.routesContent = null; // why?
      debug(`Generate failed: ${e.message}`);
      debug(e);
      console.error(chalk.red(e.message));
    }
  }

  generateFiles() {
    const { paths, plugins, entryJSTpl, config } = this.service;
    applyPlugins(plugins, 'generateEntry', null, this.service);

    this.generateRouterJS();

    // Generate umi.js
    let entryContent = readFileSync(entryJSTpl || paths.defaultEntryTplPath);
    if (!config.disableServiceWorker) {
      entryContent = `${entryContent}
// Enable service worker
if (process.env.NODE_ENV === 'production') {
  require('./registerServiceWorker');
}
      `;
    }
    writeFileSync(paths.absLibraryJSPath, entryContent, 'utf-8');

    // Generate registerServiceWorker.js
    writeFileSync(
      paths.absRegisterSWJSPath,
      readFileSync(paths.defaultRegisterSWTplPath),
      'utf-8',
    );
  }

  generateRouterJS() {
    const { paths, config } = this.service;
    const { absRouterJSPath } = paths;
    const routes = getRouteConfig(paths, config);

    this.service.setRoutes(routes);

    const routesContent = this.getRouterJSContent();
    // 避免文件写入导致不必要的 webpack 编译
    if (this.routesContent !== routesContent) {
      writeFileSync(absRouterJSPath, routesContent, 'utf-8');
      this.routesContent = routesContent;
    }
  }

  getRouterJSContent() {
    const { routerTpl, paths, libraryName, plugins } = this.service;
    const routerTplPath = routerTpl || paths.defaultRouterTplPath;
    assert(
      existsSync(routerTplPath),
      `routerTpl don't exists: ${routerTplPath}`,
    );

    let tplContent = readFileSync(routerTplPath, 'utf-8');
    tplContent = applyPlugins(
      plugins,
      'preBuildRouterContent',
      tplContent,
      this.service,
    );

    tplContent = this.addLayout(tplContent);

    const routesContent = this.getRouterContent();
    return tplContent
      .replace('<%= codeForPlugin %>', '')
      .replace('<%= routeComponents %>', routesContent)
      .replace(/<%= libraryName %>/g, libraryName);
  }

  addLayout(tplContent) {
    const { paths } = this.service;
    if (existsSync(paths.absLayoutPath)) {
      return tplContent
        .replace(
          '<%= codeForPlugin %>',
          `
import Layout from '${paths.absLayoutPath}';
<%= codeForPlugin %>
        `.trim(),
        )
        .replace(
          '<%= routeComponents %>',
          `
<Layout><%= routeComponents %></Layout>
        `.trim(),
        );
    } else {
      return tplContent;
    }
  }

  getRouterContent() {
    const { routes, config, paths } = this.service;

    const routesByPath = routes.reduce((memo, { path, component }) => {
      memo[path] = component;
      return memo;
    }, {});

    const { loading } = config;
    let loadingOpts = '';
    if (loading) {
      loadingOpts = `loading: require('${join(paths.cwd, loading)}').default,`;
    }
    const routesContent = Object.keys(routesByPath).map(key => {
      const pageJSFile = winPath(relative(paths.tmpDirPath, routesByPath[key]));
      debug(`requested: ${JSON.stringify(getRequest())}`);
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev && process.env.COMPILE_ON_DEMAND !== 'none') {
        const component = getRequest()[key]
          ? `require('${pageJSFile}').default`
          : '() => <div>Compiling...</div>';
        return `    <Route exact path="${key}" component={${component}}></Route>`;
      } else {
        return `    <Route exact path="${key}" component={dynamic(() => import(/* webpackChunkName: '${normalizeEntry(
          routesByPath[key],
        )}' */'${pageJSFile}'), { ${loadingOpts} }) }></Route>`;
      }
    });

    return `
<Router history={window.g_history}>
  <Switch>
${routesContent.join('\n')}
  </Switch>
</Router>
    `.trim();
  }
}
