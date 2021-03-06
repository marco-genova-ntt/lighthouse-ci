"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultLighthouseManager = defaultLighthouseManager;
exports.launchChrome = launchChrome;

var _lighthouse = _interopRequireDefault(require("lighthouse"));

var _reportGenerator = _interopRequireDefault(require("lighthouse/lighthouse-core/report/report-generator"));

var ChromeLauncher = _interopRequireWildcard(require("chrome-launcher"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var utility = _interopRequireWildcard(require("./utility"));

var _awsS3Manager = require("./aws-s3-manager");

var _ramda = _interopRequireDefault(require("ramda"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Default lighthouse manager to write result on the file system.
 * Executes all managers.
 * 
 * @param {string} processID identifier of the analysis run
 * @param {string} page url web page
 * @param {*} results lighthouse results 
 * @param {Array} chainManagers chain managers to produce reports or dispatch events
 */
function defaultLighthouseManager(processID, page, results, chainManagers) {
  const html = _reportGenerator.default.generateReportHtml(results);

  const basePath = utility.getAbsolutePath(utility.string("REPORT_DIR", "./_reports"));
  const keyName = utility.fileNameEnvBased(`${processID}.html`);

  const filePath = _path.default.join(basePath, keyName);

  utility.mkDirByPathSync(basePath);

  _fs.default.writeFile(filePath, html, {
    encoding: 'utf-8'
  }, err => {
    if (err) throw err;

    if (utility.bool('AWS_S3_WRITING_ENABLED', false)) {
      const bucketName = utility.string('AWS_BUCKET_NAME');
      (0, _awsS3Manager.uploadFile)(bucketName, keyName, filePath);
    }
  });

  if (utility.bool("REPORT_EXTRA_STYLE", false)) {
    const devtoolshtml = html.replace(`"lh-root lh-vars"`, `"lh-root lh-vars lh-devtools"`).replace(`<title>Lighthouse Report`, `<title>DevTools Lighthouse Report`);

    const devtoolsFilePath = _path.default.join(basePath, utility.fileNameEnvBased(`${processID}.z.devtools.html`));

    _fs.default.writeFileSync(devtoolsFilePath, devtoolshtml, {
      encoding: 'utf-8'
    });
  }

  if (chainManagers && _ramda.default.length(chainManagers) > 0) {
    const executeManager = x => {
      _ramda.default.call(x, processID, page, results);
    };

    _ramda.default.forEach(executeManager, chainManagers);
  }
}
/**
 * Lauches Chrome and lighthouse analysis phase
 * 
 * use results.lhr for the JS-consumeable output: @see https://github.com/GoogleChrome/lighthouse/blob/master/types/lhr.d.ts
 * use results.report for the HTML/JSON/CSV output as a string
 * use results.artifacts for the trace/screenshots/other specific case you need (rarer)
 * chrome launcher docs: @see https://www.npmjs.com/package/chrome-launcher
 * config lighthouse ref: @see https://github.com/GoogleChrome/lighthouse/blob/888bd6dc9d927a734a8e20ea8a0248baa5b425ed/typings/externs.d.ts#L82-L119
 * lighthouse results: @see https://github.com/GoogleChrome/lighthouse/blob/master/docs/understanding-results.md
 * chrome configuration: @see https://github.com/GoogleChrome/lighthouse
 *  
 * @param {*} pages web pages to analyze
 * @param {Array} customManagers custom managers for result management
 * @param {*} config lighhouse configuration
 */


async function launchChrome(pages, customManagers, config = null) {
  let opts = JSON.parse(_fs.default.readFileSync(utility.getAbsolutePath("./chrome_config.json"), 'utf8'));
  let chrome = await ChromeLauncher.launch({
    chromeFlags: opts.chromeFlags
  });
  console.info('chrome process id:', chrome.pid);
  opts.port = chrome.port;

  for (const page of pages) {
    const processID = utility.getProgressiveCounter();
    let results = await (0, _lighthouse.default)(page, opts, config);
    defaultLighthouseManager(processID, page, results.lhr, customManagers);
  }

  chrome.kill();
}