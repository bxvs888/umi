# af-webpack

Unique webpack wrapper for ant financial.

## Why af-webpack ?

TODO

## CLIs based on af-webpack

* [umi](https://github.com/umijs/umi)
* [roadhog@2](https://github.com/sorrycc/roadhog/tree/2.0)

## Configuration

See [./Configuration.md](./Configuration.md).

## API

### af-webpack/getConfig

Get webpack config with opts.

```js
const webpackConfig = getConfig(opts);
// use webpackConfig to dev or build
```

### af-webpack/dev

Run webpack-dev-server more gracefully with [react-dev-utils](https://github.com/facebookincubator/create-react-app/tree/master/packages/react-dev-utils).

```js
dev({
  webpackConfig,
  extraMiddlewares,
  beforeServer,
  afterServer,
  onCompileDone,
  onCompileInvalid,
  proxy,
});
```

webpackConfig is required, other optional.

Options:

* `webpackConfig`: The webpack config 
* `extraMiddlewares`: Extra middlewares for webpack-dev-server, based on express
* `beforeServer`: The function to execute before dev server is started
* `afterServer`: The function to execute after dev server is started
* `onCompileDone`
* `onCompileInvalid`
* `proxy`: The proxy config which will pass through to webpack-dev-server

### af-webpack/build

Run webpack compilation.

```js
build({
  webpackConfig,
  success,
});
```

webpackConfig is required, other optional.

Options:

* `webpackConfig`: the webpack config 
* `success`: the function to execute after build is done successfully

### af-webpack/react-dev-utils

The APIs related to react-dev-utils.

* webpackHotDevClientPath：the real path of webpackHotDevClient

### af-webpack/webpack

The webpack, useful to register extra webpack plugins.

### af-webpack/registerBabel

Register babel for extra files.

## LICENSE

MIT

## CHANGELOG

1. 修改html配置可以支持数组（多页面输入和输出，具体参考html-webpack-plugin）
```js
{
"html": [
    {
    inject: false,
    template: require('html-webpack-template'),
    appMountId: "root",
    scripts: [
      "http://res.wx.qq.com/open/js/jweixin-1.2.0.js"
    ],
    lang: "zh-CN",
    mobile: true,
    title: 'title',
    hash: false,
    links: [
      {
        href: IMG_BASE + 'assets/favicon.ico',
        rel: 'shortcut icon'
      }
    ],
    filename: DEBUG ? 'index.html' : "index.ftl",
    bodyHtmlSnippet: '',
    "window": windowVars,
    chunks: ['index', 'common'],
    minify: {
      collapseWhitespace: true,
      conservativeCollapse: true,
      preserveLineBreaks: true,
      removeComments: true
      // more options:
      // https://github.com/kangax/html-minifier#options-quick-reference
    },
    {
      inject: true,
      template: 'src/demo.ejs',
      hash: false,
      favicon: 'public/favicon.ico',
      filename: 'demo.html',
      chunks: ['demo', 'common'],
    }
  ]
}
```
1. doneCallback 参数
 
    用于编译完成后的文件复制等操作
    
1. assetsPath 参数
 
    配置各类型文件目录结构，用于归类
    资源输出路径，默认：
    图片资源：assets/img
    css文件：assets/css
    js文件：assets/js
    其他文件: assets/media
    
  ```js
  {
    "assetsPath": {
        "media": 'assets/media/',
        "js": 'assets/js/',
        "css": 'assets/css/',
        "img": 'assets/images/',
      },
  }
  ```
