import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __pathDirname } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a2, b) => (typeof require !== "undefined" ? require : a2)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/isexe/windows.js
var require_windows = __commonJS({
  "node_modules/isexe/windows.js"(exports, module) {
    module.exports = isexe;
    isexe.sync = sync;
    var fs7 = __require("fs");
    function checkPathExt(path13, options) {
      var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
      if (!pathext) {
        return true;
      }
      pathext = pathext.split(";");
      if (pathext.indexOf("") !== -1) {
        return true;
      }
      for (var i2 = 0; i2 < pathext.length; i2++) {
        var p = pathext[i2].toLowerCase();
        if (p && path13.substr(-p.length).toLowerCase() === p) {
          return true;
        }
      }
      return false;
    }
    function checkStat(stat, path13, options) {
      if (!stat.isSymbolicLink() && !stat.isFile()) {
        return false;
      }
      return checkPathExt(path13, options);
    }
    function isexe(path13, options, cb) {
      fs7.stat(path13, function(er, stat) {
        cb(er, er ? false : checkStat(stat, path13, options));
      });
    }
    function sync(path13, options) {
      return checkStat(fs7.statSync(path13), path13, options);
    }
  }
});

// node_modules/isexe/mode.js
var require_mode = __commonJS({
  "node_modules/isexe/mode.js"(exports, module) {
    module.exports = isexe;
    isexe.sync = sync;
    var fs7 = __require("fs");
    function isexe(path13, options, cb) {
      fs7.stat(path13, function(er, stat) {
        cb(er, er ? false : checkStat(stat, options));
      });
    }
    function sync(path13, options) {
      return checkStat(fs7.statSync(path13), options);
    }
    function checkStat(stat, options) {
      return stat.isFile() && checkMode(stat, options);
    }
    function checkMode(stat, options) {
      var mod = stat.mode;
      var uid = stat.uid;
      var gid = stat.gid;
      var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
      var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
      var u2 = parseInt("100", 8);
      var g = parseInt("010", 8);
      var o2 = parseInt("001", 8);
      var ug = u2 | g;
      var ret = mod & o2 || mod & g && gid === myGid || mod & u2 && uid === myUid || mod & ug && myUid === 0;
      return ret;
    }
  }
});

// node_modules/isexe/index.js
var require_isexe = __commonJS({
  "node_modules/isexe/index.js"(exports, module) {
    var fs7 = __require("fs");
    var core;
    if (process.platform === "win32" || global.TESTING_WINDOWS) {
      core = require_windows();
    } else {
      core = require_mode();
    }
    module.exports = isexe;
    isexe.sync = sync;
    function isexe(path13, options, cb) {
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (!cb) {
        if (typeof Promise !== "function") {
          throw new TypeError("callback not provided");
        }
        return new Promise(function(resolve, reject) {
          isexe(path13, options || {}, function(er, is) {
            if (er) {
              reject(er);
            } else {
              resolve(is);
            }
          });
        });
      }
      core(path13, options || {}, function(er, is) {
        if (er) {
          if (er.code === "EACCES" || options && options.ignoreErrors) {
            er = null;
            is = false;
          }
        }
        cb(er, is);
      });
    }
    function sync(path13, options) {
      try {
        return core.sync(path13, options || {});
      } catch (er) {
        if (options && options.ignoreErrors || er.code === "EACCES") {
          return false;
        } else {
          throw er;
        }
      }
    }
  }
});

// node_modules/which/which.js
var require_which = __commonJS({
  "node_modules/which/which.js"(exports, module) {
    var isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
    var path13 = __require("path");
    var COLON = isWindows ? ";" : ":";
    var isexe = require_isexe();
    var getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
    var getPathInfo = (cmd, opt) => {
      const colon = opt.colon || COLON;
      const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [
        // windows always checks the cwd first
        ...isWindows ? [process.cwd()] : [],
        ...(opt.path || process.env.PATH || /* istanbul ignore next: very unusual */
        "").split(colon)
      ];
      const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
      const pathExt = isWindows ? pathExtExe.split(colon) : [""];
      if (isWindows) {
        if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
          pathExt.unshift("");
      }
      return {
        pathEnv,
        pathExt,
        pathExtExe
      };
    };
    var which = (cmd, opt, cb) => {
      if (typeof opt === "function") {
        cb = opt;
        opt = {};
      }
      if (!opt)
        opt = {};
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      const step = (i2) => new Promise((resolve, reject) => {
        if (i2 === pathEnv.length)
          return opt.all && found.length ? resolve(found) : reject(getNotFoundError(cmd));
        const ppRaw = pathEnv[i2];
        const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        const pCmd = path13.join(pathPart, cmd);
        const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        resolve(subStep(p, i2, 0));
      });
      const subStep = (p, i2, ii) => new Promise((resolve, reject) => {
        if (ii === pathExt.length)
          return resolve(step(i2 + 1));
        const ext = pathExt[ii];
        isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
          if (!er && is) {
            if (opt.all)
              found.push(p + ext);
            else
              return resolve(p + ext);
          }
          return resolve(subStep(p, i2, ii + 1));
        });
      });
      return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
    };
    var whichSync = (cmd, opt) => {
      opt = opt || {};
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      for (let i2 = 0; i2 < pathEnv.length; i2++) {
        const ppRaw = pathEnv[i2];
        const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        const pCmd = path13.join(pathPart, cmd);
        const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        for (let j = 0; j < pathExt.length; j++) {
          const cur = p + pathExt[j];
          try {
            const is = isexe.sync(cur, { pathExt: pathExtExe });
            if (is) {
              if (opt.all)
                found.push(cur);
              else
                return cur;
            }
          } catch (ex) {
          }
        }
      }
      if (opt.all && found.length)
        return found;
      if (opt.nothrow)
        return null;
      throw getNotFoundError(cmd);
    };
    module.exports = which;
    which.sync = whichSync;
  }
});

// node_modules/path-key/index.js
var require_path_key = __commonJS({
  "node_modules/path-key/index.js"(exports, module) {
    "use strict";
    var pathKey2 = (options = {}) => {
      const environment = options.env || process.env;
      const platform2 = options.platform || process.platform;
      if (platform2 !== "win32") {
        return "PATH";
      }
      return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
    };
    module.exports = pathKey2;
    module.exports.default = pathKey2;
  }
});

// node_modules/cross-spawn/lib/util/resolveCommand.js
var require_resolveCommand = __commonJS({
  "node_modules/cross-spawn/lib/util/resolveCommand.js"(exports, module) {
    "use strict";
    var path13 = __require("path");
    var which = require_which();
    var getPathKey = require_path_key();
    function resolveCommandAttempt(parsed, withoutPathExt) {
      const env = parsed.options.env || process.env;
      const cwd = process.cwd();
      const hasCustomCwd = parsed.options.cwd != null;
      const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
      if (shouldSwitchCwd) {
        try {
          process.chdir(parsed.options.cwd);
        } catch (err) {
        }
      }
      let resolved;
      try {
        resolved = which.sync(parsed.command, {
          path: env[getPathKey({ env })],
          pathExt: withoutPathExt ? path13.delimiter : void 0
        });
      } catch (e) {
      } finally {
        if (shouldSwitchCwd) {
          process.chdir(cwd);
        }
      }
      if (resolved) {
        resolved = path13.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
      }
      return resolved;
    }
    function resolveCommand(parsed) {
      return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
    }
    module.exports = resolveCommand;
  }
});

// node_modules/cross-spawn/lib/util/escape.js
var require_escape = __commonJS({
  "node_modules/cross-spawn/lib/util/escape.js"(exports, module) {
    "use strict";
    var metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
    function escapeCommand(arg) {
      arg = arg.replace(metaCharsRegExp, "^$1");
      return arg;
    }
    function escapeArgument(arg, doubleEscapeMetaChars) {
      arg = `${arg}`;
      arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
      arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
      arg = `"${arg}"`;
      arg = arg.replace(metaCharsRegExp, "^$1");
      if (doubleEscapeMetaChars) {
        arg = arg.replace(metaCharsRegExp, "^$1");
      }
      return arg;
    }
    module.exports.command = escapeCommand;
    module.exports.argument = escapeArgument;
  }
});

// node_modules/shebang-regex/index.js
var require_shebang_regex = __commonJS({
  "node_modules/shebang-regex/index.js"(exports, module) {
    "use strict";
    module.exports = /^#!(.*)/;
  }
});

// node_modules/shebang-command/index.js
var require_shebang_command = __commonJS({
  "node_modules/shebang-command/index.js"(exports, module) {
    "use strict";
    var shebangRegex = require_shebang_regex();
    module.exports = (string = "") => {
      const match = string.match(shebangRegex);
      if (!match) {
        return null;
      }
      const [path13, argument] = match[0].replace(/#! ?/, "").split(" ");
      const binary = path13.split("/").pop();
      if (binary === "env") {
        return argument;
      }
      return argument ? `${binary} ${argument}` : binary;
    };
  }
});

// node_modules/cross-spawn/lib/util/readShebang.js
var require_readShebang = __commonJS({
  "node_modules/cross-spawn/lib/util/readShebang.js"(exports, module) {
    "use strict";
    var fs7 = __require("fs");
    var shebangCommand = require_shebang_command();
    function readShebang(command) {
      const size = 150;
      const buffer = Buffer.alloc(size);
      let fd;
      try {
        fd = fs7.openSync(command, "r");
        fs7.readSync(fd, buffer, 0, size, 0);
        fs7.closeSync(fd);
      } catch (e) {
      }
      return shebangCommand(buffer.toString());
    }
    module.exports = readShebang;
  }
});

// node_modules/cross-spawn/lib/parse.js
var require_parse = __commonJS({
  "node_modules/cross-spawn/lib/parse.js"(exports, module) {
    "use strict";
    var path13 = __require("path");
    var resolveCommand = require_resolveCommand();
    var escape = require_escape();
    var readShebang = require_readShebang();
    var isWin = process.platform === "win32";
    var isExecutableRegExp = /\.(?:com|exe)$/i;
    var isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
    function detectShebang(parsed) {
      parsed.file = resolveCommand(parsed);
      const shebang = parsed.file && readShebang(parsed.file);
      if (shebang) {
        parsed.args.unshift(parsed.file);
        parsed.command = shebang;
        return resolveCommand(parsed);
      }
      return parsed.file;
    }
    function parseNonShell(parsed) {
      if (!isWin) {
        return parsed;
      }
      const commandFile = detectShebang(parsed);
      const needsShell = !isExecutableRegExp.test(commandFile);
      if (parsed.options.forceShell || needsShell) {
        const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
        parsed.command = path13.normalize(parsed.command);
        parsed.command = escape.command(parsed.command);
        parsed.args = parsed.args.map((arg) => escape.argument(arg, needsDoubleEscapeMetaChars));
        const shellCommand = [parsed.command].concat(parsed.args).join(" ");
        parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`];
        parsed.command = process.env.comspec || "cmd.exe";
        parsed.options.windowsVerbatimArguments = true;
      }
      return parsed;
    }
    function parse(command, args, options) {
      if (args && !Array.isArray(args)) {
        options = args;
        args = null;
      }
      args = args ? args.slice(0) : [];
      options = Object.assign({}, options);
      const parsed = {
        command,
        args,
        options,
        file: void 0,
        original: {
          command,
          args
        }
      };
      return options.shell ? parsed : parseNonShell(parsed);
    }
    module.exports = parse;
  }
});

// node_modules/cross-spawn/lib/enoent.js
var require_enoent = __commonJS({
  "node_modules/cross-spawn/lib/enoent.js"(exports, module) {
    "use strict";
    var isWin = process.platform === "win32";
    function notFoundError(original, syscall) {
      return Object.assign(new Error(`${syscall} ${original.command} ENOENT`), {
        code: "ENOENT",
        errno: "ENOENT",
        syscall: `${syscall} ${original.command}`,
        path: original.command,
        spawnargs: original.args
      });
    }
    function hookChildProcess(cp, parsed) {
      if (!isWin) {
        return;
      }
      const originalEmit = cp.emit;
      cp.emit = function(name, arg1) {
        if (name === "exit") {
          const err = verifyENOENT(arg1, parsed);
          if (err) {
            return originalEmit.call(cp, "error", err);
          }
        }
        return originalEmit.apply(cp, arguments);
      };
    }
    function verifyENOENT(status, parsed) {
      if (isWin && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawn");
      }
      return null;
    }
    function verifyENOENTSync(status, parsed) {
      if (isWin && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawnSync");
      }
      return null;
    }
    module.exports = {
      hookChildProcess,
      verifyENOENT,
      verifyENOENTSync,
      notFoundError
    };
  }
});

// node_modules/cross-spawn/index.js
var require_cross_spawn = __commonJS({
  "node_modules/cross-spawn/index.js"(exports, module) {
    "use strict";
    var cp = __require("child_process");
    var parse = require_parse();
    var enoent = require_enoent();
    function spawn2(command, args, options) {
      const parsed = parse(command, args, options);
      const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
      enoent.hookChildProcess(spawned, parsed);
      return spawned;
    }
    function spawnSync2(command, args, options) {
      const parsed = parse(command, args, options);
      const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
      result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
      return result;
    }
    module.exports = spawn2;
    module.exports.spawn = spawn2;
    module.exports.sync = spawnSync2;
    module.exports._parse = parse;
    module.exports._enoent = enoent;
  }
});

// src/safety.js
import Module from "node:module";
var ERR = "PolinRider safety:";
function makeBlocked(what) {
  return function blocked() {
    throw new EvalError(`${ERR} dynamic code generation via ${what} is disabled`);
  };
}
function lockGlobal(name, value) {
  try {
    Object.defineProperty(globalThis, name, {
      value,
      configurable: false,
      writable: false,
      enumerable: false
    });
    return true;
  } catch {
    return false;
  }
}
lockGlobal("eval", makeBlocked("eval"));
var RealFunction = Function;
var BlockedFunction = makeBlocked("Function");
try {
  Object.defineProperty(BlockedFunction, "prototype", {
    value: RealFunction.prototype,
    writable: false
  });
} catch {
}
lockGlobal("Function", BlockedFunction);
function blockConstructorOf(sample) {
  try {
    const proto = Object.getPrototypeOf(sample);
    Object.defineProperty(proto, "constructor", {
      value: BlockedFunction,
      configurable: true,
      writable: true
    });
  } catch {
  }
}
blockConstructorOf(function() {
});
blockConstructorOf(async function() {
});
blockConstructorOf(function* () {
});
blockConstructorOf(async function* () {
});
var originalLoad = Module._load;
Module._load = function patchedLoad(request, ...rest) {
  if (request === "vm" || request === "node:vm") {
    throw new Error(`${ERR} the node:vm module is blocked`);
  }
  return originalLoad.call(this, request, ...rest);
};
var blockBinding = function blockedBinding() {
  throw new Error(`${ERR} process.binding is blocked`);
};
for (const key of ["binding", "_linkedBinding"]) {
  try {
    Object.defineProperty(process, key, {
      value: blockBinding,
      configurable: false,
      writable: false
    });
  } catch {
  }
}

// src/ci.js
import fs6 from "node:fs";
import fsp from "node:fs/promises";
import path12 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";

// src/scanner.js
import fs3 from "node:fs/promises";
import { existsSync } from "node:fs";
import path3 from "node:path";

// src/signatures.js
var JS_VARIANTS = [
  {
    id: "original",
    label: "PolinRider payload (original variant)",
    confidence: "high",
    signature: "rmcej%otb%",
    // appears as ("rmcej%otb%",2857687)
    decoder: "_$_1e42",
    seeds: ["2857687", "2667686"]
  },
  {
    id: "rotated",
    label: "PolinRider payload (rotated variant)",
    confidence: "high",
    signature: "Cot%3t=shtP",
    decoder: "MDy",
    seeds: ["1111436", "3896884"]
  }
];
var JS_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
var C2_HOSTS = [
  "default-configuration.vercel.app",
  "vscode-settings-bootstrap.vercel.app",
  "vscode-settings-config.vercel.app",
  "vscode-bootstrapper.vercel.app",
  "vscode-load-config.vercel.app",
  "260120.vercel.app"
];
var C2_HOST_RES = [
  /vscode-settings-[a-z0-9-]*\.vercel\.app/i,
  /vscode-[a-z0-9-]*(?:config|bootstrap|loader?)[a-z0-9-]*\.vercel\.app/i
];
var NET_FETCH_RES = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bInvoke-WebRequest\b/i,
  /\biwr\b/i,
  /\bNew-Object\s+Net\.WebClient/i,
  /\bDownloadString\b/i
];
var PIPE_SHELL_RES = [
  /\|\s*(?:bash|sh|zsh|dash)\b/i,
  /\b(?:bash|sh|zsh|dash)\s+-c\b/i,
  /\bIEX\b/i,
  // PowerShell Invoke-Expression
  /\bInvoke-Expression\b/i,
  /\bnode\b\s+-e\b/i,
  /\beval\b/i
];
var ANY_URL_RE = /https?:\/\/[^\s"'`)]+/i;
var INTERPRETER_RE = /\b(?:node|deno|bun|python3?|ruby|php|osascript|bash|sh|zsh|dash|pwsh|powershell|cmd)\b/i;
var ASSET_EXEC_RE = /(?:public[\\/]+fonts|[\\/]fonts[\\/]|\bstatic[\\/]|\bassets[\\/])|\.(?:woff2?|ttf|eot|otf)\b/i;
var FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf", ".eot", ".ttc"];
var FONT_MAGIC = {
  woff2: [119, 79, 70, 50],
  // wOF2
  woff: [119, 79, 70, 70],
  // wOFF
  otf: [79, 84, 84, 79],
  // OTTO
  ttf: [0, 1, 0, 0],
  ttc: [116, 116, 99, 102],
  // ttcf
  true: [116, 114, 117, 101],
  // 'true' (legacy TrueType)
  eot: null
  // EOT has no single stable magic; treat presence-only
};
var FONT_BADNESS_RES = [
  /eval\s*\(/,
  /global\s*\[/,
  /require\s*\(/,
  /child_process/,
  /process\.(?:env|binding)/,
  /function\s*\(/,
  /\bnode\b\s+-e\b/
];
var FA_FONT_NAME_RE = /^fa-(?:brands|solid|regular|light|thin|duotone)-\d+\.(?:eot|svg|ttf|otf|woff2?)$/i;
var FONT_DROP_SIDECARS = ["readme.md"];
var FONT_DIRS = ["public/fonts", "static", "static/fonts", "assets/fonts", "src/assets/fonts"];
var FONT_REF_EXTENSIONS = [
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".styl",
  ".html",
  ".htm",
  ".vue",
  ".svelte",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json"
];
var IMPOSTOR_DEPS = [
  "tailwindcss-style-animate",
  "tailwind-mainanimation",
  "tailwind-autoanimation"
];
var SUSPICIOUS_LIFECYCLE_SCRIPTS = ["preinstall", "install", "postinstall"];
var ARTIFACT_FILES = [
  "temp_auto_push.bat",
  "temp_interactive_push.bat",
  "config.bat",
  "branch_structure.json"
];
var GITIGNORE_INJECTED = [
  "config.bat",
  "temp_auto_push.bat",
  "temp_interactive_push.bat",
  "branch_structure.json"
];
var ENV_PATTERNS = [
  ".env",
  ".env.local",
  ".env.*.local",
  ".env.production",
  ".env.development"
];
function isC2Host(text) {
  if (typeof text !== "string") return false;
  if (C2_HOSTS.some((h2) => text.includes(h2))) return true;
  return C2_HOST_RES.some((re) => re.test(text));
}
function isFetchToShell(text) {
  if (typeof text !== "string") return false;
  const fetches = NET_FETCH_RES.some((re) => re.test(text)) || ANY_URL_RE.test(text);
  const pipes = PIPE_SHELL_RES.some((re) => re.test(text));
  return fetches && pipes;
}
function commandExecutesAsset(text) {
  if (typeof text !== "string") return false;
  return INTERPRETER_RE.test(text) && ASSET_EXEC_RE.test(text);
}
function isFaFamilyName(basename) {
  return typeof basename === "string" && FA_FONT_NAME_RE.test(basename);
}
function isFontDropSidecar(basename) {
  return typeof basename === "string" && FONT_DROP_SIDECARS.includes(basename.toLowerCase());
}
var RISKY_MODULES = /* @__PURE__ */ new Map([
  ["child_process", { weight: 3, group: "proc", label: "spawns OS subprocesses" }],
  ["http", { weight: 3, group: "net", label: "raw HTTP client" }],
  ["https", { weight: 3, group: "net", label: "raw HTTPS client" }],
  ["net", { weight: 3, group: "net", label: "raw TCP sockets" }],
  ["tls", { weight: 3, group: "net", label: "raw TLS sockets" }],
  ["dgram", { weight: 3, group: "net", label: "UDP sockets" }],
  ["dns", { weight: 3, group: "net", label: "DNS resolution" }],
  ["vm", { weight: 3, group: "dyncode", label: "runs code in a VM context" }],
  ["worker_threads", { weight: 2, group: "proc", label: "spawns worker threads" }],
  ["zlib", { weight: 2, group: "obf", label: "decompresses embedded blobs" }]
]);
var CAPABILITY_RULES = [
  // ── weight 3: primitives ──
  {
    id: "proc.exec",
    weight: 3,
    group: "proc",
    view: "code",
    label: "executes a shell command",
    re: /\b(?:execSync|execFileSync|execFile|spawnSync|spawn|fork)\s*\(/
  },
  {
    id: "net.request",
    weight: 3,
    group: "net",
    view: "code",
    label: "issues a raw outbound request",
    re: /\.\s*(?:request|createConnection)\s*\(|\bnew\s+[A-Za-z_$][\w$]*\s*\.\s*Agent\b/
  },
  {
    id: "code.dynamic",
    weight: 3,
    group: "dyncode",
    view: "code",
    label: "generates code from a string",
    re: /\beval\s*\(|\bnew\s+Function\s*\(/
  },
  {
    id: "code.vm",
    weight: 3,
    group: "dyncode",
    view: "code",
    label: "compiles code via the vm module",
    re: /\b(?:runInNewContext|runInThisContext|compileFunction)\s*\(/
  },
  // ── weight 3: injector markers (the highest-precision rules available) ──
  //
  // Legitimate code has no reason to stash require/module on the global object.
  // Polyfills do `global.fetch = …`; they never do `global.r = require`.
  {
    id: "marker.global-require",
    weight: 3,
    group: "marker",
    view: "code",
    label: "stashes require/module on the global object",
    re: /\bglobal(?:This)?\s*\.\s*[A-Za-z_$][\w$]{0,3}\s*=\s*(?:require|module)\b/
  },
  // ── weight 2: drainer / obfuscation specifics ──
  {
    id: "marker.global-beacon",
    weight: 2,
    group: "marker",
    view: "code",
    label: "assigns a short opaque id to a global",
    // Matched on the code view, where a literal keeps its quotes but its contents
    // are blanked to spaces — so the shape still matches without the value leaking.
    re: /\bglobal\s*(?:\.\s*[A-Za-z_$][\w$]{0,3}|\[\s*(['"])[^'"]{1,12}\1\s*\])\s*=\s*(['"])[^'"]{1,24}\2/
  },
  {
    id: "marker.campaign-id",
    weight: 2,
    group: "marker",
    view: "literals",
    wholeLiteral: true,
    label: "campaign identifier string",
    re: /^[A-Z]?\d{1,2}-\d{3,6}-\d{1,3}$/
  },
  {
    id: "obf.string-array",
    weight: 2,
    group: "obf",
    view: "code",
    label: "string-array obfuscator table",
    re: /\bvar\s+_\$?_?[A-Za-z0-9$]{2,}\s*=\s*\[|\b_0x[0-9a-f]{4,}\s*=\s*\[/
  },
  {
    id: "obf.zlib-call",
    weight: 2,
    group: "obf",
    view: "code",
    label: "decompresses a response body",
    re: /\bcreate(?:Gunzip|Unzip|Inflate(?:Raw)?|BrotliDecompress)\s*\(|\b(?:gunzip|inflate|brotliDecompress)(?:Sync)?\s*\(/
  },
  {
    id: "chain.wallet",
    weight: 2,
    group: "chain",
    view: "literals",
    label: "embeds a 20-byte hex address (wallet)",
    re: /(?:^|[^0-9a-fA-Fx])0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/
  },
  {
    id: "chain.rpc-method",
    weight: 2,
    group: "chain",
    view: "literals",
    label: "calls Ethereum JSON-RPC methods",
    re: /\beth_[a-z][a-zA-Z]{3,}\b/
  },
  {
    id: "chain.jsonrpc",
    weight: 2,
    group: "chain",
    view: "literals",
    label: "JSON-RPC envelope",
    re: /\bjsonrpc\b/
  },
  {
    // Set structurally by jslex specifier extraction, not by regex: a specifier
    // written with \x / \u escapes or string concatenation is itself evidence.
    id: "obf.spec-escape",
    weight: 2,
    group: "obf",
    view: null,
    label: "module specifier hidden behind escapes or concatenation"
  },
  // ── pair rules ──
  {
    id: "obf.base64-xor",
    weight: 2,
    group: "obf",
    requires: ["_b64", "_xor"],
    label: "base64-decodes then XOR-decrypts a blob"
  },
  { id: "_b64", weight: 0, view: "any", re: /\bbase64\b|\batob\s*\(|\bfromCharCode\s*\(/ },
  {
    id: "_xor",
    weight: 0,
    view: "code",
    re: /\^=\s*[A-Za-z_$][\w$]*\s*(?:\.\s*charCodeAt\s*\(|\[)|\^\s*[A-Za-z_$][\w$]*\s*\.\s*charCodeAt\s*\(/
  },
  // ── weight 1: corroboration (weak — excluded from the `distinct` count) ──
  //
  // `process.env` beside a URL is everywhere in legitimate code
  // (`const API = process.env.API_URL ?? "https://api.example.com"`), so it may
  // add to the score but must never help satisfy the diversity floor.
  {
    id: "exfil.env-url",
    weight: 1,
    group: "exfil",
    weak: true,
    requires: ["_env", "_url"],
    label: "reads env vars beside a hardcoded outbound URL"
  },
  { id: "_env", weight: 0, view: "code", re: /\bprocess\s*\.\s*env\b/ },
  { id: "_url", weight: 0, view: "literals", re: /\bhttps?:\/\/[A-Za-z0-9.-]+/ },
  {
    id: "evade.user-agent",
    weight: 1,
    group: "evade",
    weak: true,
    view: "literals",
    label: "spoofs a browser User-Agent",
    re: /Mozilla\/5\.0|\bUser-Agent\b/i
  },
  {
    id: "evade.race",
    weight: 1,
    group: "evade",
    weak: true,
    requires: ["_abort", "_any"],
    label: "races several endpoints with abort"
  },
  { id: "_abort", weight: 0, view: "code", re: /\bAbort(?:Controller|Signal)\b/ },
  { id: "_any", weight: 0, view: "code", re: /\bPromise\s*\.\s*any\s*\(/ }
];
var VARIANT_IDENT_SETS = [
  {
    id: "drainer-rpc",
    label: "PolinRider payload (RPC drainer variant)",
    weight: 5,
    group: "variant",
    minHits: 3,
    view: "code",
    idents: [
      "BLOCK_MULTIPLE",
      "NONCE_FANOUT",
      "RPC_ENDPOINTS",
      "SEARCH_FLOOR",
      "INDEXER_URL",
      "linkAbort",
      "ETH_RPC_URL"
    ]
  }
];
var BENIGN_TAIL_RES = [
  /\bimport\s*\.\s*meta\s*\.\s*(?:url|main)\b/,
  /\brequire\s*\.\s*main\s*===\s*module\b/,
  /\bmodule\s*===\s*require\s*\.\s*main\b/,
  /\bimport\s*\.\s*meta\s*\.\s*hot\b|\bmodule\s*\.\s*hot\b/,
  /\bcustomElements\s*\.\s*define\s*\(/,
  /\bself\s*\.\s*addEventListener\s*\(/,
  /\bprocess\s*\.\s*on\s*\(/
];
var PAYLOAD_SHIMS = [
  {
    id: "shim.createRequire-import",
    introduces: ["createRequire"],
    re: /^import\s?\{\s?createRequire\s?\}\s?from\s?['"](?:node:)?module['"]\s?;?$/
  },
  {
    id: "shim.createRequire-const",
    introduces: ["require"],
    re: /^(?:const|let|var)\s\S*require\s?=\s?createRequire\s?\(\s?import\s?\.\s?meta\s?\.\s?url\s?\)\s?;?$/
  }
];
var FORM_RULES = {
  // First matching tier wins.
  longLine: [
    { chars: 2e3, weight: 2, label: "a single line over 2000 characters" },
    { chars: 400, weight: 1, label: "a single line over 400 characters" }
  ],
  noComments: { minBytes: 800, weight: 1, label: "no comments in a large region" },
  punctDense: { min: 0.55, weight: 1, label: "dense punctuation (minified)" },
  // The absolute floors matter: a bare ratio would fire on any tiny file.
  byteShare: {
    minFileBytes: 400,
    minRegionBytes: 500,
    min: 0.5,
    weight: 1,
    label: "region is most of the file"
  },
  identObfuscated: {
    minIdents: 20,
    min: 0.5,
    weight: 1,
    label: "mostly single-character identifiers"
  },
  singleStatementBulk: {
    minBytes: 2e3,
    weight: 1,
    label: "one enormous statement"
  }
};
var VERDICT_THRESHOLDS = {
  configCapability: 3,
  anywhereCapability: 5,
  capabilityWithForm: { capability: 3, form: 2 },
  reviewCapability: 1,
  reviewForm: 3,
  minDistinct: 2,
  minForm: 1,
  // Files with no export boundary at all, and files jslex cannot tokenize, have
  // no position gate — they are reportable only at a deliberately high bar, and
  // are NEVER auto-stripped. bin/polinrider.js has no export and scores
  // capability ~7 with form 0; the form conjunct is what keeps it clean.
  noAnchor: { capability: 6, form: 2 },
  unlexable: { capability: 6, form: 2 }
};
var CONFIG_STEMS = [
  "postcss.config",
  "tailwind.config",
  "windi.config",
  "uno.config",
  "panda.config",
  "next.config",
  "nuxt.config",
  "svelte.config",
  "astro.config",
  "remix.config",
  "vite.config",
  "vitest.config",
  "rollup.config",
  "webpack.config",
  "metro.config",
  "babel.config",
  "jest.config",
  "jest.setup",
  "karma.conf",
  "tsup.config",
  "esbuild.config",
  "playwright.config",
  "cypress.config",
  "wdio.conf",
  "eslint.config",
  ".eslintrc",
  "prettier.config",
  ".prettierrc",
  "stylelint.config",
  "commitlint.config",
  "lint-staged.config",
  "drizzle.config",
  "knex.config",
  "knexfile",
  "prisma.config",
  "gatsby-config",
  "gatsby-node",
  "gatsby-browser",
  "gatsby-ssr",
  "expo.config",
  "app.config",
  "capacitor.config",
  "ecosystem.config",
  "release.config",
  "graphql.config",
  "sanity.config",
  "sanity.cli",
  "payload.config",
  "orval.config",
  "knip.config",
  "nx.config",
  "middleware",
  "instrumentation",
  "sentry.client.config",
  "sentry.server.config",
  "sentry.edge.config"
];
var CONFIG_EXTS = [".js", ".cjs", ".mjs", ".jsx", ".ts", ".mts", ".cts", ".tsx"];
var CONFIG_BASENAMES = new Set(
  CONFIG_STEMS.flatMap((stem) => CONFIG_EXTS.map((ext) => stem + ext))
);
var CONFIG_BASENAME_RE = /^\.?[\w.-]*\.?(?:config|conf|rc)\.(?:[cm]?[jt]sx?)$/i;
function isConfigBasename(p) {
  const base = String(p || "").replace(/\\/g, "/").split("/").pop() || "";
  return CONFIG_BASENAMES.has(base) || CONFIG_BASENAME_RE.test(base);
}

// src/jsonc.js
function parseJsonc(text) {
  let i2 = 0;
  const n2 = text.length;
  const fail2 = (msg) => {
    const e = new Error(`JSONC parse error at offset ${i2}: ${msg}`);
    e.offset = i2;
    return e;
  };
  function skipWs() {
    while (i2 < n2) {
      const c3 = text[i2];
      if (c3 === " " || c3 === "	" || c3 === "\n" || c3 === "\r" || c3 === "\uFEFF") {
        i2++;
        continue;
      }
      if (c3 === "/" && text[i2 + 1] === "/") {
        i2 += 2;
        while (i2 < n2 && text[i2] !== "\n") i2++;
        continue;
      }
      if (c3 === "/" && text[i2 + 1] === "*") {
        i2 += 2;
        while (i2 < n2 && !(text[i2] === "*" && text[i2 + 1] === "/")) i2++;
        i2 += 2;
        continue;
      }
      break;
    }
  }
  function parseString() {
    const start = i2;
    if (text[i2] !== '"') throw fail2("expected string");
    i2++;
    while (i2 < n2) {
      const c3 = text[i2];
      if (c3 === "\\") {
        i2 += 2;
        continue;
      }
      if (c3 === '"') {
        i2++;
        break;
      }
      i2++;
    }
    const raw = text.slice(start, i2);
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      throw fail2("invalid string literal");
    }
    return { type: "string", value, start, end: i2 };
  }
  function parseNumber2() {
    const start = i2;
    const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i2));
    if (!m) throw fail2("invalid number");
    i2 += m[0].length;
    return { type: "number", value: Number(m[0]), start, end: i2 };
  }
  function parseObject() {
    const start = i2;
    i2++;
    const members = [];
    const value = {};
    skipWs();
    while (text[i2] !== "}") {
      if (i2 >= n2) throw fail2("unterminated object");
      const keyNode = parseString();
      skipWs();
      if (text[i2] !== ":") throw fail2("expected ':'");
      i2++;
      const valueNode = parseValue();
      members.push({ key: keyNode.value, keyNode, valueNode });
      value[keyNode.value] = valueNode.value;
      skipWs();
      if (text[i2] === ",") {
        i2++;
        skipWs();
      } else break;
    }
    if (text[i2] !== "}") throw fail2("expected '}'");
    i2++;
    return { type: "object", members, value, start, end: i2 };
  }
  function parseArray() {
    const start = i2;
    i2++;
    const elements = [];
    const value = [];
    skipWs();
    while (text[i2] !== "]") {
      if (i2 >= n2) throw fail2("unterminated array");
      const el = parseValue();
      elements.push(el);
      value.push(el.value);
      skipWs();
      if (text[i2] === ",") {
        i2++;
        skipWs();
      } else break;
    }
    if (text[i2] !== "]") throw fail2("expected ']'");
    i2++;
    return { type: "array", elements, value, start, end: i2 };
  }
  function parseValue() {
    skipWs();
    if (i2 >= n2) throw fail2("unexpected end of input");
    const c3 = text[i2];
    if (c3 === "{") return parseObject();
    if (c3 === "[") return parseArray();
    if (c3 === '"') return parseString();
    if (c3 === "-" || c3 >= "0" && c3 <= "9") return parseNumber2();
    if (text.startsWith("true", i2)) {
      const s = i2;
      i2 += 4;
      return { type: "boolean", value: true, start: s, end: i2 };
    }
    if (text.startsWith("false", i2)) {
      const s = i2;
      i2 += 5;
      return { type: "boolean", value: false, start: s, end: i2 };
    }
    if (text.startsWith("null", i2)) {
      const s = i2;
      i2 += 4;
      return { type: "null", value: null, start: s, end: i2 };
    }
    throw fail2(`unexpected character ${JSON.stringify(c3)}`);
  }
  try {
    skipWs();
    const ast = parseValue();
    skipWs();
    if (i2 < n2) throw fail2("trailing content after top-level value");
    return { ok: true, value: ast.value, ast, error: null };
  } catch (error) {
    return { ok: false, value: void 0, ast: null, error };
  }
}

// src/walk.js
import fs from "node:fs/promises";
import path from "node:path";
var DEFAULT_EXCLUDE = /* @__PURE__ */ new Set([".git", "node_modules"]);
async function* walkFiles(root, { exclude = DEFAULT_EXCLUDE } = {}) {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.isSymbolicLink()) continue;
    const full = path.join(root, ent.name);
    if (ent.isDirectory()) {
      if (exclude.has(ent.name)) continue;
      yield* walkFiles(full, { exclude });
    } else if (ent.isFile()) {
      yield full;
    }
  }
}
async function collectByExtension(root, extensions, opts) {
  const exts = new Set(extensions.map((e) => e.toLowerCase()));
  const out = [];
  for await (const file of walkFiles(root, opts)) {
    if (exts.has(path.extname(file).toLowerCase())) out.push(file);
  }
  return out;
}

// src/fonts.js
import fs2 from "node:fs/promises";
import path2 from "node:path";
var REF_EXCLUDE = /* @__PURE__ */ new Set([...DEFAULT_EXCLUDE, ".vscode"]);
var NO_RELIABLE_MAGIC = /* @__PURE__ */ new Set([".eot"]);
var BYTE_SCAN_LIMIT = 256 * 1024;
var REF_HAYSTACK_LIMIT = 8 * 1024 * 1024;
function readMagic(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return "unknown";
  for (const [fmt, sig] of Object.entries(FONT_MAGIC)) {
    if (!sig) continue;
    if (sig.every((b, idx) => buf[idx] === b)) return fmt;
  }
  return "unknown";
}
function parseFontStructure(buf) {
  const format2 = readMagic(buf);
  if (format2 === "unknown") {
    return { valid: false, format: format2, reason: "no recognizable font magic bytes" };
  }
  if (format2 === "woff" || format2 === "woff2") {
    if (buf.length >= 14 && buf.readUInt32BE(8) === buf.length && buf.readUInt16BE(12) > 0) {
      return { valid: true, format: format2 };
    }
    return { valid: false, format: format2, reason: `malformed ${format2} header (declared length or table count invalid)` };
  }
  if (format2 === "ttc") {
    if (buf.length >= 12) {
      const numFonts = buf.readUInt32BE(8);
      if (numFonts >= 1 && numFonts <= 256 && 12 + numFonts * 4 <= buf.length) {
        let ok = true;
        for (let i2 = 0; i2 < numFonts; i2++) {
          if (buf.readUInt32BE(12 + i2 * 4) + 12 > buf.length) {
            ok = false;
            break;
          }
        }
        if (ok) return { valid: true, format: format2 };
      }
    }
    return { valid: false, format: format2, reason: "malformed TrueType Collection header" };
  }
  const numTables = buf.length >= 6 ? buf.readUInt16BE(4) : 0;
  const dirEnd = 12 + numTables * 16;
  if (numTables < 1 || numTables > 4096 || dirEnd > buf.length) {
    return { valid: false, format: format2, reason: "malformed font table directory" };
  }
  for (let i2 = 0; i2 < numTables; i2++) {
    const rec = 12 + i2 * 16;
    if (buf.readUInt32BE(rec + 8) + buf.readUInt32BE(rec + 12) > buf.length) {
      return { valid: false, format: format2, reason: "font table points past end of file" };
    }
  }
  return { valid: true, format: format2 };
}
function scanCodeStrings(buf) {
  const window = buf.subarray(0, Math.min(buf.length, BYTE_SCAN_LIMIT)).toString("latin1");
  return FONT_BADNESS_RES.some((re) => re.test(window)) ? ["contains embedded code-like strings a real font never has (eval/require/global[/etc.)"] : [];
}
function looksSuspicious(buf, ext = "") {
  if (NO_RELIABLE_MAGIC.has(ext.toLowerCase())) {
    const reasons = scanCodeStrings(buf);
    return { bad: reasons.length > 0, magic: readMagic(buf), reasons, hasCodeStrings: reasons.length > 0 };
  }
  const struct = parseFontStructure(buf);
  if (struct.valid) {
    return { bad: false, magic: struct.format, reasons: [], hasCodeStrings: false };
  }
  const codeReasons = scanCodeStrings(buf);
  return {
    bad: true,
    magic: struct.format,
    reasons: [struct.reason, ...codeReasons],
    hasCodeStrings: codeReasons.length > 0
  };
}
async function collectFontReferences(repoDir) {
  const files = await collectByExtension(repoDir, FONT_REF_EXTENSIONS, { exclude: REF_EXCLUDE });
  let haystack = "";
  for (const f of files) {
    if (haystack.length > REF_HAYSTACK_LIMIT) break;
    try {
      haystack += "\n" + (await fs2.readFile(f, "utf8")).toLowerCase();
    } catch {
    }
  }
  return haystack;
}
function isReferenced(haystack, fontPath) {
  return haystack.includes(path2.basename(fontPath).toLowerCase());
}

// src/exclude.js
var normalize = (p) => (p || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
function globToRegExp(glob) {
  let re = "";
  for (let i2 = 0; i2 < glob.length; i2++) {
    const c3 = glob[i2];
    if (c3 === "*") {
      if (glob[i2 + 1] === "*") {
        re += ".*";
        i2++;
      } else {
        re += "[^/]*";
      }
    } else if (c3 === "?") {
      re += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(c3)) {
      re += "\\" + c3;
    } else {
      re += c3;
    }
  }
  return new RegExp("^" + re + "$");
}
function buildExcluder(patterns) {
  const list = Array.isArray(patterns) ? patterns : String(patterns || "").split(/[,\n]/);
  const specs = list.map((p) => normalize(p.trim?.() ?? p)).filter(Boolean).map((n2) => ({ prefix: n2, re: globToRegExp(n2) }));
  if (specs.length === 0) return () => false;
  return (rel) => {
    const r = (rel || "").replace(/\\/g, "/");
    return specs.some((s) => r === s.prefix || r.startsWith(s.prefix + "/") || s.re.test(r));
  };
}

// src/jslex.js
var LEX_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxRegexSpan: 512,
  maxDelimiterDepth: 256,
  maxTemplateDepth: 32,
  maxStatements: 5e4
};
var AMBIENT_GLOBALS = /* @__PURE__ */ new Set([
  ...Object.getOwnPropertyNames(globalThis),
  "module",
  "exports",
  "require",
  "__dirname",
  "__filename",
  "arguments",
  "describe",
  "it",
  "test",
  "expect",
  "beforeEach",
  "afterEach",
  "before",
  "after"
]);
var KW_EXPR_BEFORE = /* @__PURE__ */ new Set([
  "return",
  "typeof",
  "instanceof",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "case",
  "do",
  "else",
  "yield",
  "await"
]);
var KW_CONTINUES = /* @__PURE__ */ new Set([
  "in",
  "instanceof",
  "of",
  "as",
  "satisfies",
  "else",
  "catch",
  "finally",
  "while",
  "extends",
  "implements",
  "from"
]);
var KW_CAN_END = /* @__PURE__ */ new Set([
  "return",
  "break",
  "continue",
  "this",
  "true",
  "false",
  "null",
  "undefined",
  "super",
  "debugger"
]);
var KW_CANNOT_END = /* @__PURE__ */ new Set([
  "new",
  "typeof",
  "void",
  "delete",
  "await",
  "yield",
  "case",
  "do",
  "const",
  "let",
  "var",
  "function",
  "class",
  "import",
  "export",
  "if",
  "for",
  "while",
  "switch",
  "try",
  "throw",
  "extends"
]);
var BLOCK_STARTERS = /* @__PURE__ */ new Set([
  "function",
  "async",
  "class",
  "abstract",
  "if",
  "for",
  "while",
  "switch",
  "try",
  "enum",
  "namespace",
  "module",
  "declare",
  "interface",
  "type",
  "{"
]);
var CONTINUES_AFTER_BRACE = /* @__PURE__ */ new Set([
  "else",
  "catch",
  "finally",
  "while",
  ",",
  ".",
  "?.",
  "(",
  "[",
  "`",
  "=>",
  "?",
  ":",
  ";",
  "=",
  "==",
  "===",
  "!=",
  "!==",
  "+",
  "-",
  "*",
  "/",
  "%",
  "**",
  "&&",
  "||",
  "??",
  "&",
  "|",
  "^",
  "<",
  ">",
  "<=",
  ">=",
  "instanceof",
  "in"
]);
var PUNCTUATORS = [
  ">>>=",
  "...",
  "===",
  "!==",
  "**=",
  "<<=",
  ">>=",
  "&&=",
  "||=",
  "??=",
  ">>>",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "?.",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<",
  ">>",
  "**",
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ";",
  ",",
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "%",
  "&",
  "|",
  "^",
  "!",
  "~",
  "?",
  ":",
  "=",
  ".",
  "@"
];
var NBSP = "\xA0";
var BOM = "\uFEFF";
var LS = "\u2028";
var PS = "\u2029";
var isLineTerm = (ch) => ch === "\n" || ch === "\r" || ch === LS || ch === PS;
var endsStringLiteral = (ch) => ch === "\n" || ch === "\r";
var isSpace = (ch) => ch === " " || ch === "	" || ch === "\v" || ch === "\f" || ch === NBSP || ch === BOM || isLineTerm(ch);
var isDigit = (ch) => ch >= "0" && ch <= "9";
var isIdentStart = (ch) => ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z" || ch === "_" || ch === "$" || ch === "#" || ch.charCodeAt(0) > 127;
var isIdentPart = (ch) => isIdentStart(ch) || isDigit(ch);
function lexJs(text, opts = {}) {
  let res;
  try {
    res = lexInner(text, opts);
  } catch (err) {
    res = fail("internal", `${err?.message ?? err}`);
  }
  if (!res.ok && /\.[jt]sx$/i.test(opts.ext || "")) res.jsxSuspected = true;
  return res;
}
function fail(reason, detail) {
  return {
    ok: false,
    reason,
    detail,
    text: null,
    code: null,
    literals: null,
    comments: null,
    skips: [],
    tokens: [],
    statements: [],
    specifiers: [],
    preamble: { bom: false, shebangEnd: 0 },
    jsxSuspected: false,
    stats: null
  };
}
function lexInner(text, opts) {
  if (typeof text !== "string") return fail("not-a-string");
  const n2 = text.length;
  if (n2 > LEX_LIMITS.maxBytes) return fail("file-too-large");
  const code = text.split("");
  const literals = new Array(n2);
  const comments = new Array(n2);
  for (let k = 0; k < n2; k++) {
    const filler = isLineTerm(text[k]) ? text[k] : " ";
    literals[k] = filler;
    comments[k] = filler;
  }
  const blankCode = (from, to) => {
    for (let k = from; k < to; k++) if (!isLineTerm(text[k])) code[k] = " ";
  };
  const revealIn = (view, from, to) => {
    for (let k = from; k < to; k++) view[k] = text[k];
  };
  const skips = [];
  const tokens = [];
  const statements = [];
  const stack = [];
  const tmplStack = [];
  let depth = 0;
  let jsxSuspected = /\.[jt]sx$/i.test(opts.ext || "");
  let i2 = 0;
  const preamble = { bom: false, shebangEnd: 0 };
  if (n2 > 0 && text.charCodeAt(0) === 65279) {
    preamble.bom = true;
    i2 = 1;
  }
  if (text.startsWith("#!", i2)) {
    let j = i2;
    while (j < n2 && !isLineTerm(text[j])) j++;
    blankCode(i2, j);
    preamble.shebangEnd = j;
    i2 = j;
  }
  let prev = null;
  let sawNewline = false;
  let stmtStart = -1;
  let stmtFirst = null;
  const pushToken = (type, start, end, extra) => {
    const tok = {
      type,
      value: type === "punct" || type === "ident" ? text.slice(start, end) : "",
      start,
      end,
      ...extra
    };
    tokens.push(tok);
    return tok;
  };
  const peekSignificant = (from) => {
    let k = from;
    while (k < n2) {
      const ch = text[k];
      if (isSpace(ch)) {
        k++;
        continue;
      }
      if (ch === "/" && text[k + 1] === "/") {
        while (k < n2 && !isLineTerm(text[k])) k++;
        continue;
      }
      if (ch === "/" && text[k + 1] === "*") {
        const close = text.indexOf("*/", k + 2);
        if (close < 0) return null;
        k = close + 2;
        continue;
      }
      break;
    }
    if (k >= n2) return null;
    if (isIdentStart(text[k])) {
      let e = k;
      while (e < n2 && isIdentPart(text[e])) e++;
      return { at: k, word: text.slice(k, e) };
    }
    for (const p of PUNCTUATORS) if (text.startsWith(p, k)) return { at: k, word: p };
    return { at: k, word: text[k] };
  };
  const closeStatement = (end, terminator) => {
    if (stmtStart < 0) return;
    if (statements.length >= LEX_LIMITS.maxStatements) throw new Error("too-many-statements");
    statements.push({
      start: stmtStart,
      end,
      index: statements.length,
      firstToken: stmtFirst ?? "",
      terminator,
      kind: "expression",
      line: 0,
      gapBefore: { chars: 0, newlines: 0, hasComment: false },
      asiRisky: terminator === "asi"
    });
    stmtStart = -1;
    stmtFirst = null;
  };
  const regexAllowed = () => {
    if (!prev) return true;
    if (prev.type === "ident") return KW_EXPR_BEFORE.has(prev.value);
    if (prev.type === "num" || prev.type === "str" || prev.type === "tpl" || prev.type === "regex") {
      return false;
    }
    const v = prev.value;
    if (v === "++" || v === "--") return false;
    if (v === ")") return prev.controlHead === true;
    if (v === "]") return false;
    if (v === "}") return prev.blockClose === true;
    return true;
  };
  const scanTemplateChunk = (from) => {
    const frame = tmplStack[tmplStack.length - 1];
    let j = from;
    while (j < n2) {
      const c3 = text[j];
      if (c3 === "\\") {
        j += 2;
        continue;
      }
      if (c3 === "$" && text[j + 1] === "{") {
        skips.push({ kind: "tpl", start: frame.chunkStart - 1, end: j, bodyStart: frame.chunkStart, bodyEnd: j });
        revealIn(literals, frame.chunkStart, j);
        blankCode(frame.chunkStart, j);
        if (depth >= LEX_LIMITS.maxDelimiterDepth) return { error: "depth-limit" };
        stack.push({ char: "{", kind: "tpl-sub", controlHead: false });
        depth++;
        prev = pushToken("punct", j, j + 2);
        prev.value = "{";
        sawNewline = false;
        return { next: j + 2 };
      }
      if (c3 === "`") {
        skips.push({ kind: "tpl", start: frame.chunkStart - 1, end: j + 1, bodyStart: frame.chunkStart, bodyEnd: j });
        revealIn(literals, frame.chunkStart, j);
        blankCode(frame.chunkStart, j);
        tmplStack.pop();
        prev = pushToken("tpl", j, j + 1);
        sawNewline = false;
        return { next: j + 1 };
      }
      j++;
    }
    return { error: "unterminated-template" };
  };
  while (i2 < n2) {
    const ch = text[i2];
    if (isSpace(ch)) {
      if (isLineTerm(ch)) sawNewline = true;
      i2++;
      continue;
    }
    if (ch === "/" && text[i2 + 1] === "/") {
      const start2 = i2;
      let j = i2 + 2;
      while (j < n2 && !isLineTerm(text[j])) j++;
      skips.push({ kind: "line-comment", start: start2, end: j, bodyStart: start2 + 2, bodyEnd: j });
      revealIn(comments, start2 + 2, j);
      blankCode(start2, j);
      i2 = j;
      continue;
    }
    if (ch === "/" && text[i2 + 1] === "*") {
      const start2 = i2;
      const close = text.indexOf("*/", i2 + 2);
      if (close < 0) return fail("unterminated-comment");
      const end2 = close + 2;
      skips.push({ kind: "block-comment", start: start2, end: end2, bodyStart: start2 + 2, bodyEnd: close });
      revealIn(comments, start2 + 2, close);
      blankCode(start2, end2);
      for (let k = start2; k < end2; k++) if (isLineTerm(text[k])) sawNewline = true;
      i2 = end2;
      continue;
    }
    if (depth === 0 && stmtStart >= 0 && sawNewline && prev) {
      const prevCanEnd = prev.type === "num" || prev.type === "str" || prev.type === "tpl" || prev.type === "regex" || prev.type === "ident" && (KW_CAN_END.has(prev.value) || !KW_CANNOT_END.has(prev.value)) && !KW_CONTINUES.has(prev.value) || prev.type === "punct" && (prev.value === ")" || prev.value === "]" || prev.value === "}" || prev.value === "++" || prev.value === "--");
      let nextCannotContinue = false;
      if (isIdentStart(ch)) {
        let e = i2;
        while (e < n2 && isIdentPart(text[e])) e++;
        nextCannotContinue = !KW_CONTINUES.has(text.slice(i2, e));
      } else if (ch === "@") {
        nextCannotContinue = true;
      }
      if (prevCanEnd && nextCannotContinue && stmtFirst !== "@") {
        closeStatement(prev.end, "asi");
      }
    }
    if (depth === 0 && stmtStart < 0) {
      stmtStart = i2;
      stmtFirst = null;
    }
    if (ch === "'" || ch === '"') {
      const start2 = i2;
      let j = i2 + 1;
      let closed = false;
      while (j < n2) {
        const c3 = text[j];
        if (c3 === "\\") {
          j += 2;
          continue;
        }
        if (c3 === ch) {
          closed = true;
          break;
        }
        if (endsStringLiteral(c3)) return fail("unterminated-string");
        j++;
      }
      if (!closed) return fail("unterminated-string");
      skips.push({ kind: ch === "'" ? "sq" : "dq", start: start2, end: j + 1, bodyStart: start2 + 1, bodyEnd: j });
      revealIn(literals, start2 + 1, j);
      blankCode(start2 + 1, j);
      prev = pushToken("str", start2, j + 1);
      if (stmtFirst === null) stmtFirst = "str";
      sawNewline = false;
      i2 = j + 1;
      continue;
    }
    if (ch === "`") {
      if (tmplStack.length >= LEX_LIMITS.maxTemplateDepth) return fail("template-depth-limit");
      const start2 = i2;
      tmplStack.push({ start: start2, chunkStart: i2 + 1 });
      prev = pushToken("tpl", start2, start2 + 1);
      if (stmtFirst === null) stmtFirst = "tpl";
      sawNewline = false;
      const res = scanTemplateChunk(i2 + 1);
      if (res.error) return fail(res.error);
      i2 = res.next;
      continue;
    }
    if (ch === "/" && regexAllowed()) {
      const start2 = i2;
      let j = i2 + 1;
      let inClass = false;
      let closed = false;
      while (j < n2) {
        const c3 = text[j];
        if (c3 === "\\") {
          j += 2;
          continue;
        }
        if (isLineTerm(c3)) break;
        if (c3 === "[") inClass = true;
        else if (c3 === "]") inClass = false;
        else if (c3 === "/" && !inClass) {
          closed = true;
          break;
        }
        j++;
      }
      if (!closed) return fail("unterminated-regex");
      let e = j + 1;
      while (e < n2 && /[dgimsuvy]/.test(text[e])) e++;
      if (e - start2 > LEX_LIMITS.maxRegexSpan) return fail("regex-span-too-long");
      skips.push({ kind: "regex", start: start2, end: e, bodyStart: start2 + 1, bodyEnd: j });
      blankCode(start2 + 1, j);
      prev = pushToken("regex", start2, e);
      if (stmtFirst === null) stmtFirst = "regex";
      sawNewline = false;
      i2 = e;
      continue;
    }
    if (isDigit(ch) || ch === "." && isDigit(text[i2 + 1])) {
      const start2 = i2;
      let j = i2;
      if (ch === "0" && /[xXbBoO]/.test(text[j + 1] || "")) {
        j += 2;
        while (j < n2 && /[0-9a-fA-F_]/.test(text[j])) j++;
      } else {
        while (j < n2 && /[0-9_]/.test(text[j])) j++;
        if (text[j] === ".") {
          j++;
          while (j < n2 && /[0-9_]/.test(text[j])) j++;
        }
        if (/[eE]/.test(text[j] || "")) {
          j++;
          if (text[j] === "+" || text[j] === "-") j++;
          while (j < n2 && /[0-9_]/.test(text[j])) j++;
        }
      }
      if (text[j] === "n") j++;
      prev = pushToken("num", start2, j);
      if (stmtFirst === null) stmtFirst = "num";
      sawNewline = false;
      i2 = j;
      continue;
    }
    if (isIdentStart(ch)) {
      const start2 = i2;
      let j = i2;
      while (j < n2 && isIdentPart(text[j])) j++;
      prev = pushToken("ident", start2, j);
      if (stmtFirst === null) stmtFirst = prev.value;
      sawNewline = false;
      i2 = j;
      continue;
    }
    if (ch === "<" && !jsxSuspected && regexAllowed() && /[A-Za-z_$>]/.test(text[i2 + 1] || "")) {
      jsxSuspected = true;
    }
    let punct = null;
    for (const p of PUNCTUATORS) {
      if (text.startsWith(p, i2)) {
        punct = p;
        break;
      }
    }
    if (punct === null) punct = ch;
    if (punct === "?." && isDigit(text[i2 + 2] || "")) punct = "?";
    const start = i2;
    const end = i2 + punct.length;
    if (punct === "(" || punct === "[" || punct === "{") {
      if (depth >= LEX_LIMITS.maxDelimiterDepth) return fail("depth-limit");
      const kind = punct === "{" ? braceKind(prev, stmtStart === start) : "group";
      const controlHead = punct === "(" && prev?.type === "ident" && (prev.value === "if" || prev.value === "while" || prev.value === "for" || prev.value === "with");
      stack.push({ char: punct, kind, controlHead });
      depth++;
      prev = pushToken("punct", start, end);
      sawNewline = false;
      i2 = end;
      continue;
    }
    if (punct === ")" || punct === "]" || punct === "}") {
      if (depth === 0 || stack.length === 0) return fail("unbalanced-close");
      const frame = stack.pop();
      const expected = punct === ")" ? "(" : punct === "]" ? "[" : "{";
      if (frame.char !== expected) return fail("mismatched-delimiter");
      depth--;
      prev = pushToken("punct", start, end, {
        controlHead: frame.controlHead,
        blockClose: punct === "}" && (frame.kind === "block" || frame.kind === "body")
      });
      if (stmtFirst === null) stmtFirst = punct;
      sawNewline = false;
      i2 = end;
      if (frame.kind === "tpl-sub") {
        const tpl = tmplStack[tmplStack.length - 1];
        if (!tpl) return fail("unterminated-template");
        tpl.chunkStart = end;
        const res = scanTemplateChunk(end);
        if (res.error) return fail(res.error);
        i2 = res.next;
        continue;
      }
      if (punct === "}" && depth === 0 && prev.blockClose && BLOCK_STARTERS.has(stmtFirst)) {
        const nxt = peekSignificant(end);
        if (!nxt || !CONTINUES_AFTER_BRACE.has(nxt.word)) closeStatement(end, "}");
      }
      continue;
    }
    prev = pushToken("punct", start, end);
    if (stmtFirst === null) stmtFirst = punct;
    sawNewline = false;
    i2 = end;
    if (punct === ";" && depth === 0) closeStatement(end, ";");
  }
  if (depth !== 0 || stack.length !== 0) return fail("unbalanced-eof");
  if (tmplStack.length !== 0) return fail("unterminated-template");
  if (stmtStart >= 0) closeStatement(prev ? prev.end : n2, "eof");
  const codeStr = code.join("");
  {
    let s = 0;
    for (let k = preamble.shebangEnd; k < n2; k++) {
      if (isSpace(codeStr[k])) continue;
      while (s < statements.length && statements[s].end <= k) s++;
      if (s >= statements.length || k < statements[s].start) {
        return fail("untiled-significant-text", `offset ${k}`);
      }
    }
  }
  const lineStarts = [0];
  for (let k = 0; k < n2; k++) if (text[k] === "\n") lineStarts.push(k + 1);
  const lineOf = (off) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = lo + hi + 1 >> 1;
      if (lineStarts[mid] <= off) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  for (let k = 0; k < statements.length; k++) {
    const st = statements[k];
    st.line = lineOf(st.start);
    st.kind = classifyStatement(codeStr.slice(st.start, st.end), st.firstToken);
    const gapFrom = k === 0 ? preamble.shebangEnd : statements[k - 1].end;
    const gapRaw = text.slice(gapFrom, st.start);
    st.gapBefore = {
      chars: gapRaw.length,
      newlines: (gapRaw.match(/\n/g) || []).length,
      hasComment: skips.some(
        (sk) => (sk.kind === "line-comment" || sk.kind === "block-comment") && sk.start >= gapFrom && sk.end <= st.start
      )
    };
  }
  const lex = {
    ok: true,
    reason: null,
    text,
    code: codeStr,
    literals: literals.join(""),
    comments: comments.join(""),
    skips,
    tokens,
    statements,
    preamble,
    jsxSuspected,
    lineStarts,
    specifiers: [],
    stats: { lines: lineStarts.length, statements: statements.length }
  };
  lex.specifiers = extractSpecifiers(lex);
  return lex;
}
function braceKind(prev, atStatementStart) {
  if (atStatementStart || !prev) return "block";
  if (prev.type === "punct") {
    const v = prev.value;
    if (v === ")") return "body";
    if (v === "}" || v === ";") return "block";
    return "object";
  }
  if (prev.type === "ident") {
    const v = prev.value;
    if (v === "else" || v === "do" || v === "try" || v === "finally") return "block";
    if (v === "return" || v === "typeof" || v === "case") return "object";
    return "body";
  }
  return "object";
}
function classifyStatement(codeSlice, firstToken) {
  const s = codeSlice.trimStart();
  if (firstToken === "import") return "import";
  if (firstToken === "export") return "export";
  if (/^module\s*\.\s*exports\b/.test(s)) return "module-exports";
  if (/^exports\s*\.\s*[A-Za-z_$][\w$]*\s*=/.test(s)) return "module-exports";
  if (/^Object\s*\.\s*defineProperty\s*\(\s*exports\b/.test(s)) return "module-exports";
  if (firstToken === "str") return "directive";
  if (firstToken === "{") return "block";
  if (firstToken === ";") return "empty";
  if (firstToken === "const" || firstToken === "let" || firstToken === "var" || firstToken === "function" || firstToken === "class" || firstToken === "enum" || firstToken === "type" || firstToken === "interface" || firstToken === "namespace" || firstToken === "declare" || firstToken === "async") {
    return "declaration";
  }
  return "expression";
}
function extractSpecifiers(lex) {
  const out = [];
  const { tokens, text } = lex;
  const litOf = (tok) => text.slice(tok.start + 1, tok.end - 1);
  const escaped = (tok) => /\\x|\\u|\\[0-7]/.test(text.slice(tok.start, tok.end));
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type !== "ident") continue;
    if ((t.value === "require" || t.value === "import") && tokens[k + 1]?.value === "(") {
      const arg = tokens[k + 2];
      if (arg?.type === "str") {
        out.push({
          spec: litOf(arg),
          raw: litOf(arg),
          start: arg.start,
          end: arg.end,
          form: t.value === "require" ? "require" : "dynamic-import",
          // An escaped or concatenated specifier is itself evidence of hiding.
          obfuscated: escaped(arg) || tokens[k + 3]?.value === "+"
        });
      }
      continue;
    }
    if (t.value === "import") {
      for (let j = k + 1; j < tokens.length && j < k + 64; j++) {
        if (tokens[j].type === "str") {
          out.push({
            spec: litOf(tokens[j]),
            raw: litOf(tokens[j]),
            start: tokens[j].start,
            end: tokens[j].end,
            form: "import",
            obfuscated: escaped(tokens[j])
          });
          break;
        }
        if (tokens[j].value === ";") break;
      }
    }
  }
  return out;
}
var _cache = { text: null, ext: null, res: null };
function lexCached(text, opts = {}) {
  const ext = opts.ext || "";
  if (_cache.text === text && _cache.ext === ext) return _cache.res;
  const res = lexJs(text, opts);
  _cache = { text, ext, res };
  return res;
}
function regionOf(lex, start, end) {
  const lo = Math.max(0, start);
  const hi = Math.min(lex.text.length, end);
  return {
    start: lo,
    end: hi,
    raw: lex.text.slice(lo, hi),
    code: lex.code.slice(lo, hi),
    literals: lex.literals.slice(lo, hi),
    comments: lex.comments.slice(lo, hi),
    bytes: hi - lo,
    literalBodies: lex.skips.filter(
      (s) => (s.kind === "sq" || s.kind === "dq" || s.kind === "tpl") && s.bodyStart >= lo && s.bodyEnd <= hi
    ).map((s) => lex.text.slice(s.bodyStart, s.bodyEnd)),
    specifiers: lex.specifiers.filter((s) => s.start >= lo && s.end <= hi)
  };
}
function regionOfStatements(lex, stmts) {
  if (!stmts.length) return regionOf(lex, 0, 0);
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of stmts) {
    if (s.start < lo) lo = s.start;
    if (s.end > hi) hi = s.end;
  }
  return regionOf(lex, lo, hi);
}
var tokensIn = (lex, stmt) => lex.tokens.filter((t) => t.start >= stmt.start && t.end <= stmt.end);
function bindingsOf(lex, stmt) {
  const out = /* @__PURE__ */ new Set();
  const toks = tokensIn(lex, stmt);
  if (!toks.length || toks[0].type !== "ident") return out;
  const first = toks[0].value;
  if (first === "const" || first === "let" || first === "var") {
    let d = 0;
    let expectName = true;
    for (let k = 1; k < toks.length; k++) {
      const t = toks[k];
      if (t.type === "punct") {
        if (t.value === "(" || t.value === "[" || t.value === "{") d++;
        else if (t.value === ")" || t.value === "]" || t.value === "}") d--;
        else if (t.value === "=" && d === 0) expectName = false;
        else if (t.value === "," && d <= 0) expectName = true;
        continue;
      }
      if (t.type === "ident" && expectName) out.add(t.value);
    }
    return out;
  }
  if (first === "function" || first === "class" || first === "enum" || first === "namespace" || first === "interface" || first === "type" || first === "async") {
    for (let k = 1; k < toks.length; k++) {
      if (toks[k].type === "ident" && toks[k].value !== "function") {
        out.add(toks[k].value);
        break;
      }
    }
  }
  return out;
}
function referencesOf(lex, stmts) {
  const out = /* @__PURE__ */ new Set();
  for (const stmt of stmts) {
    const toks = tokensIn(lex, stmt);
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (t.type !== "ident") continue;
      const p = toks[k - 1];
      if (p && p.type === "punct" && (p.value === "." || p.value === "?.")) continue;
      if (AMBIENT_GLOBALS.has(t.value)) continue;
      out.add(t.value);
    }
  }
  return out;
}
function sliceOut(text, ranges) {
  const sorted = [...ranges].sort((a2, b) => b.start - a2.start);
  let out = text;
  let removed = 0;
  for (const r of sorted) {
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) return null;
    if (r.start < 0 || r.end < r.start || r.end > out.length) return null;
    removed += r.end - r.start;
    out = out.slice(0, r.start) + out.slice(r.end);
  }
  return { kept: out, removedBytes: removed };
}
function verifySplice(text, ranges, opts = {}) {
  if (!Array.isArray(ranges) || ranges.length === 0) return { ok: false, reason: "no-ranges" };
  const lex = opts.lex ?? lexCached(text, { ext: opts.ext });
  if (!lex.ok) return { ok: false, reason: `lex-failed:${lex.reason}` };
  const sorted = [...ranges].sort((a2, b) => a2.start - b.start);
  for (let k = 0; k < sorted.length; k++) {
    const r = sorted[k];
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) {
      return { ok: false, reason: "range-not-integer" };
    }
    if (r.start < 0 || r.end > text.length || r.end <= r.start) {
      return { ok: false, reason: "range-out-of-bounds" };
    }
    if (r.start < lex.preamble.shebangEnd) return { ok: false, reason: "range-crosses-shebang" };
    if (k > 0 && r.start < sorted[k - 1].end) return { ok: false, reason: "ranges-overlap" };
  }
  for (const st of lex.statements) {
    for (const r of sorted) {
      const overlaps = st.start < r.end && st.end > r.start;
      const contained = st.start >= r.start && st.end <= r.end;
      if (overlaps && !contained) return { ok: false, reason: "range-splits-a-statement" };
    }
  }
  const merged = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && lex.code.slice(last.end, r.start).trim() === "") {
      last.end = Math.max(last.end, r.end);
      continue;
    }
    merged.push({ ...r });
  }
  const floor = lex.preamble.shebangEnd;
  const extended = merged.map((r) => {
    let start = r.start;
    for (; ; ) {
      const before = text.slice(floor, start);
      const m = /(?:[ \t]*(?:\r?\n)[ \t]*)$|[ \t]+$/.exec(before);
      if (!m || m[0].length === 0) break;
      start -= m[0].length;
      if (start <= floor) {
        start = floor;
        break;
      }
    }
    let end = r.end;
    while (end < text.length && /[ \t]/.test(text[end])) end++;
    if (text[end] === "\r") end++;
    if (text[end] === "\n") end++;
    for (; ; ) {
      const m = /^[ \t]*\r?\n/.exec(text.slice(end));
      if (!m) break;
      end += m[0].length;
    }
    return { start: Math.max(start, floor), end, role: r.role };
  });
  for (let k = 1; k < extended.length; k++) {
    if (extended[k].start < extended[k - 1].end) extended[k].start = extended[k - 1].end;
    if (extended[k].end <= extended[k].start) {
      return { ok: false, reason: "ranges-collapsed-after-extension" };
    }
  }
  const spliced = sliceOut(text, extended);
  if (!spliced) return { ok: false, reason: "splice-invalid" };
  const kept = spliced.kept.replace(/\s+$/, "") + "\n";
  if (kept.trim().length === 0) return { ok: false, reason: "would-empty-file" };
  const after = lexJs(kept, { ext: opts.ext });
  if (!after.ok) return { ok: false, reason: `result-unlexable:${after.reason}` };
  const removedStatements = lex.statements.filter(
    (s) => extended.some((r) => s.start >= r.start && s.end <= r.end)
  ).length;
  const expected = lex.statements.length - removedStatements;
  if (after.statements.length !== expected) {
    return { ok: false, reason: `statement-count-mismatch:${after.statements.length}!=${expected}` };
  }
  if (opts.expectExport && !after.statements.some((s) => s.kind === "export" || s.kind === "module-exports")) {
    return { ok: false, reason: "no-export-remains" };
  }
  return { ok: true, kept, removedBytes: spliced.removedBytes, ranges: extended };
}

// src/capability.js
var STRUCTURAL_KINDS = /* @__PURE__ */ new Set(["import", "export", "module-exports", "directive"]);
var ILLEGAL_STATEMENT_START = /* @__PURE__ */ new Set([
  ")",
  "]",
  "}",
  ",",
  ".",
  "?.",
  "=>",
  ":",
  "=",
  "==",
  "===",
  "!=",
  "!==",
  "&&",
  "||",
  "??",
  "*",
  "/",
  "%",
  "**",
  "<",
  ">",
  "<=",
  ">=",
  "|",
  "&",
  "^",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&&=",
  "||=",
  "??="
]);
function containsWord(hay, word) {
  if (!hay || !word) return false;
  let from = 0;
  for (; ; ) {
    const at = hay.indexOf(word, from);
    if (at < 0) return false;
    const before = at === 0 ? "" : hay[at - 1];
    const after = at + word.length >= hay.length ? "" : hay[at + word.length];
    const isPart = (c3) => c3 !== "" && /[A-Za-z0-9_$]/.test(c3);
    if (!isPart(before) && !isPart(after)) return true;
    from = at + 1;
  }
}
function pickView(region, view) {
  if (view === "code") return region.code;
  if (view === "literals") return region.literals;
  if (view === "any") return `${region.code}
${region.literals}`;
  return null;
}
function scoreCapabilities(region, opts = {}) {
  const rules = opts.rules ?? CAPABILITY_RULES;
  const risky = opts.riskyModules ?? RISKY_MODULES;
  const variantSets = opts.variantSets ?? VARIANT_IDENT_SETS;
  const raw = [];
  const byId = new Map(rules.map((r) => [r.id, r]));
  let sawObfuscatedSpecifier = false;
  for (const spec of region.specifiers ?? []) {
    if (spec.obfuscated) sawObfuscatedSpecifier = true;
    const bare = String(spec.spec).replace(/^node:/, "");
    const info = risky.get(bare);
    if (info) {
      raw.push({
        id: `mod.${bare}`,
        weight: info.weight,
        group: info.group,
        label: info.label,
        weak: false
      });
    }
  }
  if (sawObfuscatedSpecifier) {
    const r = byId.get("obf.spec-escape");
    if (r) raw.push({ id: r.id, weight: r.weight, group: r.group, label: r.label, weak: !!r.weak });
  }
  const memberHit = /* @__PURE__ */ new Set();
  for (const rule of rules) {
    if (!rule.re) continue;
    let matched = false;
    if (rule.wholeLiteral) {
      matched = (region.literalBodies ?? []).some((body) => rule.re.test(body));
    } else {
      const hay = pickView(region, rule.view);
      matched = hay ? rule.re.test(hay) : false;
    }
    if (!matched) continue;
    if (rule.weight === 0) memberHit.add(rule.id);
    else raw.push({ id: rule.id, weight: rule.weight, group: rule.group, label: rule.label, weak: !!rule.weak });
  }
  for (const rule of rules) {
    if (!Array.isArray(rule.requires)) continue;
    if (rule.requires.every((id) => memberHit.has(id))) {
      raw.push({ id: rule.id, weight: rule.weight, group: rule.group, label: rule.label, weak: !!rule.weak });
    }
  }
  for (const set of variantSets) {
    const hay = pickView(region, set.view);
    if (!hay) continue;
    const found = set.idents.filter((ident) => containsWord(hay, ident));
    if (found.length >= set.minHits) {
      raw.push({
        id: `variant.${set.id}`,
        weight: set.weight,
        group: set.group,
        label: `${set.label} (${found.length}/${set.idents.length} markers)`,
        weak: false
      });
    }
  }
  const best = /* @__PURE__ */ new Map();
  for (const h2 of raw) {
    const key = h2.group ?? `~${h2.id}`;
    const cur = best.get(key);
    if (!cur || h2.weight > cur.weight) best.set(key, h2);
  }
  let score = 0;
  const distinctGroups = /* @__PURE__ */ new Set();
  for (const [key, h2] of best) {
    score += h2.weight;
    if (!h2.weak) distinctGroups.add(key);
  }
  const countedIds = new Set([...best.values()].map((h2) => h2.id));
  return {
    score,
    distinct: distinctGroups.size,
    hits: raw.map((h2) => ({ ...h2, counted: countedIds.has(h2.id) })),
    degraded: false
  };
}
function scoreForm(region, fileText, opts = {}) {
  const R = opts.rules ?? FORM_RULES;
  const raw = region.raw ?? "";
  const lines = raw.split("\n");
  const maxLineLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const regionBytes = region.bytes ?? raw.length;
  const fileBytes = (fileText ?? "").length;
  const commentChars = (region.comments ?? "").replace(/\s/g, "").length;
  const punct = (raw.match(/[^\w\s]/g) || []).length;
  const alnum = (raw.match(/[A-Za-z0-9]/g) || []).length;
  const punctRatio = punct / Math.max(1, alnum);
  const idents = (region.code ?? "").match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
  const shortIdents = idents.filter((s) => s.length <= 2).length;
  const shortIdentRatio = idents.length ? shortIdents / idents.length : 0;
  const byteShare = fileBytes > 0 ? regionBytes / fileBytes : 0;
  const largestStatementBytes = (opts.statements ?? []).reduce(
    (m, s) => Math.max(m, s.end - s.start),
    0
  );
  const hits = [];
  const add = (id, weight, label, value) => hits.push({ id, weight, label, value });
  for (const tier of R.longLine) {
    if (maxLineLen >= tier.chars) {
      add("form.long-line", tier.weight, tier.label, maxLineLen);
      break;
    }
  }
  if (regionBytes >= R.noComments.minBytes && commentChars === 0) {
    add("form.no-comments", R.noComments.weight, R.noComments.label, regionBytes);
  }
  if (punctRatio >= R.punctDense.min) {
    add("form.punct-dense", R.punctDense.weight, R.punctDense.label, +punctRatio.toFixed(2));
  }
  if (fileBytes >= R.byteShare.minFileBytes && regionBytes >= R.byteShare.minRegionBytes && byteShare >= R.byteShare.min) {
    add("form.byte-share", R.byteShare.weight, R.byteShare.label, +byteShare.toFixed(2));
  }
  if (idents.length >= R.identObfuscated.minIdents && shortIdentRatio >= R.identObfuscated.min) {
    add("form.ident-obfuscated", R.identObfuscated.weight, R.identObfuscated.label, +shortIdentRatio.toFixed(2));
  }
  if (largestStatementBytes >= R.singleStatementBulk.minBytes) {
    add("form.single-statement-bulk", R.singleStatementBulk.weight, R.singleStatementBulk.label, largestStatementBytes);
  }
  return {
    score: hits.reduce((s, h2) => s + h2.weight, 0),
    hits,
    metrics: {
      maxLineLen,
      lineCount: lines.length,
      regionBytes,
      byteShare,
      commentChars,
      punctRatio,
      shortIdentRatio,
      largestStatementBytes
    }
  };
}
function balanced(codeSlice) {
  let p = 0;
  let b = 0;
  let c3 = 0;
  for (const ch of codeSlice) {
    if (ch === "(") p++;
    else if (ch === ")") p--;
    else if (ch === "[") b++;
    else if (ch === "]") b--;
    else if (ch === "{") c3++;
    else if (ch === "}") c3--;
    if (p < 0 || b < 0 || c3 < 0) return false;
  }
  return p === 0 && b === 0 && c3 === 0;
}
function partitionTopLevel(text, lex, opts = {}) {
  const empty = {
    ok: false,
    anchor: null,
    payload: [],
    kept: [],
    shims: [],
    preAnchor: [],
    flags: { interleaved: false, midFile: false, noAnchor: true, demoted: [] }
  };
  if (!lex?.ok) return { ...empty, reason: `lex-failed:${lex?.reason ?? "unknown"}` };
  const statements = lex.statements;
  let anchor = null;
  for (const st of statements) {
    if (st.kind === "export" || st.kind === "module-exports") anchor = st;
  }
  const trailing = /* @__PURE__ */ new Set();
  for (let k = statements.length - 1; k >= 0; k--) {
    if (STRUCTURAL_KINDS.has(statements[k].kind)) break;
    trailing.add(statements[k].index);
  }
  const isPadded = (st) => {
    const g = st.gapBefore;
    if (g.hasComment) return false;
    return g.newlines >= 3 || g.chars >= 200 && g.newlines >= 2;
  };
  const candidates = [];
  const preAnchor = [];
  for (const st of statements) {
    const positional = [];
    if (anchor && st.start >= anchor.end && trailing.has(st.index)) positional.push("post-export");
    if (isPadded(st)) positional.push("padded");
    if (positional.length === 0) continue;
    if (STRUCTURAL_KINDS.has(st.kind)) continue;
    const codeSlice = lex.code.slice(st.start, st.end);
    if (containsWord(codeSlice, "import") || containsWord(codeSlice, "export")) continue;
    if (!balanced(codeSlice)) continue;
    if (ILLEGAL_STATEMENT_START.has(st.firstToken)) continue;
    if (anchor && st.start < anchor.end) {
      preAnchor.push({ st, positional });
      continue;
    }
    candidates.push({ st, positional });
  }
  const surviving = [];
  for (const cand of candidates) {
    const region = regionOf(lex, cand.st.start, cand.st.end);
    const own = scoreCapabilities(region);
    const benign = BENIGN_TAIL_RES.some((re) => re.test(region.code));
    if (benign && own.score < VERDICT_THRESHOLDS.configCapability) continue;
    surviving.push(cand);
  }
  let payload = surviving.slice();
  const demoted = [];
  for (; ; ) {
    const payloadIdx2 = new Set(payload.map((p) => p.st.index));
    const keptStmts = statements.filter((s) => !payloadIdx2.has(s.index));
    const keptRefs = referencesOf(lex, keptStmts);
    const guilty = payload.find((p) => {
      for (const name of bindingsOf(lex, p.st)) if (keptRefs.has(name)) return true;
      return false;
    });
    if (!guilty) break;
    demoted.push({ index: guilty.st.index, why: "referenced by surviving code" });
    payload = payload.filter((p) => p.st.index !== guilty.st.index);
  }
  const payloadIdx = new Set(payload.map((p) => p.st.index));
  const kept = statements.filter((s) => !payloadIdx.has(s.index));
  const shimDefs = opts.shims ?? PAYLOAD_SHIMS;
  const shimMatches = [];
  for (const st of statements) {
    if (payloadIdx.has(st.index)) continue;
    if (anchor && st.start >= anchor.end) continue;
    const normalized = lex.text.slice(st.start, st.end).replace(/\s+/g, " ").trim();
    const def = shimDefs.find((s) => s.re.test(normalized));
    if (def) shimMatches.push({ st, shimId: def.id, introduces: def.introduces });
  }
  const shims = [];
  if (shimMatches.length > 0) {
    const shimIdx = new Set(shimMatches.map((s) => s.st.index));
    const survivingCode = kept.filter((s) => !shimIdx.has(s.index)).map((s) => lex.code.slice(s.start, s.end)).join("\n");
    const stillUsed = shimMatches.some(
      (s) => s.introduces.some((name) => containsWord(survivingCode, name))
    );
    if (!stillUsed) shims.push(...shimMatches);
  }
  const lastPayload = payload.length ? payload[payload.length - 1].st : null;
  const firstPayload = payload.length ? payload[0].st : null;
  const flags = {
    // A structural statement appearing after the payload means the payload is
    // wedged between real module code, not appended to the end.
    interleaved: !!firstPayload && kept.some((s) => STRUCTURAL_KINDS.has(s.kind) && s.start > firstPayload.start),
    midFile: !anchor && !!lastPayload && lex.code.slice(lastPayload.end).trim().length > 0,
    noAnchor: anchor === null,
    demoted
  };
  return {
    ok: true,
    reason: null,
    anchor: anchor ? { start: anchor.start, end: anchor.end, kind: anchor.kind } : null,
    payload,
    kept,
    shims,
    preAnchor,
    flags
  };
}
function verdictForFile(input2) {
  const {
    relPath,
    fileText,
    lex,
    partition,
    capability,
    form,
    knownVariantId = null,
    spliceOk = null,
    spliceReason = null
  } = input2;
  const T = VERDICT_THRESHOLDS;
  const none = (reason) => ({
    verdict: "none",
    contentConfirmed: false,
    confidence: "low",
    action: null,
    ranges: [],
    score: { capability: 0, distinct: 0, form: 0 },
    reasons: [],
    blockers: [],
    reason: reason ?? null
  });
  const cap = capability?.score ?? 0;
  const dist = capability?.distinct ?? 0;
  const frm = form?.score ?? 0;
  const score = { capability: cap, distinct: dist, form: frm };
  const evidence = [
    ...(capability?.hits ?? []).filter((h2) => h2.counted).map((h2) => h2.label),
    ...(form?.hits ?? []).map((h2) => h2.label)
  ];
  if (!lex?.ok || !partition?.ok) {
    if (cap >= T.unlexable.capability && frm >= T.unlexable.form) {
      return {
        verdict: "manual-review",
        contentConfirmed: false,
        confidence: "low",
        action: "manual-review",
        ranges: [],
        score,
        reasons: evidence,
        blockers: ["region-unlexable"],
        reason: `could not be tokenized safely (${lex?.reason ?? partition?.reason}) but scores high on capability \u2014 review manually`
      };
    }
    return none(`not tokenizable (${lex?.reason ?? partition?.reason})`);
  }
  const hasPayload = partition.payload.length > 0;
  const hasShim = partition.shims.length > 0;
  if (!hasPayload) {
    if (hasShim) {
      return {
        verdict: "shim-only",
        contentConfirmed: false,
        confidence: "low",
        action: "strip-js-payload",
        autoFix: true,
        ranges: partition.shims.map((s) => ({ start: s.st.start, end: s.st.end, role: "shim" })),
        score,
        reasons: ["an injected createRequire shim remains with no payload and nothing using it"],
        blockers: [],
        reason: "leftover createRequire shim injected by PolinRider \u2014 the payload is already gone and nothing remaining uses require"
      };
    }
    if (partition.preAnchor.length > 0 && cap >= T.anywhereCapability) {
      return {
        verdict: "manual-review",
        contentConfirmed: false,
        confidence: "low",
        action: "manual-review",
        ranges: [],
        score,
        reasons: evidence,
        blockers: ["payload-before-export-boundary"],
        reason: "privileged code sits before the export boundary \u2014 reported, never auto-removed"
      };
    }
    return none("no code outside the legitimate module region");
  }
  const isConfig = isConfigBasename(relPath);
  const autoStrip = isConfig && cap >= T.configCapability || cap >= T.anywhereCapability || cap >= T.capabilityWithForm.capability && frm >= T.capabilityWithForm.form;
  const blockers = [];
  if (autoStrip) {
    if (!knownVariantId) {
      if (dist < T.minDistinct) blockers.push("single-capability-group");
      if (frm < T.minForm) blockers.push("no-form-anomaly");
    }
    if (lex.jsxSuspected) blockers.push("jsx-unsafe-to-cut");
    if (capability?.degraded) blockers.push("region-unlexable");
    if (partition.flags.noAnchor) blockers.push("no-export-boundary");
    if (partition.flags.midFile) blockers.push("payload-not-at-file-tail");
    if (partition.flags.interleaved && cap < T.anywhereCapability) {
      blockers.push("interleaved-needs-more-evidence");
    }
    if (partition.flags.demoted.length > 0 && cap < T.anywhereCapability) {
      blockers.push("linkage-demotions-present");
    }
    if (spliceOk === false) blockers.push(`splice-postcondition-failed:${spliceReason ?? "unknown"}`);
  }
  const ranges = input2.ranges ?? candidateRanges(partition, fileText);
  if (autoStrip && blockers.length === 0) {
    return {
      verdict: "confirmed",
      contentConfirmed: true,
      confidence: "high",
      action: "strip-js-payload",
      ranges,
      score,
      reasons: evidence,
      blockers: [],
      reason: describe(evidence, score, partition)
    };
  }
  if (cap >= T.reviewCapability || frm >= T.reviewForm) {
    return {
      verdict: "manual-review",
      contentConfirmed: knownVariantId != null || cap >= T.anywhereCapability && dist >= T.minDistinct,
      confidence: cap >= T.configCapability ? "high" : "low",
      action: "manual-review",
      ranges: [],
      score,
      reasons: evidence,
      blockers,
      reason: `${describe(evidence, score, partition)}${blockers.length ? ` \u2014 not auto-removed (${blockers.join(", ")})` : ""}`
    };
  }
  return none("code after the export boundary, but it does nothing privileged");
}
function candidateRanges(partition, fileText) {
  if (!partition?.ok) return [];
  return [
    ...partition.shims.map((s) => ({ start: s.st.start, end: s.st.end, role: "shim" })),
    ...payloadRanges(partition.payload, fileText)
  ].sort((a2, b) => a2.start - b.start);
}
function payloadRanges(payload, fileText) {
  if (payload.length === 0) return [];
  const end = (fileText ?? "").length;
  const last = payload[payload.length - 1].st;
  const reachesEnd = last.end >= end - 1 || /^\s*$/.test((fileText ?? "").slice(last.end));
  const ranges = [];
  let run2 = null;
  for (const p of payload) {
    if (run2 && p.st.index === run2.lastIndex + 1) {
      run2.end = p.st.end;
      run2.lastIndex = p.st.index;
      continue;
    }
    run2 = { start: p.st.start, end: p.st.end, lastIndex: p.st.index, role: "payload" };
    ranges.push(run2);
  }
  if (reachesEnd && ranges.length) ranges[ranges.length - 1].end = end;
  return ranges.map(({ start, end: e, role }) => ({ start, end: e, role }));
}
function describe(evidence, score, partition) {
  const where = partition.anchor ? "appended after the last export" : "in an unbounded region";
  const what = evidence.length ? evidence.join(", ") : "no distinguishing behaviour";
  return `obfuscated code ${where}: ${what} (capability ${score.capability}, ${score.distinct} distinct, form ${score.form})`;
}
function findKnownVariant(text) {
  return JS_VARIANTS.find(
    (v) => text.includes(v.signature) && v.seeds.some((s) => text.includes(s))
  ) ?? null;
}
function assessJsText(text, relPath) {
  const dot = String(relPath ?? "").lastIndexOf(".");
  const ext = dot >= 0 ? relPath.slice(dot) : "";
  const lex = lexJs(text, { ext });
  const partition = partitionTopLevel(text, lex);
  const usable = lex.ok && partition.ok;
  const payloadStmts = usable ? partition.payload.map((p) => p.st) : [];
  let region;
  let degraded = false;
  if (!lex.ok) {
    degraded = true;
    region = {
      start: 0,
      end: text.length,
      raw: text,
      code: text,
      literals: text,
      comments: "",
      bytes: text.length,
      literalBodies: [],
      specifiers: []
    };
  } else if (payloadStmts.length > 0) {
    region = regionOfStatements(lex, payloadStmts);
    if (region.end < text.length) region = regionOf(lex, region.start, text.length);
  } else {
    region = regionOf(lex, 0, 0);
  }
  const capability = { ...scoreCapabilities(region), degraded };
  const form = scoreForm(region, text, { statements: payloadStmts });
  const knownVariant = findKnownVariant(text);
  const ranges = candidateRanges(partition, text);
  let spliceOk = null;
  let spliceReason = null;
  let keptText = null;
  if (usable && ranges.length > 0) {
    const vs = verifySplice(text, ranges, {
      lex,
      ext,
      expectExport: !!partition.anchor
    });
    spliceOk = vs.ok;
    spliceReason = vs.reason ?? null;
    keptText = vs.ok ? vs.kept : null;
  }
  const verdict = verdictForFile({
    relPath,
    fileText: text,
    lex,
    partition,
    capability,
    form,
    knownVariantId: knownVariant?.id ?? null,
    ranges,
    spliceOk,
    spliceReason
  });
  return { lex, partition, capability, form, knownVariant, verdict, ranges, keptText };
}

// src/scanner.js
async function scanRepo(repoDir, opts = {}) {
  const findings = [];
  const rel = (p) => path3.relative(repoDir, p) || path3.basename(p);
  const matchExcluded = buildExcluder(opts.exclude);
  const isExcluded = (abs) => matchExcluded(path3.relative(repoDir, abs).split(path3.sep).join("/"));
  await detectJsPayloads(repoDir, findings, rel, isExcluded);
  await detectVscode(repoDir, findings, rel, isExcluded);
  await detectFonts(repoDir, findings, rel, isExcluded);
  await detectPackageJson(repoDir, findings, isExcluded);
  await detectArtifacts(repoDir, findings, isExcluded);
  const coPresenceAmplified = existsSync(path3.join(repoDir, ".vscode", "tasks.json")) && existsSync(path3.join(repoDir, ".vscode", "launch.json")) && FONT_DIRS.some((d) => existsSync(path3.join(repoDir, d)));
  const hasContentConfirmed = findings.some((f) => f.contentConfirmed);
  const hasAutoFixable = findings.some(
    (f) => (f.contentConfirmed || f.autoFix) && f.action !== "manual-review"
  );
  let severity = "clean";
  if (hasContentConfirmed) severity = "infected";
  else if (findings.length > 0 || coPresenceAmplified) severity = "suspicious";
  const manualReview = findings.filter((f) => f.action === "manual-review").map((f) => `${f.file}: ${f.description}`);
  return {
    repoDir,
    severity,
    hasContentConfirmed,
    hasAutoFixable,
    coPresenceAmplified,
    findings,
    manualReview
  };
}
function reportOffset(ranges) {
  const payload = ranges.find((r) => r.role === "payload");
  return (payload ?? ranges[0])?.start ?? -1;
}
function editFor(file, assessment) {
  const { ranges, verdict } = assessment;
  return {
    absPath: file,
    offset: reportOffset(ranges),
    ranges: ranges.map(({ start, end, role }) => ({ start, end, role })),
    variantId: assessment.knownVariant?.id,
    scores: verdict.score,
    blockers: verdict.blockers
  };
}
async function detectJsPayloads(repoDir, findings, rel, isExcluded) {
  const files = await collectByExtension(repoDir, JS_EXTENSIONS);
  for (const file of files) {
    if (isExcluded(file)) continue;
    let text;
    try {
      text = await fs3.readFile(file, "utf8");
    } catch {
      continue;
    }
    const relPath = rel(file);
    const assessment = assessJsText(text, relPath);
    const v = assessment.verdict;
    if (v.verdict === "none") continue;
    const variant = assessment.knownVariant;
    const prefix = variant ? `${variant.label} \u2014 ` : "";
    if (v.verdict === "confirmed") {
      findings.push({
        id: variant ? `js.payload.${variant.id}` : "js.payload.injected",
        category: "js",
        file: relPath,
        confidence: "high",
        action: "strip-js-payload",
        contentConfirmed: true,
        description: `${prefix}${v.reason}`,
        evidence: v.score,
        edit: editFor(file, assessment)
      });
      continue;
    }
    if (v.verdict === "shim-only") {
      findings.push({
        id: "js.shim.orphan",
        category: "js",
        file: relPath,
        confidence: "low",
        action: "strip-js-payload",
        contentConfirmed: false,
        // Residue from an earlier partial cleanup: removable, but not on its own
        // grounds for calling a repo infected.
        autoFix: true,
        description: v.reason,
        evidence: v.score,
        edit: editFor(file, assessment)
      });
      continue;
    }
    findings.push({
      id: variant ? `js.payload.${variant.id}` : assessment.capability.degraded ? "js.payload.unlexable" : "js.payload.suspect-tail",
      category: "js",
      file: relPath,
      confidence: v.confidence,
      action: "manual-review",
      contentConfirmed: v.contentConfirmed,
      description: `${prefix}${v.reason}`,
      evidence: v.score
    });
  }
}
function classifyVscodeEntry(entryValue) {
  const hay = JSON.stringify(entryValue ?? "");
  if (isC2Host(hay)) return { bad: true, reason: "references a known PolinRider C2 host" };
  if (isFetchToShell(hay))
    return { bad: true, reason: "fetches a remote script and pipes it to a shell" };
  if (commandExecutesAsset(hay))
    return { bad: true, reason: "executes a font/asset file as code (e.g. `node ./public/fonts/\u2026`)" };
  if (entryValue?.runOptions?.runOn === "folderOpen") {
    if (ANY_URL_RE.test(hay))
      return { bad: true, reason: "auto-runs on folderOpen and contacts an external URL" };
    if (INTERPRETER_RE.test(hay))
      return { bad: true, reason: "auto-runs a script interpreter on folderOpen" };
  }
  return { bad: false };
}
async function detectVscode(repoDir, findings, rel, isExcluded) {
  const vscodeDir = path3.join(repoDir, ".vscode");
  if (!existsSync(vscodeDir) || isExcluded(vscodeDir)) return;
  const targets = [
    { name: "tasks.json", arrayKey: "tasks" },
    { name: "launch.json", arrayKey: "configurations" }
  ];
  const reasons = /* @__PURE__ */ new Set();
  for (const { name, arrayKey } of targets) {
    const file = path3.join(vscodeDir, name);
    if (!existsSync(file) || isExcluded(file)) continue;
    let text;
    try {
      text = await fs3.readFile(file, "utf8");
    } catch {
      continue;
    }
    const parsed = parseJsonc(text);
    if (!parsed.ok) {
      if (isC2Host(text) || isFetchToShell(text) || commandExecutesAsset(text)) {
        reasons.add(`malicious content in ${name}`);
      }
      continue;
    }
    const arr = Array.isArray(parsed.value?.[arrayKey]) ? parsed.value[arrayKey] : [];
    for (const entry of arr) {
      const c3 = classifyVscodeEntry(entry);
      if (c3.bad) reasons.add(`${name}: ${c3.reason}`);
    }
  }
  if (reasons.size === 0) return;
  findings.push({
    id: "vscode.malicious",
    category: "vscode",
    file: ".vscode",
    confidence: "high",
    action: "remove-dir",
    contentConfirmed: true,
    description: `Malicious .vscode configuration (${[...reasons].join("; ")}) \u2014 removing the entire .vscode directory`,
    edit: { absPath: vscodeDir }
  });
}
function fontDirToRemove(repoDir, fontAbsPath) {
  const parts = path3.relative(repoDir, fontAbsPath).split(path3.sep);
  const idx = parts.lastIndexOf("fonts");
  if (idx >= 0) return path3.join(repoDir, ...parts.slice(0, idx + 1));
  return null;
}
async function detectFonts(repoDir, findings, rel, isExcluded) {
  const fontFiles = await collectByExtension(repoDir, FONT_EXTENSIONS);
  if (fontFiles.length === 0) return;
  const haystack = await collectFontReferences(repoDir);
  const groups = /* @__PURE__ */ new Map();
  const orphans = [];
  const ensureGroup = (dir) => {
    if (!groups.has(dir)) groups.set(dir, { confirmed: [], suspect: [] });
    return groups.get(dir);
  };
  for (const file of fontFiles) {
    if (isExcluded(file)) continue;
    const isFa = isFaFamilyName(path3.basename(file));
    let susp;
    try {
      susp = looksSuspicious(await fs3.readFile(file), path3.extname(file));
    } catch {
      continue;
    }
    const referenced = isReferenced(haystack, file);
    const isCarrier = susp.bad && susp.hasCodeStrings;
    const dir = fontDirToRemove(repoDir, file);
    if (referenced) {
      if (isCarrier) {
        findings.push({
          id: "font.referenced-carrier",
          category: "font",
          file: rel(file),
          confidence: "high",
          action: "manual-review",
          contentConfirmed: false,
          description: `Referenced file that is not a valid font but contains a code payload (${susp.reasons.join("; ")}). It is imported by the build, so it is not auto-removed \u2014 review and remove it manually.`
        });
      }
      if (isFa && dir) ensureGroup(dir);
      continue;
    }
    if (!susp.bad && !isFa) continue;
    const entry = { file, reasons: susp.reasons };
    if (dir) {
      const g = ensureGroup(dir);
      if (isCarrier) g.confirmed.push(entry);
      else if (susp.bad) g.suspect.push(entry);
    } else if (isCarrier) {
      orphans.push({ ...entry, kind: "carrier" });
    } else if (susp.bad || isFa) {
      orphans.push({ ...entry, kind: "review", isFa });
    }
  }
  for (const [dir, group] of groups) {
    await emitFontDirFinding(dir, group, findings, rel, isExcluded);
  }
  for (const o2 of orphans) {
    if (o2.kind === "carrier") {
      findings.push({
        id: "font.carrier",
        category: "font",
        file: rel(o2.file),
        confidence: "high",
        action: "delete-font",
        contentConfirmed: true,
        description: `Unreferenced font carrier (JS payload): ${o2.reasons.join("; ")}`,
        edit: { absPath: o2.file }
      });
    } else {
      findings.push({
        id: "font.review",
        category: "font",
        file: rel(o2.file),
        confidence: "low",
        action: "manual-review",
        contentConfirmed: false,
        description: o2.isFa ? "Font-Awesome-named font (a known PolinRider disguise) with no payload detected \u2014 review manually." : `Unreferenced file that is not a valid font (${o2.reasons.join("; ")}) \u2014 review manually.`
      });
    }
  }
}
async function listTree(dir) {
  const allEntries = [];
  const regularFiles = [];
  const rec = async (d) => {
    let entries;
    try {
      entries = await fs3.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path3.join(d, ent.name);
      allEntries.push(full);
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) await rec(full);
      else if (ent.isFile()) regularFiles.push(full);
    }
  };
  await rec(dir);
  return { allEntries, regularFiles };
}
async function emitFontDirFinding(dir, group, findings, rel, isExcluded) {
  const { allEntries, regularFiles } = await listTree(dir);
  const faAll = regularFiles.filter((f) => !isExcluded(f) && isFaFamilyName(path3.basename(f)));
  if (group.confirmed.length > 0) {
    const carrierReasons = [...new Set(group.confirmed.flatMap((e) => e.reasons))].join("; ");
    const carrierDirs = new Set(group.confirmed.map((e) => path3.dirname(e.file)));
    const inScope = (f) => carrierDirs.has(path3.dirname(f)) && !isExcluded(f);
    const faFiles = faAll.filter(inScope);
    const sidecars = regularFiles.filter((f) => inScope(f) && isFontDropSidecar(path3.basename(f)));
    const removalAbs = /* @__PURE__ */ new Set([...group.confirmed.map((e) => e.file), ...faFiles, ...sidecars]);
    const remaining = allEntries.filter((f) => !removalAbs.has(f));
    if (remaining.length === 0) {
      findings.push({
        id: "font.carrier-dir",
        category: "font",
        file: rel(dir),
        confidence: "high",
        action: "remove-dir",
        contentConfirmed: true,
        description: `Font carrier(s) found \u2014 removing the entire ${rel(dir)} directory (${carrierReasons})`,
        edit: { absPath: dir }
      });
    } else {
      const removals = [...removalAbs].map((abs) => ({ abs, rel: rel(abs) }));
      findings.push({
        id: "font.carrier-set",
        category: "font",
        file: rel(dir),
        confidence: "high",
        action: "remove-font-set",
        contentConfirmed: true,
        description: `Font carrier(s) in ${rel(dir)} (${carrierReasons}) \u2014 removing ${removals.length} malicious/disguise file(s): ${removals.map((r) => path3.basename(r.rel)).join(", ")}. Preserving ${remaining.length} clean entr${remaining.length === 1 ? "y" : "ies"}.`,
        edit: { removals }
      });
    }
    return;
  }
  const bits = [];
  if (faAll.length) {
    bits.push(
      `Font-Awesome-named font(s) present (${faAll.map((f) => path3.basename(f)).join(", ")}) \u2014 a known PolinRider disguise`
    );
  }
  if (group.suspect.length) {
    bits.push(`unrecognized non-font file(s): ${group.suspect.map((e) => path3.basename(e.file)).join(", ")}`);
  }
  if (bits.length === 0) return;
  findings.push({
    id: "font.review",
    category: "font",
    file: rel(dir),
    confidence: "low",
    action: "manual-review",
    contentConfirmed: false,
    description: `${bits.join("; ")}. No payload detected \u2014 review manually to confirm these are legitimate.`
  });
}
async function detectPackageJson(repoDir, findings, isExcluded) {
  const file = path3.join(repoDir, "package.json");
  if (!existsSync(file) || isExcluded(file)) return;
  let pkg;
  try {
    pkg = JSON.parse(await fs3.readFile(file, "utf8"));
  } catch {
    return;
  }
  const depSections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  const impostors = /* @__PURE__ */ new Set();
  for (const section of depSections) {
    const deps = pkg[section];
    if (!deps || typeof deps !== "object") continue;
    for (const name of Object.keys(deps)) {
      if (IMPOSTOR_DEPS.includes(name)) impostors.add(name);
    }
  }
  if (impostors.size > 0) {
    findings.push({
      id: "package.impostor-deps",
      category: "package",
      file: "package.json",
      confidence: "high",
      action: "manual-review",
      contentConfirmed: true,
      description: `Known PolinRider impostor dependenc${impostors.size === 1 ? "y" : "ies"}: ${[...impostors].join(", ")}. Remove the package(s) and audit lockfiles manually.`
    });
  }
  const scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  for (const hook of SUSPICIOUS_LIFECYCLE_SCRIPTS) {
    const cmd = scripts[hook];
    if (typeof cmd === "string" && (isFetchToShell(cmd) || /\bnode\b\s+-e\b/i.test(cmd))) {
      findings.push({
        id: `package.script.${hook}`,
        category: "package",
        file: "package.json",
        confidence: "high",
        action: "manual-review",
        contentConfirmed: true,
        description: `"${hook}" lifecycle script fetches and executes remote code: ${cmd}`
      });
    }
  }
}
async function detectArtifacts(repoDir, findings, isExcluded) {
  for (const name of ARTIFACT_FILES) {
    if (existsSync(path3.join(repoDir, name)) && !isExcluded(path3.join(repoDir, name))) {
      findings.push({
        id: `artifact.${name}`,
        category: "artifact",
        file: name,
        confidence: "high",
        action: "remove-artifact",
        contentConfirmed: true,
        description: name === "config.bat" ? "Hidden malware orchestrator" : "Malware propagation script",
        edit: { absPath: path3.join(repoDir, name) }
      });
    }
  }
  const gitignore = path3.join(repoDir, ".gitignore");
  if (existsSync(gitignore) && !isExcluded(gitignore)) {
    try {
      const lines = (await fs3.readFile(gitignore, "utf8")).split(/\r?\n/).map((l) => l.trim());
      const injected = GITIGNORE_INJECTED.filter((p) => lines.includes(p));
      if (injected.length) {
        findings.push({
          id: "gitignore.injected",
          category: "gitignore",
          file: ".gitignore",
          confidence: "high",
          action: "fix-gitignore",
          contentConfirmed: true,
          description: `malware-injected .gitignore entr${injected.length === 1 ? "y" : "ies"}: ${injected.join(", ")}`
        });
      }
    } catch {
    }
  }
}

// src/remediator.js
import fs4 from "node:fs/promises";
import { existsSync as existsSync2 } from "node:fs";
import path9 from "node:path";

// node_modules/is-plain-obj/index.js
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
}

// node_modules/execa/lib/arguments/file-url.js
import { fileURLToPath } from "node:url";
var safeNormalizeFileUrl = (file, name) => {
  const fileString = normalizeFileUrl(normalizeDenoExecPath(file));
  if (typeof fileString !== "string") {
    throw new TypeError(`${name} must be a string or a file URL: ${fileString}.`);
  }
  return fileString;
};
var normalizeDenoExecPath = (file) => isDenoExecPath(file) ? file.toString() : file;
var isDenoExecPath = (file) => typeof file !== "string" && file && Object.getPrototypeOf(file) === String.prototype;
var normalizeFileUrl = (file) => file instanceof URL ? fileURLToPath(file) : file;

// node_modules/execa/lib/methods/parameters.js
var normalizeParameters = (rawFile, rawArguments = [], rawOptions = {}) => {
  const filePath = safeNormalizeFileUrl(rawFile, "First argument");
  const [commandArguments, options] = isPlainObject(rawArguments) ? [[], rawArguments] : [rawArguments, rawOptions];
  if (!Array.isArray(commandArguments)) {
    throw new TypeError(`Second argument must be either an array of arguments or an options object: ${commandArguments}`);
  }
  if (commandArguments.some((commandArgument) => typeof commandArgument === "object" && commandArgument !== null)) {
    throw new TypeError(`Second argument must be an array of strings: ${commandArguments}`);
  }
  const normalizedArguments = commandArguments.map(String);
  const nullByteArgument = normalizedArguments.find((normalizedArgument) => normalizedArgument.includes("\0"));
  if (nullByteArgument !== void 0) {
    throw new TypeError(`Arguments cannot contain null bytes ("\\0"): ${nullByteArgument}`);
  }
  if (!isPlainObject(options)) {
    throw new TypeError(`Last argument must be an options object: ${options}`);
  }
  return [filePath, normalizedArguments, options];
};

// node_modules/execa/lib/methods/template.js
import { ChildProcess } from "node:child_process";

// node_modules/execa/lib/utils/uint-array.js
import { StringDecoder } from "node:string_decoder";
var { toString: objectToString } = Object.prototype;
var isArrayBuffer = (value) => objectToString.call(value) === "[object ArrayBuffer]";
var isUint8Array = (value) => objectToString.call(value) === "[object Uint8Array]";
var bufferToUint8Array = (buffer) => new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
var textEncoder = new TextEncoder();
var stringToUint8Array = (string) => textEncoder.encode(string);
var textDecoder = new TextDecoder();
var uint8ArrayToString = (uint8Array) => textDecoder.decode(uint8Array);
var joinToString = (uint8ArraysOrStrings, encoding) => {
  const strings = uint8ArraysToStrings(uint8ArraysOrStrings, encoding);
  return strings.join("");
};
var uint8ArraysToStrings = (uint8ArraysOrStrings, encoding) => {
  if (encoding === "utf8" && uint8ArraysOrStrings.every((uint8ArrayOrString) => typeof uint8ArrayOrString === "string")) {
    return uint8ArraysOrStrings;
  }
  const decoder = new StringDecoder(encoding);
  const strings = uint8ArraysOrStrings.map((uint8ArrayOrString) => typeof uint8ArrayOrString === "string" ? stringToUint8Array(uint8ArrayOrString) : uint8ArrayOrString).map((uint8Array) => decoder.write(uint8Array));
  const finalString = decoder.end();
  return finalString === "" ? strings : [...strings, finalString];
};
var joinToUint8Array = (uint8ArraysOrStrings) => {
  if (uint8ArraysOrStrings.length === 1 && isUint8Array(uint8ArraysOrStrings[0])) {
    return uint8ArraysOrStrings[0];
  }
  return concatUint8Arrays(stringsToUint8Arrays(uint8ArraysOrStrings));
};
var stringsToUint8Arrays = (uint8ArraysOrStrings) => uint8ArraysOrStrings.map((uint8ArrayOrString) => typeof uint8ArrayOrString === "string" ? stringToUint8Array(uint8ArrayOrString) : uint8ArrayOrString);
var concatUint8Arrays = (uint8Arrays) => {
  const result = new Uint8Array(getJoinLength(uint8Arrays));
  let index = 0;
  for (const uint8Array of uint8Arrays) {
    result.set(uint8Array, index);
    index += uint8Array.length;
  }
  return result;
};
var getJoinLength = (uint8Arrays) => {
  let joinLength = 0;
  for (const uint8Array of uint8Arrays) {
    joinLength += uint8Array.length;
  }
  return joinLength;
};

// node_modules/execa/lib/methods/template.js
var isTemplateString = (templates) => Array.isArray(templates) && Array.isArray(templates.raw);
var parseTemplates = (templates, expressions) => {
  let tokens = [];
  for (const [index, template] of templates.entries()) {
    tokens = parseTemplate({
      templates,
      expressions,
      tokens,
      index,
      template
    });
  }
  if (tokens.length === 0) {
    throw new TypeError("Template script must not be empty");
  }
  const [file, ...commandArguments] = tokens;
  return [file, commandArguments, {}];
};
var parseTemplate = ({ templates, expressions, tokens, index, template }) => {
  if (template === void 0) {
    throw new TypeError(`Invalid backslash sequence: ${templates.raw[index]}`);
  }
  const { nextTokens, leadingWhitespaces, trailingWhitespaces } = splitByWhitespaces(template, templates.raw[index]);
  const newTokens = concatTokens(tokens, nextTokens, leadingWhitespaces);
  if (index === expressions.length) {
    return newTokens;
  }
  const expression = expressions[index];
  const expressionTokens = Array.isArray(expression) ? expression.map((expression2) => parseExpression(expression2)) : [parseExpression(expression)];
  return concatTokens(newTokens, expressionTokens, trailingWhitespaces);
};
var splitByWhitespaces = (template, rawTemplate) => {
  if (rawTemplate.length === 0) {
    return { nextTokens: [], leadingWhitespaces: false, trailingWhitespaces: false };
  }
  const nextTokens = [];
  let templateStart = 0;
  const leadingWhitespaces = DELIMITERS.has(rawTemplate[0]);
  for (let templateIndex = 0, rawIndex = 0; templateIndex < template.length; templateIndex += 1, rawIndex += 1) {
    const rawCharacter = rawTemplate[rawIndex];
    if (DELIMITERS.has(rawCharacter)) {
      if (templateStart !== templateIndex) {
        nextTokens.push(template.slice(templateStart, templateIndex));
      }
      templateStart = templateIndex + 1;
    } else if (rawCharacter === "\\") {
      const nextRawCharacter = rawTemplate[rawIndex + 1];
      if (nextRawCharacter === "\n") {
        templateIndex -= 1;
        rawIndex += 1;
      } else if (nextRawCharacter === "u" && rawTemplate[rawIndex + 2] === "{") {
        rawIndex = rawTemplate.indexOf("}", rawIndex + 3);
      } else {
        rawIndex += ESCAPE_LENGTH[nextRawCharacter] ?? 1;
      }
    }
  }
  const trailingWhitespaces = templateStart === template.length;
  if (!trailingWhitespaces) {
    nextTokens.push(template.slice(templateStart));
  }
  return { nextTokens, leadingWhitespaces, trailingWhitespaces };
};
var DELIMITERS = /* @__PURE__ */ new Set([" ", "	", "\r", "\n"]);
var ESCAPE_LENGTH = { x: 3, u: 5 };
var concatTokens = (tokens, nextTokens, isSeparated) => isSeparated || tokens.length === 0 || nextTokens.length === 0 ? [...tokens, ...nextTokens] : [
  ...tokens.slice(0, -1),
  `${tokens.at(-1)}${nextTokens[0]}`,
  ...nextTokens.slice(1)
];
var parseExpression = (expression) => {
  const typeOfExpression = typeof expression;
  if (typeOfExpression === "string") {
    return expression;
  }
  if (typeOfExpression === "number") {
    return String(expression);
  }
  if (isPlainObject(expression) && ("stdout" in expression || "isMaxBuffer" in expression)) {
    return getSubprocessResult(expression);
  }
  if (expression instanceof ChildProcess || Object.prototype.toString.call(expression) === "[object Promise]") {
    throw new TypeError("Unexpected subprocess in template expression. Please use ${await subprocess} instead of ${subprocess}.");
  }
  throw new TypeError(`Unexpected "${typeOfExpression}" in template expression`);
};
var getSubprocessResult = ({ stdout }) => {
  if (typeof stdout === "string") {
    return stdout;
  }
  if (isUint8Array(stdout)) {
    return uint8ArrayToString(stdout);
  }
  if (stdout === void 0) {
    throw new TypeError(`Missing result.stdout in template expression. This is probably due to the previous subprocess' "stdout" option.`);
  }
  throw new TypeError(`Unexpected "${typeof stdout}" stdout in template expression`);
};

// node_modules/execa/lib/methods/main-sync.js
import { spawnSync } from "node:child_process";

// node_modules/execa/lib/arguments/specific.js
import { debuglog } from "node:util";

// node_modules/execa/lib/utils/standard-stream.js
import process2 from "node:process";
var isStandardStream = (stream) => STANDARD_STREAMS.includes(stream);
var STANDARD_STREAMS = [process2.stdin, process2.stdout, process2.stderr];
var STANDARD_STREAMS_ALIASES = ["stdin", "stdout", "stderr"];
var getStreamName = (fdNumber) => STANDARD_STREAMS_ALIASES[fdNumber] ?? `stdio[${fdNumber}]`;

// node_modules/execa/lib/arguments/specific.js
var normalizeFdSpecificOptions = (options) => {
  const optionsCopy = { ...options };
  for (const optionName of FD_SPECIFIC_OPTIONS) {
    optionsCopy[optionName] = normalizeFdSpecificOption(options, optionName);
  }
  return optionsCopy;
};
var normalizeFdSpecificOption = (options, optionName) => {
  const optionBaseArray = Array.from({ length: getStdioLength(options) + 1 });
  const optionArray = normalizeFdSpecificValue(options[optionName], optionBaseArray, optionName);
  return addDefaultValue(optionArray, optionName);
};
var getStdioLength = ({ stdio }) => Array.isArray(stdio) ? Math.max(stdio.length, STANDARD_STREAMS_ALIASES.length) : STANDARD_STREAMS_ALIASES.length;
var normalizeFdSpecificValue = (optionValue, optionArray, optionName) => isPlainObject(optionValue) ? normalizeOptionObject(optionValue, optionArray, optionName) : optionArray.fill(optionValue);
var normalizeOptionObject = (optionValue, optionArray, optionName) => {
  for (const fdName of Object.keys(optionValue).sort(compareFdName)) {
    for (const fdNumber of parseFdName(fdName, optionName, optionArray)) {
      optionArray[fdNumber] = optionValue[fdName];
    }
  }
  return optionArray;
};
var compareFdName = (fdNameA, fdNameB) => getFdNameOrder(fdNameA) < getFdNameOrder(fdNameB) ? 1 : -1;
var getFdNameOrder = (fdName) => {
  if (fdName === "stdout" || fdName === "stderr") {
    return 0;
  }
  return fdName === "all" ? 2 : 1;
};
var parseFdName = (fdName, optionName, optionArray) => {
  if (fdName === "ipc") {
    return [optionArray.length - 1];
  }
  const fdNumber = parseFd(fdName);
  if (fdNumber === void 0 || fdNumber === 0) {
    throw new TypeError(`"${optionName}.${fdName}" is invalid.
It must be "${optionName}.stdout", "${optionName}.stderr", "${optionName}.all", "${optionName}.ipc", or "${optionName}.fd3", "${optionName}.fd4" (and so on).`);
  }
  if (fdNumber >= optionArray.length) {
    throw new TypeError(`"${optionName}.${fdName}" is invalid: that file descriptor does not exist.
Please set the "stdio" option to ensure that file descriptor exists.`);
  }
  return fdNumber === "all" ? [1, 2] : [fdNumber];
};
var parseFd = (fdName) => {
  if (fdName === "all") {
    return fdName;
  }
  if (STANDARD_STREAMS_ALIASES.includes(fdName)) {
    return STANDARD_STREAMS_ALIASES.indexOf(fdName);
  }
  const regexpResult = FD_REGEXP.exec(fdName);
  if (regexpResult !== null) {
    return Number(regexpResult[1]);
  }
};
var FD_REGEXP = /^fd(\d+)$/;
var addDefaultValue = (optionArray, optionName) => optionArray.map((optionValue) => optionValue === void 0 ? DEFAULT_OPTIONS[optionName] : optionValue);
var verboseDefault = debuglog("execa").enabled ? "full" : "none";
var DEFAULT_OPTIONS = {
  lines: false,
  buffer: true,
  maxBuffer: 1e3 * 1e3 * 100,
  verbose: verboseDefault,
  stripFinalNewline: true
};
var FD_SPECIFIC_OPTIONS = ["lines", "buffer", "maxBuffer", "verbose", "stripFinalNewline"];
var getFdSpecificValue = (optionArray, fdNumber) => fdNumber === "ipc" ? optionArray.at(-1) : optionArray[fdNumber];

// node_modules/execa/lib/verbose/values.js
var isVerbose = ({ verbose }, fdNumber) => getFdVerbose(verbose, fdNumber) !== "none";
var isFullVerbose = ({ verbose }, fdNumber) => !["none", "short"].includes(getFdVerbose(verbose, fdNumber));
var getVerboseFunction = ({ verbose }, fdNumber) => {
  const fdVerbose = getFdVerbose(verbose, fdNumber);
  return isVerboseFunction(fdVerbose) ? fdVerbose : void 0;
};
var getFdVerbose = (verbose, fdNumber) => fdNumber === void 0 ? getFdGenericVerbose(verbose) : getFdSpecificValue(verbose, fdNumber);
var getFdGenericVerbose = (verbose) => verbose.find((fdVerbose) => isVerboseFunction(fdVerbose)) ?? VERBOSE_VALUES.findLast((fdVerbose) => verbose.includes(fdVerbose));
var isVerboseFunction = (fdVerbose) => typeof fdVerbose === "function";
var VERBOSE_VALUES = ["none", "short", "full"];

// node_modules/execa/lib/verbose/log.js
import { inspect } from "node:util";

// node_modules/execa/lib/arguments/escape.js
import { platform } from "node:process";
import { stripVTControlCharacters } from "node:util";
var joinCommand = (filePath, rawArguments) => {
  const fileAndArguments = [filePath, ...rawArguments];
  const command = fileAndArguments.join(" ");
  const escapedCommand = fileAndArguments.map((fileAndArgument) => quoteString(escapeControlCharacters(fileAndArgument))).join(" ");
  return { command, escapedCommand };
};
var escapeLines = (lines) => stripVTControlCharacters(lines).split("\n").map((line) => escapeControlCharacters(line)).join("\n");
var escapeControlCharacters = (line) => line.replaceAll(SPECIAL_CHAR_REGEXP, (character) => escapeControlCharacter(character));
var escapeControlCharacter = (character) => {
  const commonEscape = COMMON_ESCAPES[character];
  if (commonEscape !== void 0) {
    return commonEscape;
  }
  const codepoint = character.codePointAt(0);
  const codepointHex = codepoint.toString(16);
  return codepoint <= ASTRAL_START ? `\\u${codepointHex.padStart(4, "0")}` : `\\U${codepointHex}`;
};
var getSpecialCharRegExp = () => {
  try {
    return new RegExp("\\p{Separator}|\\p{Other}", "gu");
  } catch {
    return /[\s\u0000-\u001F\u007F-\u009F\u00AD]/g;
  }
};
var SPECIAL_CHAR_REGEXP = getSpecialCharRegExp();
var COMMON_ESCAPES = {
  " ": " ",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t"
};
var ASTRAL_START = 65535;
var quoteString = (escapedArgument) => {
  if (NO_ESCAPE_REGEXP.test(escapedArgument)) {
    return escapedArgument;
  }
  return platform === "win32" ? `"${escapedArgument.replaceAll('"', '""')}"` : `'${escapedArgument.replaceAll("'", "'\\''")}'`;
};
var NO_ESCAPE_REGEXP = /^[\w./-]+$/;

// node_modules/is-unicode-supported/index.js
import process3 from "node:process";
function isUnicodeSupported() {
  const { env } = process3;
  const { TERM, TERM_PROGRAM } = env;
  if (process3.platform !== "win32") {
    return TERM !== "linux";
  }
  return Boolean(env.WT_SESSION) || Boolean(env.TERMINUS_SUBLIME) || env.ConEmuTask === "{cmd::Cmder}" || TERM_PROGRAM === "Terminus-Sublime" || TERM_PROGRAM === "vscode" || TERM === "xterm-256color" || TERM === "alacritty" || TERM === "rxvt-unicode" || TERM === "rxvt-unicode-256color" || env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}

// node_modules/figures/index.js
var common = {
  circleQuestionMark: "(?)",
  questionMarkPrefix: "(?)",
  square: "\u2588",
  squareDarkShade: "\u2593",
  squareMediumShade: "\u2592",
  squareLightShade: "\u2591",
  squareTop: "\u2580",
  squareBottom: "\u2584",
  squareLeft: "\u258C",
  squareRight: "\u2590",
  squareCenter: "\u25A0",
  bullet: "\u25CF",
  dot: "\u2024",
  ellipsis: "\u2026",
  pointerSmall: "\u203A",
  triangleUp: "\u25B2",
  triangleUpSmall: "\u25B4",
  triangleDown: "\u25BC",
  triangleDownSmall: "\u25BE",
  triangleLeftSmall: "\u25C2",
  triangleRightSmall: "\u25B8",
  home: "\u2302",
  heart: "\u2665",
  musicNote: "\u266A",
  musicNoteBeamed: "\u266B",
  arrowUp: "\u2191",
  arrowDown: "\u2193",
  arrowLeft: "\u2190",
  arrowRight: "\u2192",
  arrowLeftRight: "\u2194",
  arrowUpDown: "\u2195",
  almostEqual: "\u2248",
  notEqual: "\u2260",
  lessOrEqual: "\u2264",
  greaterOrEqual: "\u2265",
  identical: "\u2261",
  infinity: "\u221E",
  subscriptZero: "\u2080",
  subscriptOne: "\u2081",
  subscriptTwo: "\u2082",
  subscriptThree: "\u2083",
  subscriptFour: "\u2084",
  subscriptFive: "\u2085",
  subscriptSix: "\u2086",
  subscriptSeven: "\u2087",
  subscriptEight: "\u2088",
  subscriptNine: "\u2089",
  oneHalf: "\xBD",
  oneThird: "\u2153",
  oneQuarter: "\xBC",
  oneFifth: "\u2155",
  oneSixth: "\u2159",
  oneEighth: "\u215B",
  twoThirds: "\u2154",
  twoFifths: "\u2156",
  threeQuarters: "\xBE",
  threeFifths: "\u2157",
  threeEighths: "\u215C",
  fourFifths: "\u2158",
  fiveSixths: "\u215A",
  fiveEighths: "\u215D",
  sevenEighths: "\u215E",
  line: "\u2500",
  lineBold: "\u2501",
  lineDouble: "\u2550",
  lineDashed0: "\u2504",
  lineDashed1: "\u2505",
  lineDashed2: "\u2508",
  lineDashed3: "\u2509",
  lineDashed4: "\u254C",
  lineDashed5: "\u254D",
  lineDashed6: "\u2574",
  lineDashed7: "\u2576",
  lineDashed8: "\u2578",
  lineDashed9: "\u257A",
  lineDashed10: "\u257C",
  lineDashed11: "\u257E",
  lineDashed12: "\u2212",
  lineDashed13: "\u2013",
  lineDashed14: "\u2010",
  lineDashed15: "\u2043",
  lineVertical: "\u2502",
  lineVerticalBold: "\u2503",
  lineVerticalDouble: "\u2551",
  lineVerticalDashed0: "\u2506",
  lineVerticalDashed1: "\u2507",
  lineVerticalDashed2: "\u250A",
  lineVerticalDashed3: "\u250B",
  lineVerticalDashed4: "\u254E",
  lineVerticalDashed5: "\u254F",
  lineVerticalDashed6: "\u2575",
  lineVerticalDashed7: "\u2577",
  lineVerticalDashed8: "\u2579",
  lineVerticalDashed9: "\u257B",
  lineVerticalDashed10: "\u257D",
  lineVerticalDashed11: "\u257F",
  lineDownLeft: "\u2510",
  lineDownLeftArc: "\u256E",
  lineDownBoldLeftBold: "\u2513",
  lineDownBoldLeft: "\u2512",
  lineDownLeftBold: "\u2511",
  lineDownDoubleLeftDouble: "\u2557",
  lineDownDoubleLeft: "\u2556",
  lineDownLeftDouble: "\u2555",
  lineDownRight: "\u250C",
  lineDownRightArc: "\u256D",
  lineDownBoldRightBold: "\u250F",
  lineDownBoldRight: "\u250E",
  lineDownRightBold: "\u250D",
  lineDownDoubleRightDouble: "\u2554",
  lineDownDoubleRight: "\u2553",
  lineDownRightDouble: "\u2552",
  lineUpLeft: "\u2518",
  lineUpLeftArc: "\u256F",
  lineUpBoldLeftBold: "\u251B",
  lineUpBoldLeft: "\u251A",
  lineUpLeftBold: "\u2519",
  lineUpDoubleLeftDouble: "\u255D",
  lineUpDoubleLeft: "\u255C",
  lineUpLeftDouble: "\u255B",
  lineUpRight: "\u2514",
  lineUpRightArc: "\u2570",
  lineUpBoldRightBold: "\u2517",
  lineUpBoldRight: "\u2516",
  lineUpRightBold: "\u2515",
  lineUpDoubleRightDouble: "\u255A",
  lineUpDoubleRight: "\u2559",
  lineUpRightDouble: "\u2558",
  lineUpDownLeft: "\u2524",
  lineUpBoldDownBoldLeftBold: "\u252B",
  lineUpBoldDownBoldLeft: "\u2528",
  lineUpDownLeftBold: "\u2525",
  lineUpBoldDownLeftBold: "\u2529",
  lineUpDownBoldLeftBold: "\u252A",
  lineUpDownBoldLeft: "\u2527",
  lineUpBoldDownLeft: "\u2526",
  lineUpDoubleDownDoubleLeftDouble: "\u2563",
  lineUpDoubleDownDoubleLeft: "\u2562",
  lineUpDownLeftDouble: "\u2561",
  lineUpDownRight: "\u251C",
  lineUpBoldDownBoldRightBold: "\u2523",
  lineUpBoldDownBoldRight: "\u2520",
  lineUpDownRightBold: "\u251D",
  lineUpBoldDownRightBold: "\u2521",
  lineUpDownBoldRightBold: "\u2522",
  lineUpDownBoldRight: "\u251F",
  lineUpBoldDownRight: "\u251E",
  lineUpDoubleDownDoubleRightDouble: "\u2560",
  lineUpDoubleDownDoubleRight: "\u255F",
  lineUpDownRightDouble: "\u255E",
  lineDownLeftRight: "\u252C",
  lineDownBoldLeftBoldRightBold: "\u2533",
  lineDownLeftBoldRightBold: "\u252F",
  lineDownBoldLeftRight: "\u2530",
  lineDownBoldLeftBoldRight: "\u2531",
  lineDownBoldLeftRightBold: "\u2532",
  lineDownLeftRightBold: "\u252E",
  lineDownLeftBoldRight: "\u252D",
  lineDownDoubleLeftDoubleRightDouble: "\u2566",
  lineDownDoubleLeftRight: "\u2565",
  lineDownLeftDoubleRightDouble: "\u2564",
  lineUpLeftRight: "\u2534",
  lineUpBoldLeftBoldRightBold: "\u253B",
  lineUpLeftBoldRightBold: "\u2537",
  lineUpBoldLeftRight: "\u2538",
  lineUpBoldLeftBoldRight: "\u2539",
  lineUpBoldLeftRightBold: "\u253A",
  lineUpLeftRightBold: "\u2536",
  lineUpLeftBoldRight: "\u2535",
  lineUpDoubleLeftDoubleRightDouble: "\u2569",
  lineUpDoubleLeftRight: "\u2568",
  lineUpLeftDoubleRightDouble: "\u2567",
  lineUpDownLeftRight: "\u253C",
  lineUpBoldDownBoldLeftBoldRightBold: "\u254B",
  lineUpDownBoldLeftBoldRightBold: "\u2548",
  lineUpBoldDownLeftBoldRightBold: "\u2547",
  lineUpBoldDownBoldLeftRightBold: "\u254A",
  lineUpBoldDownBoldLeftBoldRight: "\u2549",
  lineUpBoldDownLeftRight: "\u2540",
  lineUpDownBoldLeftRight: "\u2541",
  lineUpDownLeftBoldRight: "\u253D",
  lineUpDownLeftRightBold: "\u253E",
  lineUpBoldDownBoldLeftRight: "\u2542",
  lineUpDownLeftBoldRightBold: "\u253F",
  lineUpBoldDownLeftBoldRight: "\u2543",
  lineUpBoldDownLeftRightBold: "\u2544",
  lineUpDownBoldLeftBoldRight: "\u2545",
  lineUpDownBoldLeftRightBold: "\u2546",
  lineUpDoubleDownDoubleLeftDoubleRightDouble: "\u256C",
  lineUpDoubleDownDoubleLeftRight: "\u256B",
  lineUpDownLeftDoubleRightDouble: "\u256A",
  lineCross: "\u2573",
  lineBackslash: "\u2572",
  lineSlash: "\u2571"
};
var specialMainSymbols = {
  tick: "\u2714",
  info: "\u2139",
  warning: "\u26A0",
  cross: "\u2718",
  squareSmall: "\u25FB",
  squareSmallFilled: "\u25FC",
  circle: "\u25EF",
  circleFilled: "\u25C9",
  circleDotted: "\u25CC",
  circleDouble: "\u25CE",
  circleCircle: "\u24DE",
  circleCross: "\u24E7",
  circlePipe: "\u24BE",
  radioOn: "\u25C9",
  radioOff: "\u25EF",
  checkboxOn: "\u2612",
  checkboxOff: "\u2610",
  checkboxCircleOn: "\u24E7",
  checkboxCircleOff: "\u24BE",
  pointer: "\u276F",
  triangleUpOutline: "\u25B3",
  triangleLeft: "\u25C0",
  triangleRight: "\u25B6",
  lozenge: "\u25C6",
  lozengeOutline: "\u25C7",
  hamburger: "\u2630",
  smiley: "\u32E1",
  mustache: "\u0DF4",
  star: "\u2605",
  play: "\u25B6",
  nodejs: "\u2B22",
  oneSeventh: "\u2150",
  oneNinth: "\u2151",
  oneTenth: "\u2152"
};
var specialFallbackSymbols = {
  tick: "\u221A",
  info: "i",
  warning: "\u203C",
  cross: "\xD7",
  squareSmall: "\u25A1",
  squareSmallFilled: "\u25A0",
  circle: "( )",
  circleFilled: "(*)",
  circleDotted: "( )",
  circleDouble: "( )",
  circleCircle: "(\u25CB)",
  circleCross: "(\xD7)",
  circlePipe: "(\u2502)",
  radioOn: "(*)",
  radioOff: "( )",
  checkboxOn: "[\xD7]",
  checkboxOff: "[ ]",
  checkboxCircleOn: "(\xD7)",
  checkboxCircleOff: "( )",
  pointer: ">",
  triangleUpOutline: "\u2206",
  triangleLeft: "\u25C4",
  triangleRight: "\u25BA",
  lozenge: "\u2666",
  lozengeOutline: "\u25CA",
  hamburger: "\u2261",
  smiley: "\u263A",
  mustache: "\u250C\u2500\u2510",
  star: "\u2736",
  play: "\u25BA",
  nodejs: "\u2666",
  oneSeventh: "1/7",
  oneNinth: "1/9",
  oneTenth: "1/10"
};
var mainSymbols = { ...common, ...specialMainSymbols };
var fallbackSymbols = { ...common, ...specialFallbackSymbols };
var shouldUseMain = isUnicodeSupported();
var figures = shouldUseMain ? mainSymbols : fallbackSymbols;
var figures_default = figures;
var replacements = Object.entries(specialMainSymbols);

// node_modules/yoctocolors/base.js
import tty from "node:tty";
var hasColors = tty?.WriteStream?.prototype?.hasColors?.() ?? false;
var format = (open, close) => {
  if (!hasColors) {
    return (input2) => input2;
  }
  const openCode = `\x1B[${open}m`;
  const closeCode = `\x1B[${close}m`;
  return (input2) => {
    const string = input2 + "";
    let index = string.indexOf(closeCode);
    if (index === -1) {
      return openCode + string + closeCode;
    }
    let result = openCode;
    let lastIndex = 0;
    const reopenOnNestedClose = close === 22;
    const replaceCode = (reopenOnNestedClose ? closeCode : "") + openCode;
    while (index !== -1) {
      result += string.slice(lastIndex, index) + replaceCode;
      lastIndex = index + closeCode.length;
      index = string.indexOf(closeCode, lastIndex);
    }
    result += string.slice(lastIndex) + closeCode;
    return result;
  };
};
var reset = format(0, 0);
var bold = format(1, 22);
var dim = format(2, 22);
var italic = format(3, 23);
var underline = format(4, 24);
var overline = format(53, 55);
var inverse = format(7, 27);
var hidden = format(8, 28);
var strikethrough = format(9, 29);
var black = format(30, 39);
var red = format(31, 39);
var green = format(32, 39);
var yellow = format(33, 39);
var blue = format(34, 39);
var magenta = format(35, 39);
var cyan = format(36, 39);
var white = format(37, 39);
var gray = format(90, 39);
var bgBlack = format(40, 49);
var bgRed = format(41, 49);
var bgGreen = format(42, 49);
var bgYellow = format(43, 49);
var bgBlue = format(44, 49);
var bgMagenta = format(45, 49);
var bgCyan = format(46, 49);
var bgWhite = format(47, 49);
var bgGray = format(100, 49);
var redBright = format(91, 39);
var greenBright = format(92, 39);
var yellowBright = format(93, 39);
var blueBright = format(94, 39);
var magentaBright = format(95, 39);
var cyanBright = format(96, 39);
var whiteBright = format(97, 39);
var bgRedBright = format(101, 49);
var bgGreenBright = format(102, 49);
var bgYellowBright = format(103, 49);
var bgBlueBright = format(104, 49);
var bgMagentaBright = format(105, 49);
var bgCyanBright = format(106, 49);
var bgWhiteBright = format(107, 49);

// node_modules/execa/lib/verbose/default.js
var defaultVerboseFunction = ({
  type,
  message,
  timestamp,
  piped,
  commandId,
  result: { failed = false } = {},
  options: { reject = true }
}) => {
  const timestampString = serializeTimestamp(timestamp);
  const icon = ICONS[type]({ failed, reject, piped });
  const color = COLORS[type]({ reject });
  return `${gray(`[${timestampString}]`)} ${gray(`[${commandId}]`)} ${color(icon)} ${color(message)}`;
};
var serializeTimestamp = (timestamp) => `${padField(timestamp.getHours(), 2)}:${padField(timestamp.getMinutes(), 2)}:${padField(timestamp.getSeconds(), 2)}.${padField(timestamp.getMilliseconds(), 3)}`;
var padField = (field, padding) => String(field).padStart(padding, "0");
var getFinalIcon = ({ failed, reject }) => {
  if (!failed) {
    return figures_default.tick;
  }
  return reject ? figures_default.cross : figures_default.warning;
};
var ICONS = {
  command: ({ piped }) => piped ? "|" : "$",
  output: () => " ",
  ipc: () => "*",
  error: getFinalIcon,
  duration: getFinalIcon
};
var identity = (string) => string;
var COLORS = {
  command: () => bold,
  output: () => identity,
  ipc: () => identity,
  error: ({ reject }) => reject ? redBright : yellowBright,
  duration: () => gray
};

// node_modules/execa/lib/verbose/custom.js
var applyVerboseOnLines = (printedLines, verboseInfo, fdNumber) => {
  const verboseFunction = getVerboseFunction(verboseInfo, fdNumber);
  return printedLines.map(({ verboseLine, verboseObject }) => applyVerboseFunction(verboseLine, verboseObject, verboseFunction)).filter((printedLine) => printedLine !== void 0).map((printedLine) => appendNewline(printedLine)).join("");
};
var applyVerboseFunction = (verboseLine, verboseObject, verboseFunction) => {
  if (verboseFunction === void 0) {
    return verboseLine;
  }
  const printedLine = verboseFunction(verboseLine, verboseObject);
  if (typeof printedLine === "string") {
    return printedLine;
  }
};
var appendNewline = (printedLine) => printedLine.endsWith("\n") ? printedLine : `${printedLine}
`;

// node_modules/execa/lib/verbose/log.js
var verboseLog = ({ type, verboseMessage, fdNumber, verboseInfo, result }) => {
  const verboseObject = getVerboseObject({ type, result, verboseInfo });
  const printedLines = getPrintedLines(verboseMessage, verboseObject);
  const finalLines = applyVerboseOnLines(printedLines, verboseInfo, fdNumber);
  if (finalLines !== "") {
    console.warn(finalLines.slice(0, -1));
  }
};
var getVerboseObject = ({
  type,
  result,
  verboseInfo: { escapedCommand, commandId, rawOptions: { piped = false, ...options } }
}) => ({
  type,
  escapedCommand,
  commandId: `${commandId}`,
  timestamp: /* @__PURE__ */ new Date(),
  piped,
  result,
  options
});
var getPrintedLines = (verboseMessage, verboseObject) => verboseMessage.split("\n").map((message) => getPrintedLine({ ...verboseObject, message }));
var getPrintedLine = (verboseObject) => {
  const verboseLine = defaultVerboseFunction(verboseObject);
  return { verboseLine, verboseObject };
};
var serializeVerboseMessage = (message) => {
  const messageString = typeof message === "string" ? message : inspect(message);
  const escapedMessage = escapeLines(messageString);
  return escapedMessage.replaceAll("	", " ".repeat(TAB_SIZE));
};
var TAB_SIZE = 2;

// node_modules/execa/lib/verbose/start.js
var logCommand = (escapedCommand, verboseInfo) => {
  if (!isVerbose(verboseInfo)) {
    return;
  }
  verboseLog({
    type: "command",
    verboseMessage: escapedCommand,
    verboseInfo
  });
};

// node_modules/execa/lib/verbose/info.js
var getVerboseInfo = (verbose, escapedCommand, rawOptions) => {
  validateVerbose(verbose);
  const commandId = getCommandId(verbose);
  return {
    verbose,
    escapedCommand,
    commandId,
    rawOptions
  };
};
var getCommandId = (verbose) => isVerbose({ verbose }) ? COMMAND_ID++ : void 0;
var COMMAND_ID = 0n;
var validateVerbose = (verbose) => {
  for (const fdVerbose of verbose) {
    if (fdVerbose === false) {
      throw new TypeError(`The "verbose: false" option was renamed to "verbose: 'none'".`);
    }
    if (fdVerbose === true) {
      throw new TypeError(`The "verbose: true" option was renamed to "verbose: 'short'".`);
    }
    if (!VERBOSE_VALUES.includes(fdVerbose) && !isVerboseFunction(fdVerbose)) {
      const allowedValues = VERBOSE_VALUES.map((allowedValue) => `'${allowedValue}'`).join(", ");
      throw new TypeError(`The "verbose" option must not be ${fdVerbose}. Allowed values are: ${allowedValues} or a function.`);
    }
  }
};

// node_modules/execa/lib/return/duration.js
import { hrtime } from "node:process";
var getStartTime = () => hrtime.bigint();
var getDurationMs = (startTime) => Number(hrtime.bigint() - startTime) / 1e6;

// node_modules/execa/lib/arguments/command.js
var handleCommand = (filePath, rawArguments, rawOptions) => {
  const startTime = getStartTime();
  const { command, escapedCommand } = joinCommand(filePath, rawArguments);
  const verbose = normalizeFdSpecificOption(rawOptions, "verbose");
  const verboseInfo = getVerboseInfo(verbose, escapedCommand, { ...rawOptions });
  logCommand(escapedCommand, verboseInfo);
  return {
    command,
    escapedCommand,
    startTime,
    verboseInfo
  };
};

// node_modules/execa/lib/arguments/options.js
var import_cross_spawn = __toESM(require_cross_spawn(), 1);
import path8 from "node:path";
import process6 from "node:process";

// node_modules/npm-run-path/index.js
import process4 from "node:process";
import path5 from "node:path";

// node_modules/npm-run-path/node_modules/path-key/index.js
function pathKey(options = {}) {
  const {
    env = process.env,
    platform: platform2 = process.platform
  } = options;
  if (platform2 !== "win32") {
    return "PATH";
  }
  return Object.keys(env).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
}

// node_modules/unicorn-magic/node.js
import { promisify } from "node:util";
import { execFile as execFileCallback, execFileSync as execFileSyncOriginal } from "node:child_process";
import path4 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var execFileOriginal = promisify(execFileCallback);
function toPath(urlOrPath) {
  return urlOrPath instanceof URL ? fileURLToPath2(urlOrPath) : urlOrPath;
}
function traversePathUp(startPath) {
  return {
    *[Symbol.iterator]() {
      let currentPath = path4.resolve(toPath(startPath));
      let previousPath;
      while (previousPath !== currentPath) {
        yield currentPath;
        previousPath = currentPath;
        currentPath = path4.resolve(currentPath, "..");
      }
    }
  };
}
var TEN_MEGABYTES_IN_BYTES = 10 * 1024 * 1024;

// node_modules/npm-run-path/index.js
var npmRunPath = ({
  cwd = process4.cwd(),
  path: pathOption = process4.env[pathKey()],
  preferLocal = true,
  execPath: execPath2 = process4.execPath,
  addExecPath = true
} = {}) => {
  const cwdPath = path5.resolve(toPath(cwd));
  const result = [];
  const pathParts = pathOption.split(path5.delimiter);
  if (preferLocal) {
    applyPreferLocal(result, pathParts, cwdPath);
  }
  if (addExecPath) {
    applyExecPath(result, pathParts, execPath2, cwdPath);
  }
  return pathOption === "" || pathOption === path5.delimiter ? `${result.join(path5.delimiter)}${pathOption}` : [...result, pathOption].join(path5.delimiter);
};
var applyPreferLocal = (result, pathParts, cwdPath) => {
  for (const directory of traversePathUp(cwdPath)) {
    const pathPart = path5.join(directory, "node_modules/.bin");
    if (!pathParts.includes(pathPart)) {
      result.push(pathPart);
    }
  }
};
var applyExecPath = (result, pathParts, execPath2, cwdPath) => {
  const pathPart = path5.resolve(cwdPath, toPath(execPath2), "..");
  if (!pathParts.includes(pathPart)) {
    result.push(pathPart);
  }
};
var npmRunPathEnv = ({ env = process4.env, ...options } = {}) => {
  env = { ...env };
  const pathName = pathKey({ env });
  options.path = env[pathName];
  env[pathName] = npmRunPath(options);
  return env;
};

// node_modules/execa/lib/terminate/kill.js
import { setTimeout as setTimeout2 } from "node:timers/promises";

// node_modules/execa/lib/return/final-error.js
var getFinalError = (originalError, message, isSync) => {
  const ErrorClass = isSync ? ExecaSyncError : ExecaError;
  const options = originalError instanceof DiscardedError ? {} : { cause: originalError };
  return new ErrorClass(message, options);
};
var DiscardedError = class extends Error {
};
var setErrorName = (ErrorClass, value) => {
  Object.defineProperty(ErrorClass.prototype, "name", {
    value,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(ErrorClass.prototype, execaErrorSymbol, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });
};
var isExecaError = (error) => isErrorInstance(error) && execaErrorSymbol in error;
var execaErrorSymbol = Symbol("isExecaError");
var isErrorInstance = (value) => Object.prototype.toString.call(value) === "[object Error]";
var ExecaError = class extends Error {
};
setErrorName(ExecaError, ExecaError.name);
var ExecaSyncError = class extends Error {
};
setErrorName(ExecaSyncError, ExecaSyncError.name);

// node_modules/execa/lib/terminate/signal.js
import { constants as constants3 } from "node:os";

// node_modules/human-signals/build/src/main.js
import { constants as constants2 } from "node:os";

// node_modules/human-signals/build/src/realtime.js
var getRealtimeSignals = () => {
  const length = SIGRTMAX - SIGRTMIN + 1;
  return Array.from({ length }, getRealtimeSignal);
};
var getRealtimeSignal = (value, index) => ({
  name: `SIGRT${index + 1}`,
  number: SIGRTMIN + index,
  action: "terminate",
  description: "Application-specific signal (realtime)",
  standard: "posix"
});
var SIGRTMIN = 34;
var SIGRTMAX = 64;

// node_modules/human-signals/build/src/signals.js
import { constants } from "node:os";

// node_modules/human-signals/build/src/core.js
var SIGNALS = [
  {
    name: "SIGHUP",
    number: 1,
    action: "terminate",
    description: "Terminal closed",
    standard: "posix"
  },
  {
    name: "SIGINT",
    number: 2,
    action: "terminate",
    description: "User interruption with CTRL-C",
    standard: "ansi"
  },
  {
    name: "SIGQUIT",
    number: 3,
    action: "core",
    description: "User interruption with CTRL-\\",
    standard: "posix"
  },
  {
    name: "SIGILL",
    number: 4,
    action: "core",
    description: "Invalid machine instruction",
    standard: "ansi"
  },
  {
    name: "SIGTRAP",
    number: 5,
    action: "core",
    description: "Debugger breakpoint",
    standard: "posix"
  },
  {
    name: "SIGABRT",
    number: 6,
    action: "core",
    description: "Aborted",
    standard: "ansi"
  },
  {
    name: "SIGIOT",
    number: 6,
    action: "core",
    description: "Aborted",
    standard: "bsd"
  },
  {
    name: "SIGBUS",
    number: 7,
    action: "core",
    description: "Bus error due to misaligned, non-existing address or paging error",
    standard: "bsd"
  },
  {
    name: "SIGEMT",
    number: 7,
    action: "terminate",
    description: "Command should be emulated but is not implemented",
    standard: "other"
  },
  {
    name: "SIGFPE",
    number: 8,
    action: "core",
    description: "Floating point arithmetic error",
    standard: "ansi"
  },
  {
    name: "SIGKILL",
    number: 9,
    action: "terminate",
    description: "Forced termination",
    standard: "posix",
    forced: true
  },
  {
    name: "SIGUSR1",
    number: 10,
    action: "terminate",
    description: "Application-specific signal",
    standard: "posix"
  },
  {
    name: "SIGSEGV",
    number: 11,
    action: "core",
    description: "Segmentation fault",
    standard: "ansi"
  },
  {
    name: "SIGUSR2",
    number: 12,
    action: "terminate",
    description: "Application-specific signal",
    standard: "posix"
  },
  {
    name: "SIGPIPE",
    number: 13,
    action: "terminate",
    description: "Broken pipe or socket",
    standard: "posix"
  },
  {
    name: "SIGALRM",
    number: 14,
    action: "terminate",
    description: "Timeout or timer",
    standard: "posix"
  },
  {
    name: "SIGTERM",
    number: 15,
    action: "terminate",
    description: "Termination",
    standard: "ansi"
  },
  {
    name: "SIGSTKFLT",
    number: 16,
    action: "terminate",
    description: "Stack is empty or overflowed",
    standard: "other"
  },
  {
    name: "SIGCHLD",
    number: 17,
    action: "ignore",
    description: "Child process terminated, paused or unpaused",
    standard: "posix"
  },
  {
    name: "SIGCLD",
    number: 17,
    action: "ignore",
    description: "Child process terminated, paused or unpaused",
    standard: "other"
  },
  {
    name: "SIGCONT",
    number: 18,
    action: "unpause",
    description: "Unpaused",
    standard: "posix",
    forced: true
  },
  {
    name: "SIGSTOP",
    number: 19,
    action: "pause",
    description: "Paused",
    standard: "posix",
    forced: true
  },
  {
    name: "SIGTSTP",
    number: 20,
    action: "pause",
    description: 'Paused using CTRL-Z or "suspend"',
    standard: "posix"
  },
  {
    name: "SIGTTIN",
    number: 21,
    action: "pause",
    description: "Background process cannot read terminal input",
    standard: "posix"
  },
  {
    name: "SIGBREAK",
    number: 21,
    action: "terminate",
    description: "User interruption with CTRL-BREAK",
    standard: "other"
  },
  {
    name: "SIGTTOU",
    number: 22,
    action: "pause",
    description: "Background process cannot write to terminal output",
    standard: "posix"
  },
  {
    name: "SIGURG",
    number: 23,
    action: "ignore",
    description: "Socket received out-of-band data",
    standard: "bsd"
  },
  {
    name: "SIGXCPU",
    number: 24,
    action: "core",
    description: "Process timed out",
    standard: "bsd"
  },
  {
    name: "SIGXFSZ",
    number: 25,
    action: "core",
    description: "File too big",
    standard: "bsd"
  },
  {
    name: "SIGVTALRM",
    number: 26,
    action: "terminate",
    description: "Timeout or timer",
    standard: "bsd"
  },
  {
    name: "SIGPROF",
    number: 27,
    action: "terminate",
    description: "Timeout or timer",
    standard: "bsd"
  },
  {
    name: "SIGWINCH",
    number: 28,
    action: "ignore",
    description: "Terminal window size changed",
    standard: "bsd"
  },
  {
    name: "SIGIO",
    number: 29,
    action: "terminate",
    description: "I/O is available",
    standard: "other"
  },
  {
    name: "SIGPOLL",
    number: 29,
    action: "terminate",
    description: "Watched event",
    standard: "other"
  },
  {
    name: "SIGINFO",
    number: 29,
    action: "ignore",
    description: "Request for process information",
    standard: "other"
  },
  {
    name: "SIGPWR",
    number: 30,
    action: "terminate",
    description: "Device running out of power",
    standard: "systemv"
  },
  {
    name: "SIGSYS",
    number: 31,
    action: "core",
    description: "Invalid system call",
    standard: "other"
  },
  {
    name: "SIGUNUSED",
    number: 31,
    action: "terminate",
    description: "Invalid system call",
    standard: "other"
  }
];

// node_modules/human-signals/build/src/signals.js
var getSignals = () => {
  const realtimeSignals = getRealtimeSignals();
  const signals2 = [...SIGNALS, ...realtimeSignals].map(normalizeSignal);
  return signals2;
};
var normalizeSignal = ({
  name,
  number: defaultNumber,
  description,
  action,
  forced = false,
  standard
}) => {
  const {
    signals: { [name]: constantSignal }
  } = constants;
  const supported = constantSignal !== void 0;
  const number = supported ? constantSignal : defaultNumber;
  return { name, number, description, supported, action, forced, standard };
};

// node_modules/human-signals/build/src/main.js
var getSignalsByName = () => {
  const signals2 = getSignals();
  return Object.fromEntries(signals2.map(getSignalByName));
};
var getSignalByName = ({
  name,
  number,
  description,
  supported,
  action,
  forced,
  standard
}) => [name, { name, number, description, supported, action, forced, standard }];
var signalsByName = getSignalsByName();
var getSignalsByNumber = () => {
  const signals2 = getSignals();
  const length = SIGRTMAX + 1;
  const signalsA = Array.from(
    { length },
    (value, number) => getSignalByNumber(number, signals2)
  );
  return Object.assign({}, ...signalsA);
};
var getSignalByNumber = (number, signals2) => {
  const signal = findSignalByNumber(number, signals2);
  if (signal === void 0) {
    return {};
  }
  const { name, description, supported, action, forced, standard } = signal;
  return {
    [number]: {
      name,
      number,
      description,
      supported,
      action,
      forced,
      standard
    }
  };
};
var findSignalByNumber = (number, signals2) => {
  const signal = signals2.find(({ name }) => constants2.signals[name] === number);
  if (signal !== void 0) {
    return signal;
  }
  return signals2.find((signalA) => signalA.number === number);
};
var signalsByNumber = getSignalsByNumber();

// node_modules/execa/lib/terminate/signal.js
var normalizeKillSignal = (killSignal) => {
  const optionName = "option `killSignal`";
  if (killSignal === 0) {
    throw new TypeError(`Invalid ${optionName}: 0 cannot be used.`);
  }
  return normalizeSignal2(killSignal, optionName);
};
var normalizeSignalArgument = (signal) => signal === 0 ? signal : normalizeSignal2(signal, "`subprocess.kill()`'s argument");
var normalizeSignal2 = (signalNameOrInteger, optionName) => {
  if (Number.isInteger(signalNameOrInteger)) {
    return normalizeSignalInteger(signalNameOrInteger, optionName);
  }
  if (typeof signalNameOrInteger === "string") {
    return normalizeSignalName(signalNameOrInteger, optionName);
  }
  throw new TypeError(`Invalid ${optionName} ${String(signalNameOrInteger)}: it must be a string or an integer.
${getAvailableSignals()}`);
};
var normalizeSignalInteger = (signalInteger, optionName) => {
  if (signalsIntegerToName.has(signalInteger)) {
    return signalsIntegerToName.get(signalInteger);
  }
  throw new TypeError(`Invalid ${optionName} ${signalInteger}: this signal integer does not exist.
${getAvailableSignals()}`);
};
var getSignalsIntegerToName = () => new Map(Object.entries(constants3.signals).reverse().map(([signalName, signalInteger]) => [signalInteger, signalName]));
var signalsIntegerToName = getSignalsIntegerToName();
var normalizeSignalName = (signalName, optionName) => {
  if (signalName in constants3.signals) {
    return signalName;
  }
  if (signalName.toUpperCase() in constants3.signals) {
    throw new TypeError(`Invalid ${optionName} '${signalName}': please rename it to '${signalName.toUpperCase()}'.`);
  }
  throw new TypeError(`Invalid ${optionName} '${signalName}': this signal name does not exist.
${getAvailableSignals()}`);
};
var getAvailableSignals = () => `Available signal names: ${getAvailableSignalNames()}.
Available signal numbers: ${getAvailableSignalIntegers()}.`;
var getAvailableSignalNames = () => Object.keys(constants3.signals).sort().map((signalName) => `'${signalName}'`).join(", ");
var getAvailableSignalIntegers = () => [...new Set(Object.values(constants3.signals).sort((signalInteger, signalIntegerTwo) => signalInteger - signalIntegerTwo))].join(", ");
var getSignalDescription = (signal) => signalsByName[signal].description;

// node_modules/execa/lib/terminate/kill.js
var normalizeForceKillAfterDelay = (forceKillAfterDelay) => {
  if (forceKillAfterDelay === false) {
    return forceKillAfterDelay;
  }
  if (forceKillAfterDelay === true) {
    return DEFAULT_FORCE_KILL_TIMEOUT;
  }
  if (!Number.isFinite(forceKillAfterDelay) || forceKillAfterDelay < 0) {
    throw new TypeError(`Expected the \`forceKillAfterDelay\` option to be a non-negative integer, got \`${forceKillAfterDelay}\` (${typeof forceKillAfterDelay})`);
  }
  return forceKillAfterDelay;
};
var DEFAULT_FORCE_KILL_TIMEOUT = 1e3 * 5;
var subprocessKill = ({ kill, options: { forceKillAfterDelay, killSignal }, onInternalError, context, controller }, signalOrError, errorArgument) => {
  const { signal, error } = parseKillArguments(signalOrError, errorArgument, killSignal);
  emitKillError(error, onInternalError);
  const killResult = kill(signal);
  setKillTimeout({
    kill,
    signal,
    forceKillAfterDelay,
    killSignal,
    killResult,
    context,
    controller
  });
  return killResult;
};
var parseKillArguments = (signalOrError, errorArgument, killSignal) => {
  const [signal = killSignal, error] = isErrorInstance(signalOrError) ? [void 0, signalOrError] : [signalOrError, errorArgument];
  if (typeof signal !== "string" && !Number.isInteger(signal)) {
    throw new TypeError(`The first argument must be an error instance or a signal name string/integer: ${String(signal)}`);
  }
  if (error !== void 0 && !isErrorInstance(error)) {
    throw new TypeError(`The second argument is optional. If specified, it must be an error instance: ${error}`);
  }
  return { signal: normalizeSignalArgument(signal), error };
};
var emitKillError = (error, onInternalError) => {
  if (error !== void 0) {
    onInternalError.reject(error);
  }
};
var setKillTimeout = async ({ kill, signal, forceKillAfterDelay, killSignal, killResult, context, controller }) => {
  if (signal === killSignal && killResult) {
    killOnTimeout({
      kill,
      forceKillAfterDelay,
      context,
      controllerSignal: controller.signal
    });
  }
};
var killOnTimeout = async ({ kill, forceKillAfterDelay, context, controllerSignal }) => {
  if (forceKillAfterDelay === false) {
    return;
  }
  try {
    await setTimeout2(forceKillAfterDelay, void 0, { signal: controllerSignal });
    if (kill("SIGKILL")) {
      context.isForcefullyTerminated ??= true;
    }
  } catch {
  }
};

// node_modules/execa/lib/utils/abort-signal.js
import { once } from "node:events";
var onAbortedSignal = async (mainSignal, stopSignal) => {
  if (!mainSignal.aborted) {
    await once(mainSignal, "abort", { signal: stopSignal });
  }
};

// node_modules/execa/lib/terminate/cancel.js
var validateCancelSignal = ({ cancelSignal }) => {
  if (cancelSignal !== void 0 && Object.prototype.toString.call(cancelSignal) !== "[object AbortSignal]") {
    throw new Error(`The \`cancelSignal\` option must be an AbortSignal: ${String(cancelSignal)}`);
  }
};
var throwOnCancel = ({ subprocess, cancelSignal, gracefulCancel, context, controller }) => cancelSignal === void 0 || gracefulCancel ? [] : [terminateOnCancel(subprocess, cancelSignal, context, controller)];
var terminateOnCancel = async (subprocess, cancelSignal, context, { signal }) => {
  await onAbortedSignal(cancelSignal, signal);
  context.terminationReason ??= "cancel";
  subprocess.kill();
  throw cancelSignal.reason;
};

// node_modules/execa/lib/ipc/graceful.js
import { scheduler as scheduler2 } from "node:timers/promises";

// node_modules/execa/lib/ipc/send.js
import { promisify as promisify2 } from "node:util";

// node_modules/execa/lib/ipc/validation.js
var validateIpcMethod = ({ methodName, isSubprocess, ipc, isConnected: isConnected2 }) => {
  validateIpcOption(methodName, isSubprocess, ipc);
  validateConnection(methodName, isSubprocess, isConnected2);
};
var validateIpcOption = (methodName, isSubprocess, ipc) => {
  if (!ipc) {
    throw new Error(`${getMethodName(methodName, isSubprocess)} can only be used if the \`ipc\` option is \`true\`.`);
  }
};
var validateConnection = (methodName, isSubprocess, isConnected2) => {
  if (!isConnected2) {
    throw new Error(`${getMethodName(methodName, isSubprocess)} cannot be used: the ${getOtherProcessName(isSubprocess)} has already exited or disconnected.`);
  }
};
var throwOnEarlyDisconnect = (isSubprocess) => {
  throw new Error(`${getMethodName("getOneMessage", isSubprocess)} could not complete: the ${getOtherProcessName(isSubprocess)} exited or disconnected.`);
};
var throwOnStrictDeadlockError = (isSubprocess) => {
  throw new Error(`${getMethodName("sendMessage", isSubprocess)} failed: the ${getOtherProcessName(isSubprocess)} is sending a message too, instead of listening to incoming messages.
This can be fixed by both sending a message and listening to incoming messages at the same time:

const [receivedMessage] = await Promise.all([
	${getMethodName("getOneMessage", isSubprocess)},
	${getMethodName("sendMessage", isSubprocess, "message, {strict: true}")},
]);`);
};
var getStrictResponseError = (error, isSubprocess) => new Error(`${getMethodName("sendMessage", isSubprocess)} failed when sending an acknowledgment response to the ${getOtherProcessName(isSubprocess)}.`, { cause: error });
var throwOnMissingStrict = (isSubprocess) => {
  throw new Error(`${getMethodName("sendMessage", isSubprocess)} failed: the ${getOtherProcessName(isSubprocess)} is not listening to incoming messages.`);
};
var throwOnStrictDisconnect = (isSubprocess) => {
  throw new Error(`${getMethodName("sendMessage", isSubprocess)} failed: the ${getOtherProcessName(isSubprocess)} exited without listening to incoming messages.`);
};
var getAbortDisconnectError = () => new Error(`\`cancelSignal\` aborted: the ${getOtherProcessName(true)} disconnected.`);
var throwOnMissingParent = () => {
  throw new Error("`getCancelSignal()` cannot be used without setting the `cancelSignal` subprocess option.");
};
var handleEpipeError = ({ error, methodName, isSubprocess }) => {
  if (error.code === "EPIPE") {
    throw new Error(`${getMethodName(methodName, isSubprocess)} cannot be used: the ${getOtherProcessName(isSubprocess)} is disconnecting.`, { cause: error });
  }
};
var handleSerializationError = ({ error, methodName, isSubprocess, message }) => {
  if (isSerializationError(error)) {
    throw new Error(`${getMethodName(methodName, isSubprocess)}'s argument type is invalid: the message cannot be serialized: ${String(message)}.`, { cause: error });
  }
};
var isSerializationError = ({ code, message }) => SERIALIZATION_ERROR_CODES.has(code) || SERIALIZATION_ERROR_MESSAGES.some((serializationErrorMessage) => message.includes(serializationErrorMessage));
var SERIALIZATION_ERROR_CODES = /* @__PURE__ */ new Set([
  // Message is `undefined`
  "ERR_MISSING_ARGS",
  // Message is a function, a bigint, a symbol
  "ERR_INVALID_ARG_TYPE"
]);
var SERIALIZATION_ERROR_MESSAGES = [
  // Message is a promise or a proxy, with `serialization: 'advanced'`
  "could not be cloned",
  // Message has cycles, with `serialization: 'json'`
  "circular structure",
  // Message has cycles inside toJSON(), with `serialization: 'json'`
  "call stack size exceeded"
];
var getMethodName = (methodName, isSubprocess, parameters = "") => methodName === "cancelSignal" ? "`cancelSignal`'s `controller.abort()`" : `${getNamespaceName(isSubprocess)}${methodName}(${parameters})`;
var getNamespaceName = (isSubprocess) => isSubprocess ? "" : "subprocess.";
var getOtherProcessName = (isSubprocess) => isSubprocess ? "parent process" : "subprocess";
var disconnect = (anyProcess) => {
  if (anyProcess.connected) {
    anyProcess.disconnect();
  }
};

// node_modules/execa/lib/utils/deferred.js
var createDeferred = () => {
  const methods = {};
  const promise = new Promise((resolve, reject) => {
    Object.assign(methods, { resolve, reject });
  });
  return Object.assign(promise, methods);
};

// node_modules/execa/lib/arguments/fd-options.js
var getToStream = (destination, to = "stdin") => {
  const isWritable = true;
  const { options, fileDescriptors } = SUBPROCESS_OPTIONS.get(destination);
  const fdNumber = getFdNumber(fileDescriptors, to, isWritable);
  const destinationStream = destination.stdio[fdNumber];
  if (destinationStream === null) {
    throw new TypeError(getInvalidStdioOptionMessage(fdNumber, to, options, isWritable));
  }
  return destinationStream;
};
var getFromStream = (source, from = "stdout") => {
  const isWritable = false;
  const { options, fileDescriptors } = SUBPROCESS_OPTIONS.get(source);
  const fdNumber = getFdNumber(fileDescriptors, from, isWritable);
  const sourceStream = fdNumber === "all" ? source.all : source.stdio[fdNumber];
  if (sourceStream === null || sourceStream === void 0) {
    throw new TypeError(getInvalidStdioOptionMessage(fdNumber, from, options, isWritable));
  }
  return sourceStream;
};
var SUBPROCESS_OPTIONS = /* @__PURE__ */ new WeakMap();
var getFdNumber = (fileDescriptors, fdName, isWritable) => {
  const fdNumber = parseFdNumber(fdName, isWritable);
  validateFdNumber(fdNumber, fdName, isWritable, fileDescriptors);
  return fdNumber;
};
var parseFdNumber = (fdName, isWritable) => {
  const fdNumber = parseFd(fdName);
  if (fdNumber !== void 0) {
    return fdNumber;
  }
  const { validOptions, defaultValue } = isWritable ? { validOptions: '"stdin"', defaultValue: "stdin" } : { validOptions: '"stdout", "stderr", "all"', defaultValue: "stdout" };
  throw new TypeError(`"${getOptionName(isWritable)}" must not be "${fdName}".
It must be ${validOptions} or "fd3", "fd4" (and so on).
It is optional and defaults to "${defaultValue}".`);
};
var validateFdNumber = (fdNumber, fdName, isWritable, fileDescriptors) => {
  const fileDescriptor = fileDescriptors[getUsedDescriptor(fdNumber)];
  if (fileDescriptor === void 0) {
    throw new TypeError(`"${getOptionName(isWritable)}" must not be ${fdName}. That file descriptor does not exist.
Please set the "stdio" option to ensure that file descriptor exists.`);
  }
  if (fileDescriptor.direction === "input" && !isWritable) {
    throw new TypeError(`"${getOptionName(isWritable)}" must not be ${fdName}. It must be a readable stream, not writable.`);
  }
  if (fileDescriptor.direction !== "input" && isWritable) {
    throw new TypeError(`"${getOptionName(isWritable)}" must not be ${fdName}. It must be a writable stream, not readable.`);
  }
};
var getInvalidStdioOptionMessage = (fdNumber, fdName, options, isWritable) => {
  if (fdNumber === "all" && !options.all) {
    return `The "all" option must be true to use "from: 'all'".`;
  }
  const { optionName, optionValue } = getInvalidStdioOption(fdNumber, options);
  return `The "${optionName}: ${serializeOptionValue(optionValue)}" option is incompatible with using "${getOptionName(isWritable)}: ${serializeOptionValue(fdName)}".
Please set this option with "pipe" instead.`;
};
var getInvalidStdioOption = (fdNumber, { stdin, stdout, stderr, stdio }) => {
  const usedDescriptor = getUsedDescriptor(fdNumber);
  if (usedDescriptor === 0 && stdin !== void 0) {
    return { optionName: "stdin", optionValue: stdin };
  }
  if (usedDescriptor === 1 && stdout !== void 0) {
    return { optionName: "stdout", optionValue: stdout };
  }
  if (usedDescriptor === 2 && stderr !== void 0) {
    return { optionName: "stderr", optionValue: stderr };
  }
  return { optionName: `stdio[${usedDescriptor}]`, optionValue: stdio[usedDescriptor] };
};
var getUsedDescriptor = (fdNumber) => fdNumber === "all" ? 1 : fdNumber;
var getOptionName = (isWritable) => isWritable ? "to" : "from";
var serializeOptionValue = (value) => {
  if (typeof value === "string") {
    return `'${value}'`;
  }
  return typeof value === "number" ? `${value}` : "Stream";
};

// node_modules/execa/lib/ipc/strict.js
import { once as once3 } from "node:events";

// node_modules/execa/lib/utils/max-listeners.js
import { addAbortListener } from "node:events";
var incrementMaxListeners = (eventEmitter, maxListenersIncrement, signal) => {
  const maxListeners = eventEmitter.getMaxListeners();
  if (maxListeners === 0 || maxListeners === Number.POSITIVE_INFINITY) {
    return;
  }
  eventEmitter.setMaxListeners(maxListeners + maxListenersIncrement);
  addAbortListener(signal, () => {
    eventEmitter.setMaxListeners(eventEmitter.getMaxListeners() - maxListenersIncrement);
  });
};

// node_modules/execa/lib/ipc/forward.js
import { EventEmitter } from "node:events";

// node_modules/execa/lib/ipc/incoming.js
import { once as once2 } from "node:events";
import { scheduler } from "node:timers/promises";

// node_modules/execa/lib/ipc/reference.js
var addReference = (channel, reference) => {
  if (reference) {
    addReferenceCount(channel);
  }
};
var addReferenceCount = (channel) => {
  channel.refCounted();
};
var removeReference = (channel, reference) => {
  if (reference) {
    removeReferenceCount(channel);
  }
};
var removeReferenceCount = (channel) => {
  channel.unrefCounted();
};
var undoAddedReferences = (channel, isSubprocess) => {
  if (isSubprocess) {
    removeReferenceCount(channel);
    removeReferenceCount(channel);
  }
};
var redoAddedReferences = (channel, isSubprocess) => {
  if (isSubprocess) {
    addReferenceCount(channel);
    addReferenceCount(channel);
  }
};

// node_modules/execa/lib/ipc/incoming.js
var onMessage = async ({ anyProcess, channel, isSubprocess, ipcEmitter }, wrappedMessage) => {
  if (handleStrictResponse(wrappedMessage) || handleAbort(wrappedMessage)) {
    return;
  }
  if (!INCOMING_MESSAGES.has(anyProcess)) {
    INCOMING_MESSAGES.set(anyProcess, []);
  }
  const incomingMessages = INCOMING_MESSAGES.get(anyProcess);
  incomingMessages.push(wrappedMessage);
  if (incomingMessages.length > 1) {
    return;
  }
  while (incomingMessages.length > 0) {
    await waitForOutgoingMessages(anyProcess, ipcEmitter, wrappedMessage);
    await scheduler.yield();
    const message = await handleStrictRequest({
      wrappedMessage: incomingMessages[0],
      anyProcess,
      channel,
      isSubprocess,
      ipcEmitter
    });
    incomingMessages.shift();
    ipcEmitter.emit("message", message);
    ipcEmitter.emit("message:done");
  }
};
var onDisconnect = async ({ anyProcess, channel, isSubprocess, ipcEmitter, boundOnMessage }) => {
  abortOnDisconnect();
  const incomingMessages = INCOMING_MESSAGES.get(anyProcess);
  while (incomingMessages?.length > 0) {
    await once2(ipcEmitter, "message:done");
  }
  anyProcess.removeListener("message", boundOnMessage);
  redoAddedReferences(channel, isSubprocess);
  ipcEmitter.connected = false;
  ipcEmitter.emit("disconnect");
};
var INCOMING_MESSAGES = /* @__PURE__ */ new WeakMap();

// node_modules/execa/lib/ipc/forward.js
var getIpcEmitter = (anyProcess, channel, isSubprocess) => {
  if (IPC_EMITTERS.has(anyProcess)) {
    return IPC_EMITTERS.get(anyProcess);
  }
  const ipcEmitter = new EventEmitter();
  ipcEmitter.connected = true;
  IPC_EMITTERS.set(anyProcess, ipcEmitter);
  forwardEvents({
    ipcEmitter,
    anyProcess,
    channel,
    isSubprocess
  });
  return ipcEmitter;
};
var IPC_EMITTERS = /* @__PURE__ */ new WeakMap();
var forwardEvents = ({ ipcEmitter, anyProcess, channel, isSubprocess }) => {
  const boundOnMessage = onMessage.bind(void 0, {
    anyProcess,
    channel,
    isSubprocess,
    ipcEmitter
  });
  anyProcess.on("message", boundOnMessage);
  anyProcess.once("disconnect", onDisconnect.bind(void 0, {
    anyProcess,
    channel,
    isSubprocess,
    ipcEmitter,
    boundOnMessage
  }));
  undoAddedReferences(channel, isSubprocess);
};
var isConnected = (anyProcess) => {
  const ipcEmitter = IPC_EMITTERS.get(anyProcess);
  return ipcEmitter === void 0 ? anyProcess.channel !== null : ipcEmitter.connected;
};

// node_modules/execa/lib/ipc/strict.js
var handleSendStrict = ({ anyProcess, channel, isSubprocess, message, strict }) => {
  if (!strict) {
    return message;
  }
  const ipcEmitter = getIpcEmitter(anyProcess, channel, isSubprocess);
  const hasListeners = hasMessageListeners(anyProcess, ipcEmitter);
  return {
    id: count++,
    type: REQUEST_TYPE,
    message,
    hasListeners
  };
};
var count = 0n;
var validateStrictDeadlock = (outgoingMessages, wrappedMessage) => {
  if (wrappedMessage?.type !== REQUEST_TYPE || wrappedMessage.hasListeners) {
    return;
  }
  for (const { id } of outgoingMessages) {
    if (id !== void 0) {
      STRICT_RESPONSES[id].resolve({ isDeadlock: true, hasListeners: false });
    }
  }
};
var handleStrictRequest = async ({ wrappedMessage, anyProcess, channel, isSubprocess, ipcEmitter }) => {
  if (wrappedMessage?.type !== REQUEST_TYPE || !anyProcess.connected) {
    return wrappedMessage;
  }
  const { id, message } = wrappedMessage;
  const response = { id, type: RESPONSE_TYPE, message: hasMessageListeners(anyProcess, ipcEmitter) };
  try {
    await sendMessage({
      anyProcess,
      channel,
      isSubprocess,
      ipc: true
    }, response);
  } catch (error) {
    ipcEmitter.emit("strict:error", error);
  }
  return message;
};
var handleStrictResponse = (wrappedMessage) => {
  if (wrappedMessage?.type !== RESPONSE_TYPE) {
    return false;
  }
  const { id, message: hasListeners } = wrappedMessage;
  STRICT_RESPONSES[id]?.resolve({ isDeadlock: false, hasListeners });
  return true;
};
var waitForStrictResponse = async (wrappedMessage, anyProcess, isSubprocess) => {
  if (wrappedMessage?.type !== REQUEST_TYPE) {
    return;
  }
  const deferred = createDeferred();
  STRICT_RESPONSES[wrappedMessage.id] = deferred;
  const controller = new AbortController();
  try {
    const { isDeadlock, hasListeners } = await Promise.race([
      deferred,
      throwOnDisconnect(anyProcess, isSubprocess, controller)
    ]);
    if (isDeadlock) {
      throwOnStrictDeadlockError(isSubprocess);
    }
    if (!hasListeners) {
      throwOnMissingStrict(isSubprocess);
    }
  } finally {
    controller.abort();
    delete STRICT_RESPONSES[wrappedMessage.id];
  }
};
var STRICT_RESPONSES = {};
var throwOnDisconnect = async (anyProcess, isSubprocess, { signal }) => {
  incrementMaxListeners(anyProcess, 1, signal);
  await once3(anyProcess, "disconnect", { signal });
  throwOnStrictDisconnect(isSubprocess);
};
var REQUEST_TYPE = "execa:ipc:request";
var RESPONSE_TYPE = "execa:ipc:response";

// node_modules/execa/lib/ipc/outgoing.js
var startSendMessage = (anyProcess, wrappedMessage, strict) => {
  if (!OUTGOING_MESSAGES.has(anyProcess)) {
    OUTGOING_MESSAGES.set(anyProcess, /* @__PURE__ */ new Set());
  }
  const outgoingMessages = OUTGOING_MESSAGES.get(anyProcess);
  const onMessageSent = createDeferred();
  const id = strict ? wrappedMessage.id : void 0;
  const outgoingMessage = { onMessageSent, id };
  outgoingMessages.add(outgoingMessage);
  return { outgoingMessages, outgoingMessage };
};
var endSendMessage = ({ outgoingMessages, outgoingMessage }) => {
  outgoingMessages.delete(outgoingMessage);
  outgoingMessage.onMessageSent.resolve();
};
var waitForOutgoingMessages = async (anyProcess, ipcEmitter, wrappedMessage) => {
  while (!hasMessageListeners(anyProcess, ipcEmitter) && OUTGOING_MESSAGES.get(anyProcess)?.size > 0) {
    const outgoingMessages = [...OUTGOING_MESSAGES.get(anyProcess)];
    validateStrictDeadlock(outgoingMessages, wrappedMessage);
    await Promise.all(outgoingMessages.map(({ onMessageSent }) => onMessageSent));
  }
};
var OUTGOING_MESSAGES = /* @__PURE__ */ new WeakMap();
var hasMessageListeners = (anyProcess, ipcEmitter) => ipcEmitter.listenerCount("message") > getMinListenerCount(anyProcess);
var getMinListenerCount = (anyProcess) => SUBPROCESS_OPTIONS.has(anyProcess) && !getFdSpecificValue(SUBPROCESS_OPTIONS.get(anyProcess).options.buffer, "ipc") ? 1 : 0;

// node_modules/execa/lib/ipc/send.js
var sendMessage = ({ anyProcess, channel, isSubprocess, ipc }, message, { strict = false } = {}) => {
  const methodName = "sendMessage";
  validateIpcMethod({
    methodName,
    isSubprocess,
    ipc,
    isConnected: anyProcess.connected
  });
  return sendMessageAsync({
    anyProcess,
    channel,
    methodName,
    isSubprocess,
    message,
    strict
  });
};
var sendMessageAsync = async ({ anyProcess, channel, methodName, isSubprocess, message, strict }) => {
  const wrappedMessage = handleSendStrict({
    anyProcess,
    channel,
    isSubprocess,
    message,
    strict
  });
  const outgoingMessagesState = startSendMessage(anyProcess, wrappedMessage, strict);
  try {
    await sendOneMessage({
      anyProcess,
      methodName,
      isSubprocess,
      wrappedMessage,
      message
    });
  } catch (error) {
    disconnect(anyProcess);
    throw error;
  } finally {
    endSendMessage(outgoingMessagesState);
  }
};
var sendOneMessage = async ({ anyProcess, methodName, isSubprocess, wrappedMessage, message }) => {
  const sendMethod = getSendMethod(anyProcess);
  try {
    await Promise.all([
      waitForStrictResponse(wrappedMessage, anyProcess, isSubprocess),
      sendMethod(wrappedMessage)
    ]);
  } catch (error) {
    handleEpipeError({ error, methodName, isSubprocess });
    handleSerializationError({
      error,
      methodName,
      isSubprocess,
      message
    });
    throw error;
  }
};
var getSendMethod = (anyProcess) => {
  if (PROCESS_SEND_METHODS.has(anyProcess)) {
    return PROCESS_SEND_METHODS.get(anyProcess);
  }
  const sendMethod = promisify2(anyProcess.send.bind(anyProcess));
  PROCESS_SEND_METHODS.set(anyProcess, sendMethod);
  return sendMethod;
};
var PROCESS_SEND_METHODS = /* @__PURE__ */ new WeakMap();

// node_modules/execa/lib/ipc/graceful.js
var sendAbort = (subprocess, message) => {
  const methodName = "cancelSignal";
  validateConnection(methodName, false, subprocess.connected);
  return sendOneMessage({
    anyProcess: subprocess,
    methodName,
    isSubprocess: false,
    wrappedMessage: { type: GRACEFUL_CANCEL_TYPE, message },
    message
  });
};
var getCancelSignal = async ({ anyProcess, channel, isSubprocess, ipc }) => {
  await startIpc({
    anyProcess,
    channel,
    isSubprocess,
    ipc
  });
  return cancelController.signal;
};
var startIpc = async ({ anyProcess, channel, isSubprocess, ipc }) => {
  if (cancelListening) {
    return;
  }
  cancelListening = true;
  if (!ipc) {
    throwOnMissingParent();
    return;
  }
  if (channel === null) {
    abortOnDisconnect();
    return;
  }
  getIpcEmitter(anyProcess, channel, isSubprocess);
  await scheduler2.yield();
};
var cancelListening = false;
var handleAbort = (wrappedMessage) => {
  if (wrappedMessage?.type !== GRACEFUL_CANCEL_TYPE) {
    return false;
  }
  cancelController.abort(wrappedMessage.message);
  return true;
};
var GRACEFUL_CANCEL_TYPE = "execa:ipc:cancel";
var abortOnDisconnect = () => {
  cancelController.abort(getAbortDisconnectError());
};
var cancelController = new AbortController();

// node_modules/execa/lib/terminate/graceful.js
var validateGracefulCancel = ({ gracefulCancel, cancelSignal, ipc, serialization }) => {
  if (!gracefulCancel) {
    return;
  }
  if (cancelSignal === void 0) {
    throw new Error("The `cancelSignal` option must be defined when setting the `gracefulCancel` option.");
  }
  if (!ipc) {
    throw new Error("The `ipc` option cannot be false when setting the `gracefulCancel` option.");
  }
  if (serialization === "json") {
    throw new Error("The `serialization` option cannot be 'json' when setting the `gracefulCancel` option.");
  }
};
var throwOnGracefulCancel = ({
  subprocess,
  cancelSignal,
  gracefulCancel,
  forceKillAfterDelay,
  context,
  controller
}) => gracefulCancel ? [sendOnAbort({
  subprocess,
  cancelSignal,
  forceKillAfterDelay,
  context,
  controller
})] : [];
var sendOnAbort = async ({ subprocess, cancelSignal, forceKillAfterDelay, context, controller: { signal } }) => {
  await onAbortedSignal(cancelSignal, signal);
  const reason = getReason(cancelSignal);
  await sendAbort(subprocess, reason);
  killOnTimeout({
    kill: subprocess.kill,
    forceKillAfterDelay,
    context,
    controllerSignal: signal
  });
  context.terminationReason ??= "gracefulCancel";
  throw cancelSignal.reason;
};
var getReason = ({ reason }) => {
  if (!(reason instanceof DOMException)) {
    return reason;
  }
  const error = new Error(reason.message);
  Object.defineProperty(error, "stack", {
    value: reason.stack,
    enumerable: false,
    configurable: true,
    writable: true
  });
  return error;
};

// node_modules/execa/lib/terminate/timeout.js
import { setTimeout as setTimeout3 } from "node:timers/promises";
var validateTimeout = ({ timeout }) => {
  if (timeout !== void 0 && (!Number.isFinite(timeout) || timeout < 0)) {
    throw new TypeError(`Expected the \`timeout\` option to be a non-negative integer, got \`${timeout}\` (${typeof timeout})`);
  }
};
var throwOnTimeout = (subprocess, timeout, context, controller) => timeout === 0 || timeout === void 0 ? [] : [killAfterTimeout(subprocess, timeout, context, controller)];
var killAfterTimeout = async (subprocess, timeout, context, { signal }) => {
  await setTimeout3(timeout, void 0, { signal });
  context.terminationReason ??= "timeout";
  subprocess.kill();
  throw new DiscardedError();
};

// node_modules/execa/lib/methods/node.js
import { execPath, execArgv } from "node:process";
import path6 from "node:path";
var mapNode = ({ options }) => {
  if (options.node === false) {
    throw new TypeError('The "node" option cannot be false with `execaNode()`.');
  }
  return { options: { ...options, node: true } };
};
var handleNodeOption = (file, commandArguments, {
  node: shouldHandleNode = false,
  nodePath = execPath,
  nodeOptions = execArgv.filter((nodeOption) => !nodeOption.startsWith("--inspect")),
  cwd,
  execPath: formerNodePath,
  ...options
}) => {
  if (formerNodePath !== void 0) {
    throw new TypeError('The "execPath" option has been removed. Please use the "nodePath" option instead.');
  }
  const normalizedNodePath = safeNormalizeFileUrl(nodePath, 'The "nodePath" option');
  const resolvedNodePath = path6.resolve(cwd, normalizedNodePath);
  const newOptions = {
    ...options,
    nodePath: resolvedNodePath,
    node: shouldHandleNode,
    cwd
  };
  if (!shouldHandleNode) {
    return [file, commandArguments, newOptions];
  }
  if (path6.basename(file, ".exe") === "node") {
    throw new TypeError('When the "node" option is true, the first argument does not need to be "node".');
  }
  return [
    resolvedNodePath,
    [...nodeOptions, file, ...commandArguments],
    { ipc: true, ...newOptions, shell: false }
  ];
};

// node_modules/execa/lib/ipc/ipc-input.js
import { serialize } from "node:v8";
var validateIpcInputOption = ({ ipcInput, ipc, serialization }) => {
  if (ipcInput === void 0) {
    return;
  }
  if (!ipc) {
    throw new Error("The `ipcInput` option cannot be set unless the `ipc` option is `true`.");
  }
  validateIpcInput[serialization](ipcInput);
};
var validateAdvancedInput = (ipcInput) => {
  try {
    serialize(ipcInput);
  } catch (error) {
    throw new Error("The `ipcInput` option is not serializable with a structured clone.", { cause: error });
  }
};
var validateJsonInput = (ipcInput) => {
  try {
    JSON.stringify(ipcInput);
  } catch (error) {
    throw new Error("The `ipcInput` option is not serializable with JSON.", { cause: error });
  }
};
var validateIpcInput = {
  advanced: validateAdvancedInput,
  json: validateJsonInput
};
var sendIpcInput = async (subprocess, ipcInput) => {
  if (ipcInput === void 0) {
    return;
  }
  await subprocess.sendMessage(ipcInput);
};

// node_modules/execa/lib/arguments/encoding-option.js
var validateEncoding = ({ encoding }) => {
  if (ENCODINGS.has(encoding)) {
    return;
  }
  const correctEncoding = getCorrectEncoding(encoding);
  if (correctEncoding !== void 0) {
    throw new TypeError(`Invalid option \`encoding: ${serializeEncoding(encoding)}\`.
Please rename it to ${serializeEncoding(correctEncoding)}.`);
  }
  const correctEncodings = [...ENCODINGS].map((correctEncoding2) => serializeEncoding(correctEncoding2)).join(", ");
  throw new TypeError(`Invalid option \`encoding: ${serializeEncoding(encoding)}\`.
Please rename it to one of: ${correctEncodings}.`);
};
var TEXT_ENCODINGS = /* @__PURE__ */ new Set(["utf8", "utf16le"]);
var BINARY_ENCODINGS = /* @__PURE__ */ new Set(["buffer", "hex", "base64", "base64url", "latin1", "ascii"]);
var ENCODINGS = /* @__PURE__ */ new Set([...TEXT_ENCODINGS, ...BINARY_ENCODINGS]);
var getCorrectEncoding = (encoding) => {
  if (encoding === null) {
    return "buffer";
  }
  if (typeof encoding !== "string") {
    return;
  }
  const lowerEncoding = encoding.toLowerCase();
  if (lowerEncoding in ENCODING_ALIASES) {
    return ENCODING_ALIASES[lowerEncoding];
  }
  if (ENCODINGS.has(lowerEncoding)) {
    return lowerEncoding;
  }
};
var ENCODING_ALIASES = {
  // eslint-disable-next-line unicorn/text-encoding-identifier-case
  "utf-8": "utf8",
  "utf-16le": "utf16le",
  "ucs-2": "utf16le",
  ucs2: "utf16le",
  binary: "latin1"
};
var serializeEncoding = (encoding) => typeof encoding === "string" ? `"${encoding}"` : String(encoding);

// node_modules/execa/lib/arguments/cwd.js
import { statSync } from "node:fs";
import path7 from "node:path";
import process5 from "node:process";
var normalizeCwd = (cwd = getDefaultCwd()) => {
  const cwdString = safeNormalizeFileUrl(cwd, 'The "cwd" option');
  return path7.resolve(cwdString);
};
var getDefaultCwd = () => {
  try {
    return process5.cwd();
  } catch (error) {
    error.message = `The current directory does not exist.
${error.message}`;
    throw error;
  }
};
var fixCwdError = (originalMessage, cwd) => {
  if (cwd === getDefaultCwd()) {
    return originalMessage;
  }
  let cwdStat;
  try {
    cwdStat = statSync(cwd);
  } catch (error) {
    return `The "cwd" option is invalid: ${cwd}.
${error.message}
${originalMessage}`;
  }
  if (!cwdStat.isDirectory()) {
    return `The "cwd" option is not a directory: ${cwd}.
${originalMessage}`;
  }
  return originalMessage;
};

// node_modules/execa/lib/arguments/options.js
var normalizeOptions = (filePath, rawArguments, rawOptions) => {
  rawOptions.cwd = normalizeCwd(rawOptions.cwd);
  const [processedFile, processedArguments, processedOptions] = handleNodeOption(filePath, rawArguments, rawOptions);
  const { command: file, args: commandArguments, options: initialOptions } = import_cross_spawn.default._parse(processedFile, processedArguments, processedOptions);
  const fdOptions = normalizeFdSpecificOptions(initialOptions);
  const options = addDefaultOptions(fdOptions);
  validateTimeout(options);
  validateEncoding(options);
  validateIpcInputOption(options);
  validateCancelSignal(options);
  validateGracefulCancel(options);
  options.shell = normalizeFileUrl(options.shell);
  options.env = getEnv(options);
  options.killSignal = normalizeKillSignal(options.killSignal);
  options.forceKillAfterDelay = normalizeForceKillAfterDelay(options.forceKillAfterDelay);
  options.lines = options.lines.map((lines, fdNumber) => lines && !BINARY_ENCODINGS.has(options.encoding) && options.buffer[fdNumber]);
  if (process6.platform === "win32" && path8.basename(file, ".exe") === "cmd") {
    commandArguments.unshift("/q");
  }
  return { file, commandArguments, options };
};
var addDefaultOptions = ({
  extendEnv = true,
  preferLocal = false,
  cwd,
  localDir: localDirectory = cwd,
  encoding = "utf8",
  reject = true,
  cleanup = true,
  all = false,
  windowsHide = true,
  killSignal = "SIGTERM",
  forceKillAfterDelay = true,
  gracefulCancel = false,
  ipcInput,
  ipc = ipcInput !== void 0 || gracefulCancel,
  serialization = "advanced",
  ...options
}) => ({
  ...options,
  extendEnv,
  preferLocal,
  cwd,
  localDirectory,
  encoding,
  reject,
  cleanup,
  all,
  windowsHide,
  killSignal,
  forceKillAfterDelay,
  gracefulCancel,
  ipcInput,
  ipc,
  serialization
});
var getEnv = ({ env: envOption, extendEnv, preferLocal, node, localDirectory, nodePath }) => {
  const env = extendEnv ? { ...process6.env, ...envOption } : envOption;
  if (preferLocal || node) {
    return npmRunPathEnv({
      env,
      cwd: localDirectory,
      execPath: nodePath,
      preferLocal,
      addExecPath: node
    });
  }
  return env;
};

// node_modules/execa/lib/arguments/shell.js
var concatenateShell = (file, commandArguments, options) => options.shell && commandArguments.length > 0 ? [[file, ...commandArguments].join(" "), [], options] : [file, commandArguments, options];

// node_modules/execa/lib/return/message.js
import { inspect as inspect2 } from "node:util";

// node_modules/strip-final-newline/index.js
function stripFinalNewline(input2) {
  if (typeof input2 === "string") {
    return stripFinalNewlineString(input2);
  }
  if (!(ArrayBuffer.isView(input2) && input2.BYTES_PER_ELEMENT === 1)) {
    throw new Error("Input must be a string or a Uint8Array");
  }
  return stripFinalNewlineBinary(input2);
}
var stripFinalNewlineString = (input2) => input2.at(-1) === LF ? input2.slice(0, input2.at(-2) === CR ? -2 : -1) : input2;
var stripFinalNewlineBinary = (input2) => input2.at(-1) === LF_BINARY ? input2.subarray(0, input2.at(-2) === CR_BINARY ? -2 : -1) : input2;
var LF = "\n";
var LF_BINARY = LF.codePointAt(0);
var CR = "\r";
var CR_BINARY = CR.codePointAt(0);

// node_modules/get-stream/source/index.js
import { on } from "node:events";
import { finished } from "node:stream/promises";

// node_modules/is-stream/index.js
function isStream(stream, { checkOpen = true } = {}) {
  return stream !== null && typeof stream === "object" && (stream.writable || stream.readable || !checkOpen || stream.writable === void 0 && stream.readable === void 0) && typeof stream.pipe === "function";
}
function isWritableStream(stream, { checkOpen = true } = {}) {
  return isStream(stream, { checkOpen }) && (stream.writable || !checkOpen) && typeof stream.write === "function" && typeof stream.end === "function" && typeof stream.writable === "boolean" && typeof stream.writableObjectMode === "boolean" && typeof stream.destroy === "function" && typeof stream.destroyed === "boolean";
}
function isReadableStream(stream, { checkOpen = true } = {}) {
  return isStream(stream, { checkOpen }) && (stream.readable || !checkOpen) && typeof stream.read === "function" && typeof stream.readable === "boolean" && typeof stream.readableObjectMode === "boolean" && typeof stream.destroy === "function" && typeof stream.destroyed === "boolean";
}
function isDuplexStream(stream, options) {
  return isWritableStream(stream, options) && isReadableStream(stream, options);
}

// node_modules/@sec-ant/readable-stream/dist/ponyfill/asyncIterator.js
var a = Object.getPrototypeOf(
  Object.getPrototypeOf(
    /* istanbul ignore next */
    async function* () {
    }
  ).prototype
);
var c = class {
  #t;
  #n;
  #r = false;
  #e = void 0;
  constructor(e, t) {
    this.#t = e, this.#n = t;
  }
  next() {
    const e = () => this.#s();
    return this.#e = this.#e ? this.#e.then(e, e) : e(), this.#e;
  }
  return(e) {
    const t = () => this.#i(e);
    return this.#e ? this.#e.then(t, t) : t();
  }
  async #s() {
    if (this.#r)
      return {
        done: true,
        value: void 0
      };
    let e;
    try {
      e = await this.#t.read();
    } catch (t) {
      throw this.#e = void 0, this.#r = true, this.#t.releaseLock(), t;
    }
    return e.done && (this.#e = void 0, this.#r = true, this.#t.releaseLock()), e;
  }
  async #i(e) {
    if (this.#r)
      return {
        done: true,
        value: e
      };
    if (this.#r = true, !this.#n) {
      const t = this.#t.cancel(e);
      return this.#t.releaseLock(), await t, {
        done: true,
        value: e
      };
    }
    return this.#t.releaseLock(), {
      done: true,
      value: e
    };
  }
};
var n = Symbol();
function i() {
  return this[n].next();
}
Object.defineProperty(i, "name", { value: "next" });
function o(r) {
  return this[n].return(r);
}
Object.defineProperty(o, "name", { value: "return" });
var u = Object.create(a, {
  next: {
    enumerable: true,
    configurable: true,
    writable: true,
    value: i
  },
  return: {
    enumerable: true,
    configurable: true,
    writable: true,
    value: o
  }
});
function h({ preventCancel: r = false } = {}) {
  const e = this.getReader(), t = new c(
    e,
    r
  ), s = Object.create(u);
  return s[n] = t, s;
}

// node_modules/get-stream/source/stream.js
var getAsyncIterable = (stream) => {
  if (isReadableStream(stream, { checkOpen: false }) && nodeImports.on !== void 0) {
    return getStreamIterable(stream);
  }
  if (typeof stream?.[Symbol.asyncIterator] === "function") {
    return stream;
  }
  if (toString.call(stream) === "[object ReadableStream]") {
    return h.call(stream);
  }
  throw new TypeError("The first argument must be a Readable, a ReadableStream, or an async iterable.");
};
var { toString } = Object.prototype;
var getStreamIterable = async function* (stream) {
  const controller = new AbortController();
  const state = {};
  handleStreamEnd(stream, controller, state);
  try {
    for await (const [chunk] of nodeImports.on(stream, "data", { signal: controller.signal })) {
      yield chunk;
    }
  } catch (error) {
    if (state.error !== void 0) {
      throw state.error;
    } else if (!controller.signal.aborted) {
      throw error;
    }
  } finally {
    stream.destroy();
  }
};
var handleStreamEnd = async (stream, controller, state) => {
  try {
    await nodeImports.finished(stream, {
      cleanup: true,
      readable: true,
      writable: false,
      error: false
    });
  } catch (error) {
    state.error = error;
  } finally {
    controller.abort();
  }
};
var nodeImports = {};

// node_modules/get-stream/source/contents.js
var getStreamContents = async (stream, { init, convertChunk, getSize, truncateChunk, addChunk, getFinalChunk, finalize }, { maxBuffer = Number.POSITIVE_INFINITY } = {}) => {
  const asyncIterable = getAsyncIterable(stream);
  const state = init();
  state.length = 0;
  try {
    for await (const chunk of asyncIterable) {
      const chunkType = getChunkType(chunk);
      const convertedChunk = convertChunk[chunkType](chunk, state);
      appendChunk({
        convertedChunk,
        state,
        getSize,
        truncateChunk,
        addChunk,
        maxBuffer
      });
    }
    appendFinalChunk({
      state,
      convertChunk,
      getSize,
      truncateChunk,
      addChunk,
      getFinalChunk,
      maxBuffer
    });
    return finalize(state);
  } catch (error) {
    const normalizedError = typeof error === "object" && error !== null ? error : new Error(error);
    normalizedError.bufferedData = finalize(state);
    throw normalizedError;
  }
};
var appendFinalChunk = ({ state, getSize, truncateChunk, addChunk, getFinalChunk, maxBuffer }) => {
  const convertedChunk = getFinalChunk(state);
  if (convertedChunk !== void 0) {
    appendChunk({
      convertedChunk,
      state,
      getSize,
      truncateChunk,
      addChunk,
      maxBuffer
    });
  }
};
var appendChunk = ({ convertedChunk, state, getSize, truncateChunk, addChunk, maxBuffer }) => {
  const chunkSize = getSize(convertedChunk);
  const newLength = state.length + chunkSize;
  if (newLength <= maxBuffer) {
    addNewChunk(convertedChunk, state, addChunk, newLength);
    return;
  }
  const truncatedChunk = truncateChunk(convertedChunk, maxBuffer - state.length);
  if (truncatedChunk !== void 0) {
    addNewChunk(truncatedChunk, state, addChunk, maxBuffer);
  }
  throw new MaxBufferError();
};
var addNewChunk = (convertedChunk, state, addChunk, newLength) => {
  state.contents = addChunk(convertedChunk, state, newLength);
  state.length = newLength;
};
var getChunkType = (chunk) => {
  const typeOfChunk = typeof chunk;
  if (typeOfChunk === "string") {
    return "string";
  }
  if (typeOfChunk !== "object" || chunk === null) {
    return "others";
  }
  if (globalThis.Buffer?.isBuffer(chunk)) {
    return "buffer";
  }
  const prototypeName = objectToString2.call(chunk);
  if (prototypeName === "[object ArrayBuffer]") {
    return "arrayBuffer";
  }
  if (prototypeName === "[object DataView]") {
    return "dataView";
  }
  if (Number.isInteger(chunk.byteLength) && Number.isInteger(chunk.byteOffset) && objectToString2.call(chunk.buffer) === "[object ArrayBuffer]") {
    return "typedArray";
  }
  return "others";
};
var { toString: objectToString2 } = Object.prototype;
var MaxBufferError = class extends Error {
  name = "MaxBufferError";
  constructor() {
    super("maxBuffer exceeded");
  }
};

// node_modules/get-stream/source/utils.js
var identity2 = (value) => value;
var noop = () => void 0;
var getContentsProperty = ({ contents }) => contents;
var throwObjectStream = (chunk) => {
  throw new Error(`Streams in object mode are not supported: ${String(chunk)}`);
};
var getLengthProperty = (convertedChunk) => convertedChunk.length;

// node_modules/get-stream/source/array.js
async function getStreamAsArray(stream, options) {
  return getStreamContents(stream, arrayMethods, options);
}
var initArray = () => ({ contents: [] });
var increment = () => 1;
var addArrayChunk = (convertedChunk, { contents }) => {
  contents.push(convertedChunk);
  return contents;
};
var arrayMethods = {
  init: initArray,
  convertChunk: {
    string: identity2,
    buffer: identity2,
    arrayBuffer: identity2,
    dataView: identity2,
    typedArray: identity2,
    others: identity2
  },
  getSize: increment,
  truncateChunk: noop,
  addChunk: addArrayChunk,
  getFinalChunk: noop,
  finalize: getContentsProperty
};

// node_modules/get-stream/source/array-buffer.js
async function getStreamAsArrayBuffer(stream, options) {
  return getStreamContents(stream, arrayBufferMethods, options);
}
var initArrayBuffer = () => ({ contents: new ArrayBuffer(0) });
var useTextEncoder = (chunk) => textEncoder2.encode(chunk);
var textEncoder2 = new TextEncoder();
var useUint8Array = (chunk) => new Uint8Array(chunk);
var useUint8ArrayWithOffset = (chunk) => new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
var truncateArrayBufferChunk = (convertedChunk, chunkSize) => convertedChunk.slice(0, chunkSize);
var addArrayBufferChunk = (convertedChunk, { contents, length: previousLength }, length) => {
  const newContents = hasArrayBufferResize() ? resizeArrayBuffer(contents, length) : resizeArrayBufferSlow(contents, length);
  new Uint8Array(newContents).set(convertedChunk, previousLength);
  return newContents;
};
var resizeArrayBufferSlow = (contents, length) => {
  if (length <= contents.byteLength) {
    return contents;
  }
  const arrayBuffer = new ArrayBuffer(getNewContentsLength(length));
  new Uint8Array(arrayBuffer).set(new Uint8Array(contents), 0);
  return arrayBuffer;
};
var resizeArrayBuffer = (contents, length) => {
  if (length <= contents.maxByteLength) {
    contents.resize(length);
    return contents;
  }
  const arrayBuffer = new ArrayBuffer(length, { maxByteLength: getNewContentsLength(length) });
  new Uint8Array(arrayBuffer).set(new Uint8Array(contents), 0);
  return arrayBuffer;
};
var getNewContentsLength = (length) => SCALE_FACTOR ** Math.ceil(Math.log(length) / Math.log(SCALE_FACTOR));
var SCALE_FACTOR = 2;
var finalizeArrayBuffer = ({ contents, length }) => hasArrayBufferResize() ? contents : contents.slice(0, length);
var hasArrayBufferResize = () => "resize" in ArrayBuffer.prototype;
var arrayBufferMethods = {
  init: initArrayBuffer,
  convertChunk: {
    string: useTextEncoder,
    buffer: useUint8Array,
    arrayBuffer: useUint8Array,
    dataView: useUint8ArrayWithOffset,
    typedArray: useUint8ArrayWithOffset,
    others: throwObjectStream
  },
  getSize: getLengthProperty,
  truncateChunk: truncateArrayBufferChunk,
  addChunk: addArrayBufferChunk,
  getFinalChunk: noop,
  finalize: finalizeArrayBuffer
};

// node_modules/get-stream/source/string.js
async function getStreamAsString(stream, options) {
  return getStreamContents(stream, stringMethods, options);
}
var initString = () => ({ contents: "", textDecoder: new TextDecoder() });
var useTextDecoder = (chunk, { textDecoder: textDecoder2 }) => textDecoder2.decode(chunk, { stream: true });
var addStringChunk = (convertedChunk, { contents }) => contents + convertedChunk;
var truncateStringChunk = (convertedChunk, chunkSize) => convertedChunk.slice(0, chunkSize);
var getFinalStringChunk = ({ textDecoder: textDecoder2 }) => {
  const finalChunk = textDecoder2.decode();
  return finalChunk === "" ? void 0 : finalChunk;
};
var stringMethods = {
  init: initString,
  convertChunk: {
    string: identity2,
    buffer: useTextDecoder,
    arrayBuffer: useTextDecoder,
    dataView: useTextDecoder,
    typedArray: useTextDecoder,
    others: throwObjectStream
  },
  getSize: getLengthProperty,
  truncateChunk: truncateStringChunk,
  addChunk: addStringChunk,
  getFinalChunk: getFinalStringChunk,
  finalize: getContentsProperty
};

// node_modules/get-stream/source/index.js
Object.assign(nodeImports, { on, finished });

// node_modules/execa/lib/io/max-buffer.js
var handleMaxBuffer = ({ error, stream, readableObjectMode, lines, encoding, fdNumber }) => {
  if (!(error instanceof MaxBufferError)) {
    throw error;
  }
  if (fdNumber === "all") {
    return error;
  }
  const unit = getMaxBufferUnit(readableObjectMode, lines, encoding);
  error.maxBufferInfo = { fdNumber, unit };
  stream.destroy();
  throw error;
};
var getMaxBufferUnit = (readableObjectMode, lines, encoding) => {
  if (readableObjectMode) {
    return "objects";
  }
  if (lines) {
    return "lines";
  }
  if (encoding === "buffer") {
    return "bytes";
  }
  return "characters";
};
var checkIpcMaxBuffer = (subprocess, ipcOutput, maxBuffer) => {
  if (ipcOutput.length !== maxBuffer) {
    return;
  }
  const error = new MaxBufferError();
  error.maxBufferInfo = { fdNumber: "ipc" };
  throw error;
};
var getMaxBufferMessage = (error, maxBuffer) => {
  const { streamName, threshold, unit } = getMaxBufferInfo(error, maxBuffer);
  return `Command's ${streamName} was larger than ${threshold} ${unit}`;
};
var getMaxBufferInfo = (error, maxBuffer) => {
  if (error?.maxBufferInfo === void 0) {
    return { streamName: "output", threshold: maxBuffer[1], unit: "bytes" };
  }
  const { maxBufferInfo: { fdNumber, unit } } = error;
  delete error.maxBufferInfo;
  const threshold = getFdSpecificValue(maxBuffer, fdNumber);
  if (fdNumber === "ipc") {
    return { streamName: "IPC output", threshold, unit: "messages" };
  }
  return { streamName: getStreamName(fdNumber), threshold, unit };
};
var isMaxBufferSync = (resultError, output, maxBuffer) => resultError?.code === "ENOBUFS" && output !== null && output.some((result) => result !== null && result.length > getMaxBufferSync(maxBuffer));
var truncateMaxBufferSync = (result, isMaxBuffer, maxBuffer) => {
  if (!isMaxBuffer) {
    return result;
  }
  const maxBufferValue = getMaxBufferSync(maxBuffer);
  return result.length > maxBufferValue ? result.slice(0, maxBufferValue) : result;
};
var getMaxBufferSync = ([, stdoutMaxBuffer]) => stdoutMaxBuffer;

// node_modules/execa/lib/return/message.js
var createMessages = ({
  stdio,
  all,
  ipcOutput,
  originalError,
  signal,
  signalDescription,
  exitCode,
  escapedCommand,
  timedOut,
  isCanceled,
  isGracefullyCanceled,
  isMaxBuffer,
  isForcefullyTerminated,
  forceKillAfterDelay,
  killSignal,
  maxBuffer,
  timeout,
  cwd
}) => {
  const errorCode = originalError?.code;
  const prefix = getErrorPrefix({
    originalError,
    timedOut,
    timeout,
    isMaxBuffer,
    maxBuffer,
    errorCode,
    signal,
    signalDescription,
    exitCode,
    isCanceled,
    isGracefullyCanceled,
    isForcefullyTerminated,
    forceKillAfterDelay,
    killSignal
  });
  const originalMessage = getOriginalMessage(originalError, cwd);
  const suffix = originalMessage === void 0 ? "" : `
${originalMessage}`;
  const shortMessage = `${prefix}: ${escapedCommand}${suffix}`;
  const messageStdio = all === void 0 ? [stdio[2], stdio[1]] : [all];
  const message = [
    shortMessage,
    ...messageStdio,
    ...stdio.slice(3),
    ipcOutput.map((ipcMessage) => serializeIpcMessage(ipcMessage)).join("\n")
  ].map((messagePart) => escapeLines(stripFinalNewline(serializeMessagePart(messagePart)))).filter(Boolean).join("\n\n");
  return { originalMessage, shortMessage, message };
};
var getErrorPrefix = ({
  originalError,
  timedOut,
  timeout,
  isMaxBuffer,
  maxBuffer,
  errorCode,
  signal,
  signalDescription,
  exitCode,
  isCanceled,
  isGracefullyCanceled,
  isForcefullyTerminated,
  forceKillAfterDelay,
  killSignal
}) => {
  const forcefulSuffix = getForcefulSuffix(isForcefullyTerminated, forceKillAfterDelay);
  if (timedOut) {
    return `Command timed out after ${timeout} milliseconds${forcefulSuffix}`;
  }
  if (isGracefullyCanceled) {
    if (signal === void 0) {
      return `Command was gracefully canceled with exit code ${exitCode}`;
    }
    return isForcefullyTerminated ? `Command was gracefully canceled${forcefulSuffix}` : `Command was gracefully canceled with ${signal} (${signalDescription})`;
  }
  if (isCanceled) {
    return `Command was canceled${forcefulSuffix}`;
  }
  if (isMaxBuffer) {
    return `${getMaxBufferMessage(originalError, maxBuffer)}${forcefulSuffix}`;
  }
  if (errorCode !== void 0) {
    return `Command failed with ${errorCode}${forcefulSuffix}`;
  }
  if (isForcefullyTerminated) {
    return `Command was killed with ${killSignal} (${getSignalDescription(killSignal)})${forcefulSuffix}`;
  }
  if (signal !== void 0) {
    return `Command was killed with ${signal} (${signalDescription})`;
  }
  if (exitCode !== void 0) {
    return `Command failed with exit code ${exitCode}`;
  }
  return "Command failed";
};
var getForcefulSuffix = (isForcefullyTerminated, forceKillAfterDelay) => isForcefullyTerminated ? ` and was forcefully terminated after ${forceKillAfterDelay} milliseconds` : "";
var getOriginalMessage = (originalError, cwd) => {
  if (originalError instanceof DiscardedError) {
    return;
  }
  const originalMessage = isExecaError(originalError) ? originalError.originalMessage : String(originalError?.message ?? originalError);
  const escapedOriginalMessage = escapeLines(fixCwdError(originalMessage, cwd));
  return escapedOriginalMessage === "" ? void 0 : escapedOriginalMessage;
};
var serializeIpcMessage = (ipcMessage) => typeof ipcMessage === "string" ? ipcMessage : inspect2(ipcMessage);
var serializeMessagePart = (messagePart) => Array.isArray(messagePart) ? messagePart.map((messageItem) => stripFinalNewline(serializeMessageItem(messageItem))).filter(Boolean).join("\n") : serializeMessageItem(messagePart);
var serializeMessageItem = (messageItem) => {
  if (typeof messageItem === "string") {
    return messageItem;
  }
  if (isUint8Array(messageItem)) {
    return uint8ArrayToString(messageItem);
  }
  return "";
};

// node_modules/execa/lib/return/result.js
var makeSuccessResult = ({
  command,
  escapedCommand,
  stdio,
  all,
  ipcOutput,
  options: { cwd },
  startTime
}) => omitUndefinedProperties({
  command,
  escapedCommand,
  cwd,
  durationMs: getDurationMs(startTime),
  failed: false,
  timedOut: false,
  isCanceled: false,
  isGracefullyCanceled: false,
  isTerminated: false,
  isMaxBuffer: false,
  isForcefullyTerminated: false,
  exitCode: 0,
  stdout: stdio[1],
  stderr: stdio[2],
  all,
  stdio,
  ipcOutput,
  pipedFrom: []
});
var makeEarlyError = ({
  error,
  command,
  escapedCommand,
  fileDescriptors,
  options,
  startTime,
  isSync
}) => makeError({
  error,
  command,
  escapedCommand,
  startTime,
  timedOut: false,
  isCanceled: false,
  isGracefullyCanceled: false,
  isMaxBuffer: false,
  isForcefullyTerminated: false,
  stdio: Array.from({ length: fileDescriptors.length }),
  ipcOutput: [],
  options,
  isSync
});
var makeError = ({
  error: originalError,
  command,
  escapedCommand,
  startTime,
  timedOut,
  isCanceled,
  isGracefullyCanceled,
  isMaxBuffer,
  isForcefullyTerminated,
  exitCode: rawExitCode,
  signal: rawSignal,
  stdio,
  all,
  ipcOutput,
  options: {
    timeoutDuration,
    timeout = timeoutDuration,
    forceKillAfterDelay,
    killSignal,
    cwd,
    maxBuffer
  },
  isSync
}) => {
  const { exitCode, signal, signalDescription } = normalizeExitPayload(rawExitCode, rawSignal);
  const { originalMessage, shortMessage, message } = createMessages({
    stdio,
    all,
    ipcOutput,
    originalError,
    signal,
    signalDescription,
    exitCode,
    escapedCommand,
    timedOut,
    isCanceled,
    isGracefullyCanceled,
    isMaxBuffer,
    isForcefullyTerminated,
    forceKillAfterDelay,
    killSignal,
    maxBuffer,
    timeout,
    cwd
  });
  const error = getFinalError(originalError, message, isSync);
  Object.assign(error, getErrorProperties({
    error,
    command,
    escapedCommand,
    startTime,
    timedOut,
    isCanceled,
    isGracefullyCanceled,
    isMaxBuffer,
    isForcefullyTerminated,
    exitCode,
    signal,
    signalDescription,
    stdio,
    all,
    ipcOutput,
    cwd,
    originalMessage,
    shortMessage
  }));
  return error;
};
var getErrorProperties = ({
  error,
  command,
  escapedCommand,
  startTime,
  timedOut,
  isCanceled,
  isGracefullyCanceled,
  isMaxBuffer,
  isForcefullyTerminated,
  exitCode,
  signal,
  signalDescription,
  stdio,
  all,
  ipcOutput,
  cwd,
  originalMessage,
  shortMessage
}) => omitUndefinedProperties({
  shortMessage,
  originalMessage,
  command,
  escapedCommand,
  cwd,
  durationMs: getDurationMs(startTime),
  failed: true,
  timedOut,
  isCanceled,
  isGracefullyCanceled,
  isTerminated: signal !== void 0,
  isMaxBuffer,
  isForcefullyTerminated,
  exitCode,
  signal,
  signalDescription,
  code: error.cause?.code,
  stdout: stdio[1],
  stderr: stdio[2],
  all,
  stdio,
  ipcOutput,
  pipedFrom: []
});
var omitUndefinedProperties = (result) => Object.fromEntries(Object.entries(result).filter(([, value]) => value !== void 0));
var normalizeExitPayload = (rawExitCode, rawSignal) => {
  const exitCode = rawExitCode === null ? void 0 : rawExitCode;
  const signal = rawSignal === null ? void 0 : rawSignal;
  const signalDescription = signal === void 0 ? void 0 : getSignalDescription(rawSignal);
  return { exitCode, signal, signalDescription };
};

// node_modules/parse-ms/index.js
var toZeroIfInfinity = (value) => Number.isFinite(value) ? value : 0;
function parseNumber(milliseconds) {
  return {
    days: Math.trunc(milliseconds / 864e5),
    hours: Math.trunc(milliseconds / 36e5 % 24),
    minutes: Math.trunc(milliseconds / 6e4 % 60),
    seconds: Math.trunc(milliseconds / 1e3 % 60),
    milliseconds: Math.trunc(milliseconds % 1e3),
    microseconds: Math.trunc(toZeroIfInfinity(milliseconds * 1e3) % 1e3),
    nanoseconds: Math.trunc(toZeroIfInfinity(milliseconds * 1e6) % 1e3)
  };
}
function parseBigint(milliseconds) {
  return {
    days: milliseconds / 86400000n,
    hours: milliseconds / 3600000n % 24n,
    minutes: milliseconds / 60000n % 60n,
    seconds: milliseconds / 1000n % 60n,
    milliseconds: milliseconds % 1000n,
    microseconds: 0n,
    nanoseconds: 0n
  };
}
function parseMilliseconds(milliseconds) {
  switch (typeof milliseconds) {
    case "number": {
      if (Number.isFinite(milliseconds)) {
        return parseNumber(milliseconds);
      }
      break;
    }
    case "bigint": {
      return parseBigint(milliseconds);
    }
  }
  throw new TypeError("Expected a finite number or bigint");
}

// node_modules/pretty-ms/index.js
var isZero = (value) => value === 0 || value === 0n;
var pluralize = (word, count2) => count2 === 1 || count2 === 1n ? word : `${word}s`;
var SECOND_ROUNDING_EPSILON = 1e-7;
var ONE_DAY_IN_MILLISECONDS = 24n * 60n * 60n * 1000n;
function prettyMilliseconds(milliseconds, options) {
  const isBigInt = typeof milliseconds === "bigint";
  if (!isBigInt && !Number.isFinite(milliseconds)) {
    throw new TypeError("Expected a finite number or bigint");
  }
  options = { ...options };
  const sign = milliseconds < 0 ? "-" : "";
  milliseconds = milliseconds < 0 ? -milliseconds : milliseconds;
  if (options.colonNotation) {
    options.compact = false;
    options.formatSubMilliseconds = false;
    options.separateMilliseconds = false;
    options.verbose = false;
  }
  if (options.compact) {
    options.unitCount = 1;
    options.secondsDecimalDigits = 0;
    options.millisecondsDecimalDigits = 0;
  }
  let result = [];
  const floorDecimals = (value, decimalDigits) => {
    const flooredInterimValue = Math.floor(value * 10 ** decimalDigits + SECOND_ROUNDING_EPSILON);
    const flooredValue = Math.round(flooredInterimValue) / 10 ** decimalDigits;
    return flooredValue.toFixed(decimalDigits);
  };
  const add = (value, long, short, valueString) => {
    if ((result.length === 0 || !options.colonNotation) && isZero(value) && !(options.colonNotation && short === "m")) {
      return;
    }
    valueString ??= String(value);
    if (options.colonNotation) {
      const wholeDigits = valueString.includes(".") ? valueString.split(".")[0].length : valueString.length;
      const minLength = result.length > 0 ? 2 : 1;
      valueString = "0".repeat(Math.max(0, minLength - wholeDigits)) + valueString;
    } else {
      valueString += options.verbose ? " " + pluralize(long, value) : short;
    }
    result.push(valueString);
  };
  const parsed = parseMilliseconds(milliseconds);
  const days = BigInt(parsed.days);
  if (options.hideYearAndDays) {
    add(BigInt(days) * 24n + BigInt(parsed.hours), "hour", "h");
  } else {
    if (options.hideYear) {
      add(days, "day", "d");
    } else {
      add(days / 365n, "year", "y");
      add(days % 365n, "day", "d");
    }
    add(Number(parsed.hours), "hour", "h");
  }
  add(Number(parsed.minutes), "minute", "m");
  if (!options.hideSeconds) {
    if (options.separateMilliseconds || options.formatSubMilliseconds || !options.colonNotation && milliseconds < 1e3 && !options.subSecondsAsDecimals) {
      const seconds = Number(parsed.seconds);
      const milliseconds2 = Number(parsed.milliseconds);
      const microseconds = Number(parsed.microseconds);
      const nanoseconds = Number(parsed.nanoseconds);
      add(seconds, "second", "s");
      if (options.formatSubMilliseconds) {
        add(milliseconds2, "millisecond", "ms");
        add(microseconds, "microsecond", "\xB5s");
        add(nanoseconds, "nanosecond", "ns");
      } else {
        const millisecondsAndBelow = milliseconds2 + microseconds / 1e3 + nanoseconds / 1e6;
        const millisecondsDecimalDigits = typeof options.millisecondsDecimalDigits === "number" ? options.millisecondsDecimalDigits : 0;
        const roundedMilliseconds = millisecondsAndBelow >= 1 ? Math.round(millisecondsAndBelow) : Math.ceil(millisecondsAndBelow);
        const millisecondsString = millisecondsDecimalDigits ? millisecondsAndBelow.toFixed(millisecondsDecimalDigits) : roundedMilliseconds;
        add(
          Number.parseFloat(millisecondsString),
          "millisecond",
          "ms",
          millisecondsString
        );
      }
    } else {
      const seconds = (isBigInt ? Number(milliseconds % ONE_DAY_IN_MILLISECONDS) : milliseconds) / 1e3 % 60;
      const secondsDecimalDigits = typeof options.secondsDecimalDigits === "number" ? options.secondsDecimalDigits : 1;
      const secondsFixed = floorDecimals(seconds, secondsDecimalDigits);
      const secondsString = options.keepDecimalsOnWholeSeconds ? secondsFixed : secondsFixed.replace(/\.0+$/, "");
      add(Number.parseFloat(secondsString), "second", "s", secondsString);
    }
  }
  if (result.length === 0) {
    return sign + "0" + (options.verbose ? " milliseconds" : "ms");
  }
  const separator = options.colonNotation ? ":" : " ";
  if (typeof options.unitCount === "number") {
    result = result.slice(0, Math.max(options.unitCount, 1));
  }
  return sign + result.join(separator);
}

// node_modules/execa/lib/verbose/error.js
var logError = (result, verboseInfo) => {
  if (result.failed) {
    verboseLog({
      type: "error",
      verboseMessage: result.shortMessage,
      verboseInfo,
      result
    });
  }
};

// node_modules/execa/lib/verbose/complete.js
var logResult = (result, verboseInfo) => {
  if (!isVerbose(verboseInfo)) {
    return;
  }
  logError(result, verboseInfo);
  logDuration(result, verboseInfo);
};
var logDuration = (result, verboseInfo) => {
  const verboseMessage = `(done in ${prettyMilliseconds(result.durationMs)})`;
  verboseLog({
    type: "duration",
    verboseMessage,
    verboseInfo,
    result
  });
};

// node_modules/execa/lib/return/reject.js
var handleResult = (result, verboseInfo, { reject }) => {
  logResult(result, verboseInfo);
  if (result.failed && reject) {
    throw result;
  }
  return result;
};

// node_modules/execa/lib/stdio/handle-sync.js
import { readFileSync as readFileSync2 } from "node:fs";

// node_modules/execa/lib/stdio/type.js
var getStdioItemType = (value, optionName) => {
  if (isAsyncGenerator(value)) {
    return "asyncGenerator";
  }
  if (isSyncGenerator(value)) {
    return "generator";
  }
  if (isUrl(value)) {
    return "fileUrl";
  }
  if (isFilePathObject(value)) {
    return "filePath";
  }
  if (isWebStream(value)) {
    return "webStream";
  }
  if (isStream(value, { checkOpen: false })) {
    return "native";
  }
  if (isUint8Array(value)) {
    return "uint8Array";
  }
  if (isAsyncIterableObject(value)) {
    return "asyncIterable";
  }
  if (isIterableObject(value)) {
    return "iterable";
  }
  if (isTransformStream(value)) {
    return getTransformStreamType({ transform: value }, optionName);
  }
  if (isTransformOptions(value)) {
    return getTransformObjectType(value, optionName);
  }
  return "native";
};
var getTransformObjectType = (value, optionName) => {
  if (isDuplexStream(value.transform, { checkOpen: false })) {
    return getDuplexType(value, optionName);
  }
  if (isTransformStream(value.transform)) {
    return getTransformStreamType(value, optionName);
  }
  return getGeneratorObjectType(value, optionName);
};
var getDuplexType = (value, optionName) => {
  validateNonGeneratorType(value, optionName, "Duplex stream");
  return "duplex";
};
var getTransformStreamType = (value, optionName) => {
  validateNonGeneratorType(value, optionName, "web TransformStream");
  return "webTransform";
};
var validateNonGeneratorType = ({ final, binary, objectMode }, optionName, typeName) => {
  checkUndefinedOption(final, `${optionName}.final`, typeName);
  checkUndefinedOption(binary, `${optionName}.binary`, typeName);
  checkBooleanOption(objectMode, `${optionName}.objectMode`);
};
var checkUndefinedOption = (value, optionName, typeName) => {
  if (value !== void 0) {
    throw new TypeError(`The \`${optionName}\` option can only be defined when using a generator, not a ${typeName}.`);
  }
};
var getGeneratorObjectType = ({ transform, final, binary, objectMode }, optionName) => {
  if (transform !== void 0 && !isGenerator(transform)) {
    throw new TypeError(`The \`${optionName}.transform\` option must be a generator, a Duplex stream or a web TransformStream.`);
  }
  if (isDuplexStream(final, { checkOpen: false })) {
    throw new TypeError(`The \`${optionName}.final\` option must not be a Duplex stream.`);
  }
  if (isTransformStream(final)) {
    throw new TypeError(`The \`${optionName}.final\` option must not be a web TransformStream.`);
  }
  if (final !== void 0 && !isGenerator(final)) {
    throw new TypeError(`The \`${optionName}.final\` option must be a generator.`);
  }
  checkBooleanOption(binary, `${optionName}.binary`);
  checkBooleanOption(objectMode, `${optionName}.objectMode`);
  return isAsyncGenerator(transform) || isAsyncGenerator(final) ? "asyncGenerator" : "generator";
};
var checkBooleanOption = (value, optionName) => {
  if (value !== void 0 && typeof value !== "boolean") {
    throw new TypeError(`The \`${optionName}\` option must use a boolean.`);
  }
};
var isGenerator = (value) => isAsyncGenerator(value) || isSyncGenerator(value);
var isAsyncGenerator = (value) => Object.prototype.toString.call(value) === "[object AsyncGeneratorFunction]";
var isSyncGenerator = (value) => Object.prototype.toString.call(value) === "[object GeneratorFunction]";
var isTransformOptions = (value) => isPlainObject(value) && (value.transform !== void 0 || value.final !== void 0);
var isUrl = (value) => Object.prototype.toString.call(value) === "[object URL]";
var isRegularUrl = (value) => isUrl(value) && value.protocol !== "file:";
var isFilePathObject = (value) => isPlainObject(value) && Object.keys(value).length > 0 && Object.keys(value).every((key) => FILE_PATH_KEYS.has(key)) && isFilePathString(value.file);
var FILE_PATH_KEYS = /* @__PURE__ */ new Set(["file", "append"]);
var isFilePathString = (file) => typeof file === "string";
var isUnknownStdioString = (type, value) => type === "native" && typeof value === "string" && !KNOWN_STDIO_STRINGS.has(value);
var KNOWN_STDIO_STRINGS = /* @__PURE__ */ new Set(["ipc", "ignore", "inherit", "overlapped", "pipe"]);
var isReadableStream2 = (value) => Object.prototype.toString.call(value) === "[object ReadableStream]";
var isWritableStream2 = (value) => Object.prototype.toString.call(value) === "[object WritableStream]";
var isWebStream = (value) => isReadableStream2(value) || isWritableStream2(value);
var isTransformStream = (value) => isReadableStream2(value?.readable) && isWritableStream2(value?.writable);
var isAsyncIterableObject = (value) => isObject(value) && typeof value[Symbol.asyncIterator] === "function";
var isIterableObject = (value) => isObject(value) && typeof value[Symbol.iterator] === "function";
var isObject = (value) => typeof value === "object" && value !== null;
var TRANSFORM_TYPES = /* @__PURE__ */ new Set(["generator", "asyncGenerator", "duplex", "webTransform"]);
var FILE_TYPES = /* @__PURE__ */ new Set(["fileUrl", "filePath", "fileNumber"]);
var SPECIAL_DUPLICATE_TYPES_SYNC = /* @__PURE__ */ new Set(["fileUrl", "filePath"]);
var SPECIAL_DUPLICATE_TYPES = /* @__PURE__ */ new Set([...SPECIAL_DUPLICATE_TYPES_SYNC, "webStream", "nodeStream"]);
var FORBID_DUPLICATE_TYPES = /* @__PURE__ */ new Set(["webTransform", "duplex"]);
var TYPE_TO_MESSAGE = {
  generator: "a generator",
  asyncGenerator: "an async generator",
  fileUrl: "a file URL",
  filePath: "a file path string",
  fileNumber: "a file descriptor number",
  webStream: "a web stream",
  nodeStream: "a Node.js stream",
  webTransform: "a web TransformStream",
  duplex: "a Duplex stream",
  native: "any value",
  iterable: "an iterable",
  asyncIterable: "an async iterable",
  string: "a string",
  uint8Array: "a Uint8Array"
};

// node_modules/execa/lib/transform/object-mode.js
var getTransformObjectModes = (objectMode, index, newTransforms, direction) => direction === "output" ? getOutputObjectModes(objectMode, index, newTransforms) : getInputObjectModes(objectMode, index, newTransforms);
var getOutputObjectModes = (objectMode, index, newTransforms) => {
  const writableObjectMode = index !== 0 && newTransforms[index - 1].value.readableObjectMode;
  const readableObjectMode = objectMode ?? writableObjectMode;
  return { writableObjectMode, readableObjectMode };
};
var getInputObjectModes = (objectMode, index, newTransforms) => {
  const writableObjectMode = index === 0 ? objectMode === true : newTransforms[index - 1].value.readableObjectMode;
  const readableObjectMode = index !== newTransforms.length - 1 && (objectMode ?? writableObjectMode);
  return { writableObjectMode, readableObjectMode };
};
var getFdObjectMode = (stdioItems, direction) => {
  const lastTransform = stdioItems.findLast(({ type }) => TRANSFORM_TYPES.has(type));
  if (lastTransform === void 0) {
    return false;
  }
  return direction === "input" ? lastTransform.value.writableObjectMode : lastTransform.value.readableObjectMode;
};

// node_modules/execa/lib/transform/normalize.js
var normalizeTransforms = (stdioItems, optionName, direction, options) => [
  ...stdioItems.filter(({ type }) => !TRANSFORM_TYPES.has(type)),
  ...getTransforms(stdioItems, optionName, direction, options)
];
var getTransforms = (stdioItems, optionName, direction, { encoding }) => {
  const transforms = stdioItems.filter(({ type }) => TRANSFORM_TYPES.has(type));
  const newTransforms = Array.from({ length: transforms.length });
  for (const [index, stdioItem] of Object.entries(transforms)) {
    newTransforms[index] = normalizeTransform({
      stdioItem,
      index: Number(index),
      newTransforms,
      optionName,
      direction,
      encoding
    });
  }
  return sortTransforms(newTransforms, direction);
};
var normalizeTransform = ({ stdioItem, stdioItem: { type }, index, newTransforms, optionName, direction, encoding }) => {
  if (type === "duplex") {
    return normalizeDuplex({ stdioItem, optionName });
  }
  if (type === "webTransform") {
    return normalizeTransformStream({
      stdioItem,
      index,
      newTransforms,
      direction
    });
  }
  return normalizeGenerator({
    stdioItem,
    index,
    newTransforms,
    direction,
    encoding
  });
};
var normalizeDuplex = ({
  stdioItem,
  stdioItem: {
    value: {
      transform,
      transform: { writableObjectMode, readableObjectMode },
      objectMode = readableObjectMode
    }
  },
  optionName
}) => {
  if (objectMode && !readableObjectMode) {
    throw new TypeError(`The \`${optionName}.objectMode\` option can only be \`true\` if \`new Duplex({objectMode: true})\` is used.`);
  }
  if (!objectMode && readableObjectMode) {
    throw new TypeError(`The \`${optionName}.objectMode\` option cannot be \`false\` if \`new Duplex({objectMode: true})\` is used.`);
  }
  return {
    ...stdioItem,
    value: { transform, writableObjectMode, readableObjectMode }
  };
};
var normalizeTransformStream = ({ stdioItem, stdioItem: { value }, index, newTransforms, direction }) => {
  const { transform, objectMode } = isPlainObject(value) ? value : { transform: value };
  const { writableObjectMode, readableObjectMode } = getTransformObjectModes(objectMode, index, newTransforms, direction);
  return {
    ...stdioItem,
    value: { transform, writableObjectMode, readableObjectMode }
  };
};
var normalizeGenerator = ({ stdioItem, stdioItem: { value }, index, newTransforms, direction, encoding }) => {
  const {
    transform,
    final,
    binary: binaryOption = false,
    preserveNewlines = false,
    objectMode
  } = isPlainObject(value) ? value : { transform: value };
  const binary = binaryOption || BINARY_ENCODINGS.has(encoding);
  const { writableObjectMode, readableObjectMode } = getTransformObjectModes(objectMode, index, newTransforms, direction);
  return {
    ...stdioItem,
    value: {
      transform,
      final,
      binary,
      preserveNewlines,
      writableObjectMode,
      readableObjectMode
    }
  };
};
var sortTransforms = (newTransforms, direction) => direction === "input" ? newTransforms.reverse() : newTransforms;

// node_modules/execa/lib/stdio/direction.js
import process7 from "node:process";
var getStreamDirection = (stdioItems, fdNumber, optionName) => {
  const directions = stdioItems.map((stdioItem) => getStdioItemDirection(stdioItem, fdNumber));
  if (directions.includes("input") && directions.includes("output")) {
    throw new TypeError(`The \`${optionName}\` option must not be an array of both readable and writable values.`);
  }
  return directions.find(Boolean) ?? DEFAULT_DIRECTION;
};
var getStdioItemDirection = ({ type, value }, fdNumber) => KNOWN_DIRECTIONS[fdNumber] ?? guessStreamDirection[type](value);
var KNOWN_DIRECTIONS = ["input", "output", "output"];
var anyDirection = () => void 0;
var alwaysInput = () => "input";
var guessStreamDirection = {
  generator: anyDirection,
  asyncGenerator: anyDirection,
  fileUrl: anyDirection,
  filePath: anyDirection,
  iterable: alwaysInput,
  asyncIterable: alwaysInput,
  uint8Array: alwaysInput,
  webStream: (value) => isWritableStream2(value) ? "output" : "input",
  nodeStream(value) {
    if (!isReadableStream(value, { checkOpen: false })) {
      return "output";
    }
    return isWritableStream(value, { checkOpen: false }) ? void 0 : "input";
  },
  webTransform: anyDirection,
  duplex: anyDirection,
  native(value) {
    const standardStreamDirection = getStandardStreamDirection(value);
    if (standardStreamDirection !== void 0) {
      return standardStreamDirection;
    }
    if (isStream(value, { checkOpen: false })) {
      return guessStreamDirection.nodeStream(value);
    }
  }
};
var getStandardStreamDirection = (value) => {
  if ([0, process7.stdin].includes(value)) {
    return "input";
  }
  if ([1, 2, process7.stdout, process7.stderr].includes(value)) {
    return "output";
  }
};
var DEFAULT_DIRECTION = "output";

// node_modules/execa/lib/ipc/array.js
var normalizeIpcStdioArray = (stdioArray, ipc) => ipc && !stdioArray.includes("ipc") ? [...stdioArray, "ipc"] : stdioArray;

// node_modules/execa/lib/stdio/stdio-option.js
var normalizeStdioOption = ({ stdio, ipc, buffer, ...options }, verboseInfo, isSync) => {
  const stdioArray = getStdioArray(stdio, options).map((stdioOption, fdNumber) => addDefaultValue2(stdioOption, fdNumber));
  return isSync ? normalizeStdioSync(stdioArray, buffer, verboseInfo) : normalizeIpcStdioArray(stdioArray, ipc);
};
var getStdioArray = (stdio, options) => {
  if (stdio === void 0) {
    return STANDARD_STREAMS_ALIASES.map((alias) => options[alias]);
  }
  if (hasAlias(options)) {
    throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${STANDARD_STREAMS_ALIASES.map((alias) => `\`${alias}\``).join(", ")}`);
  }
  if (typeof stdio === "string") {
    return [stdio, stdio, stdio];
  }
  if (!Array.isArray(stdio)) {
    throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio}\``);
  }
  const length = Math.max(stdio.length, STANDARD_STREAMS_ALIASES.length);
  return Array.from({ length }, (_, fdNumber) => stdio[fdNumber]);
};
var hasAlias = (options) => STANDARD_STREAMS_ALIASES.some((alias) => options[alias] !== void 0);
var addDefaultValue2 = (stdioOption, fdNumber) => {
  if (Array.isArray(stdioOption)) {
    return stdioOption.map((item) => addDefaultValue2(item, fdNumber));
  }
  if (stdioOption === null || stdioOption === void 0) {
    return fdNumber >= STANDARD_STREAMS_ALIASES.length ? "ignore" : "pipe";
  }
  return stdioOption;
};
var normalizeStdioSync = (stdioArray, buffer, verboseInfo) => stdioArray.map((stdioOption, fdNumber) => !buffer[fdNumber] && fdNumber !== 0 && !isFullVerbose(verboseInfo, fdNumber) && isOutputPipeOnly(stdioOption) ? "ignore" : stdioOption);
var isOutputPipeOnly = (stdioOption) => stdioOption === "pipe" || Array.isArray(stdioOption) && stdioOption.every((item) => item === "pipe");

// node_modules/execa/lib/stdio/native.js
import { readFileSync } from "node:fs";
import tty2 from "node:tty";
var handleNativeStream = ({ stdioItem, stdioItem: { type }, isStdioArray, fdNumber, direction, isSync }) => {
  if (!isStdioArray || type !== "native") {
    return stdioItem;
  }
  return isSync ? handleNativeStreamSync({ stdioItem, fdNumber, direction }) : handleNativeStreamAsync({ stdioItem, fdNumber });
};
var handleNativeStreamSync = ({ stdioItem, stdioItem: { value, optionName }, fdNumber, direction }) => {
  const targetFd = getTargetFd({
    value,
    optionName,
    fdNumber,
    direction
  });
  if (targetFd !== void 0) {
    return targetFd;
  }
  if (isStream(value, { checkOpen: false })) {
    throw new TypeError(`The \`${optionName}: Stream\` option cannot both be an array and include a stream with synchronous methods.`);
  }
  return stdioItem;
};
var getTargetFd = ({ value, optionName, fdNumber, direction }) => {
  const targetFdNumber = getTargetFdNumber(value, fdNumber);
  if (targetFdNumber === void 0) {
    return;
  }
  if (direction === "output") {
    return { type: "fileNumber", value: targetFdNumber, optionName };
  }
  if (tty2.isatty(targetFdNumber)) {
    throw new TypeError(`The \`${optionName}: ${serializeOptionValue(value)}\` option is invalid: it cannot be a TTY with synchronous methods.`);
  }
  return { type: "uint8Array", value: bufferToUint8Array(readFileSync(targetFdNumber)), optionName };
};
var getTargetFdNumber = (value, fdNumber) => {
  if (value === "inherit") {
    return fdNumber;
  }
  if (typeof value === "number") {
    return value;
  }
  const standardStreamIndex = STANDARD_STREAMS.indexOf(value);
  if (standardStreamIndex !== -1) {
    return standardStreamIndex;
  }
};
var handleNativeStreamAsync = ({ stdioItem, stdioItem: { value, optionName }, fdNumber }) => {
  if (value === "inherit") {
    return { type: "nodeStream", value: getStandardStream(fdNumber, value, optionName), optionName };
  }
  if (typeof value === "number") {
    return { type: "nodeStream", value: getStandardStream(value, value, optionName), optionName };
  }
  if (isStream(value, { checkOpen: false })) {
    return { type: "nodeStream", value, optionName };
  }
  return stdioItem;
};
var getStandardStream = (fdNumber, value, optionName) => {
  const standardStream = STANDARD_STREAMS[fdNumber];
  if (standardStream === void 0) {
    throw new TypeError(`The \`${optionName}: ${value}\` option is invalid: no such standard stream.`);
  }
  return standardStream;
};

// node_modules/execa/lib/stdio/input-option.js
var handleInputOptions = ({ input: input2, inputFile }, fdNumber) => fdNumber === 0 ? [
  ...handleInputOption(input2),
  ...handleInputFileOption(inputFile)
] : [];
var handleInputOption = (input2) => input2 === void 0 ? [] : [{
  type: getInputType(input2),
  value: input2,
  optionName: "input"
}];
var getInputType = (input2) => {
  if (isReadableStream(input2, { checkOpen: false })) {
    return "nodeStream";
  }
  if (typeof input2 === "string") {
    return "string";
  }
  if (isUint8Array(input2)) {
    return "uint8Array";
  }
  throw new Error("The `input` option must be a string, a Uint8Array or a Node.js Readable stream.");
};
var handleInputFileOption = (inputFile) => inputFile === void 0 ? [] : [{
  ...getInputFileType(inputFile),
  optionName: "inputFile"
}];
var getInputFileType = (inputFile) => {
  if (isUrl(inputFile)) {
    return { type: "fileUrl", value: inputFile };
  }
  if (isFilePathString(inputFile)) {
    return { type: "filePath", value: { file: inputFile } };
  }
  throw new Error("The `inputFile` option must be a file path string or a file URL.");
};

// node_modules/execa/lib/stdio/duplicate.js
var filterDuplicates = (stdioItems) => stdioItems.filter((stdioItemOne, indexOne) => stdioItems.every((stdioItemTwo, indexTwo) => stdioItemOne.value !== stdioItemTwo.value || indexOne >= indexTwo || stdioItemOne.type === "generator" || stdioItemOne.type === "asyncGenerator"));
var getDuplicateStream = ({ stdioItem: { type, value, optionName }, direction, fileDescriptors, isSync }) => {
  const otherStdioItems = getOtherStdioItems(fileDescriptors, type);
  if (otherStdioItems.length === 0) {
    return;
  }
  if (isSync) {
    validateDuplicateStreamSync({
      otherStdioItems,
      type,
      value,
      optionName,
      direction
    });
    return;
  }
  if (SPECIAL_DUPLICATE_TYPES.has(type)) {
    return getDuplicateStreamInstance({
      otherStdioItems,
      type,
      value,
      optionName,
      direction
    });
  }
  if (FORBID_DUPLICATE_TYPES.has(type)) {
    validateDuplicateTransform({
      otherStdioItems,
      type,
      value,
      optionName
    });
  }
};
var getOtherStdioItems = (fileDescriptors, type) => fileDescriptors.flatMap(({ direction, stdioItems }) => stdioItems.filter((stdioItem) => stdioItem.type === type).map(((stdioItem) => ({ ...stdioItem, direction }))));
var validateDuplicateStreamSync = ({ otherStdioItems, type, value, optionName, direction }) => {
  if (SPECIAL_DUPLICATE_TYPES_SYNC.has(type)) {
    getDuplicateStreamInstance({
      otherStdioItems,
      type,
      value,
      optionName,
      direction
    });
  }
};
var getDuplicateStreamInstance = ({ otherStdioItems, type, value, optionName, direction }) => {
  const duplicateStdioItems = otherStdioItems.filter((stdioItem) => hasSameValue(stdioItem, value));
  if (duplicateStdioItems.length === 0) {
    return;
  }
  const differentStdioItem = duplicateStdioItems.find((stdioItem) => stdioItem.direction !== direction);
  throwOnDuplicateStream(differentStdioItem, optionName, type);
  return direction === "output" ? duplicateStdioItems[0].stream : void 0;
};
var hasSameValue = ({ type, value }, secondValue) => {
  if (type === "filePath") {
    return value.file === secondValue.file;
  }
  if (type === "fileUrl") {
    return value.href === secondValue.href;
  }
  return value === secondValue;
};
var validateDuplicateTransform = ({ otherStdioItems, type, value, optionName }) => {
  const duplicateStdioItem = otherStdioItems.find(({ value: { transform } }) => transform === value.transform);
  throwOnDuplicateStream(duplicateStdioItem, optionName, type);
};
var throwOnDuplicateStream = (stdioItem, optionName, type) => {
  if (stdioItem !== void 0) {
    throw new TypeError(`The \`${stdioItem.optionName}\` and \`${optionName}\` options must not target ${TYPE_TO_MESSAGE[type]} that is the same.`);
  }
};

// node_modules/execa/lib/stdio/handle.js
var handleStdio = (addProperties3, options, verboseInfo, isSync) => {
  const stdio = normalizeStdioOption(options, verboseInfo, isSync);
  const initialFileDescriptors = stdio.map((stdioOption, fdNumber) => getFileDescriptor({
    stdioOption,
    fdNumber,
    options,
    isSync
  }));
  const fileDescriptors = getFinalFileDescriptors({
    initialFileDescriptors,
    addProperties: addProperties3,
    options,
    isSync
  });
  options.stdio = fileDescriptors.map(({ stdioItems }) => forwardStdio(stdioItems));
  return fileDescriptors;
};
var getFileDescriptor = ({ stdioOption, fdNumber, options, isSync }) => {
  const optionName = getStreamName(fdNumber);
  const { stdioItems: initialStdioItems, isStdioArray } = initializeStdioItems({
    stdioOption,
    fdNumber,
    options,
    optionName
  });
  const direction = getStreamDirection(initialStdioItems, fdNumber, optionName);
  const stdioItems = initialStdioItems.map((stdioItem) => handleNativeStream({
    stdioItem,
    isStdioArray,
    fdNumber,
    direction,
    isSync
  }));
  const normalizedStdioItems = normalizeTransforms(stdioItems, optionName, direction, options);
  const objectMode = getFdObjectMode(normalizedStdioItems, direction);
  validateFileObjectMode(normalizedStdioItems, objectMode);
  return { direction, objectMode, stdioItems: normalizedStdioItems };
};
var initializeStdioItems = ({ stdioOption, fdNumber, options, optionName }) => {
  const values = Array.isArray(stdioOption) ? stdioOption : [stdioOption];
  const initialStdioItems = [
    ...values.map((value) => initializeStdioItem(value, optionName)),
    ...handleInputOptions(options, fdNumber)
  ];
  const stdioItems = filterDuplicates(initialStdioItems);
  const isStdioArray = stdioItems.length > 1;
  validateStdioArray(stdioItems, isStdioArray, optionName);
  validateStreams(stdioItems);
  return { stdioItems, isStdioArray };
};
var initializeStdioItem = (value, optionName) => ({
  type: getStdioItemType(value, optionName),
  value,
  optionName
});
var validateStdioArray = (stdioItems, isStdioArray, optionName) => {
  if (stdioItems.length === 0) {
    throw new TypeError(`The \`${optionName}\` option must not be an empty array.`);
  }
  if (!isStdioArray) {
    return;
  }
  for (const { value, optionName: optionName2 } of stdioItems) {
    if (INVALID_STDIO_ARRAY_OPTIONS.has(value)) {
      throw new Error(`The \`${optionName2}\` option must not include \`${value}\`.`);
    }
  }
};
var INVALID_STDIO_ARRAY_OPTIONS = /* @__PURE__ */ new Set(["ignore", "ipc"]);
var validateStreams = (stdioItems) => {
  for (const stdioItem of stdioItems) {
    validateFileStdio(stdioItem);
  }
};
var validateFileStdio = ({ type, value, optionName }) => {
  if (isRegularUrl(value)) {
    throw new TypeError(`The \`${optionName}: URL\` option must use the \`file:\` scheme.
For example, you can use the \`pathToFileURL()\` method of the \`url\` core module.`);
  }
  if (isUnknownStdioString(type, value)) {
    throw new TypeError(`The \`${optionName}: { file: '...' }\` option must be used instead of \`${optionName}: '...'\`.`);
  }
};
var validateFileObjectMode = (stdioItems, objectMode) => {
  if (!objectMode) {
    return;
  }
  const fileStdioItem = stdioItems.find(({ type }) => FILE_TYPES.has(type));
  if (fileStdioItem !== void 0) {
    throw new TypeError(`The \`${fileStdioItem.optionName}\` option cannot use both files and transforms in objectMode.`);
  }
};
var getFinalFileDescriptors = ({ initialFileDescriptors, addProperties: addProperties3, options, isSync }) => {
  const fileDescriptors = [];
  try {
    for (const fileDescriptor of initialFileDescriptors) {
      fileDescriptors.push(getFinalFileDescriptor({
        fileDescriptor,
        fileDescriptors,
        addProperties: addProperties3,
        options,
        isSync
      }));
    }
    return fileDescriptors;
  } catch (error) {
    cleanupCustomStreams(fileDescriptors);
    throw error;
  }
};
var getFinalFileDescriptor = ({
  fileDescriptor: { direction, objectMode, stdioItems },
  fileDescriptors,
  addProperties: addProperties3,
  options,
  isSync
}) => {
  const finalStdioItems = stdioItems.map((stdioItem) => addStreamProperties({
    stdioItem,
    addProperties: addProperties3,
    direction,
    options,
    fileDescriptors,
    isSync
  }));
  return { direction, objectMode, stdioItems: finalStdioItems };
};
var addStreamProperties = ({ stdioItem, addProperties: addProperties3, direction, options, fileDescriptors, isSync }) => {
  const duplicateStream = getDuplicateStream({
    stdioItem,
    direction,
    fileDescriptors,
    isSync
  });
  if (duplicateStream !== void 0) {
    return { ...stdioItem, stream: duplicateStream };
  }
  return {
    ...stdioItem,
    ...addProperties3[direction][stdioItem.type](stdioItem, options)
  };
};
var cleanupCustomStreams = (fileDescriptors) => {
  for (const { stdioItems } of fileDescriptors) {
    for (const { stream } of stdioItems) {
      if (stream !== void 0 && !isStandardStream(stream)) {
        stream.destroy();
      }
    }
  }
};
var forwardStdio = (stdioItems) => {
  if (stdioItems.length > 1) {
    return stdioItems.some(({ value: value2 }) => value2 === "overlapped") ? "overlapped" : "pipe";
  }
  const [{ type, value }] = stdioItems;
  return type === "native" ? value : "pipe";
};

// node_modules/execa/lib/stdio/handle-sync.js
var handleStdioSync = (options, verboseInfo) => handleStdio(addPropertiesSync, options, verboseInfo, true);
var forbiddenIfSync = ({ type, optionName }) => {
  throwInvalidSyncValue(optionName, TYPE_TO_MESSAGE[type]);
};
var forbiddenNativeIfSync = ({ optionName, value }) => {
  if (value === "ipc" || value === "overlapped") {
    throwInvalidSyncValue(optionName, `"${value}"`);
  }
  return {};
};
var throwInvalidSyncValue = (optionName, value) => {
  throw new TypeError(`The \`${optionName}\` option cannot be ${value} with synchronous methods.`);
};
var addProperties = {
  generator() {
  },
  asyncGenerator: forbiddenIfSync,
  webStream: forbiddenIfSync,
  nodeStream: forbiddenIfSync,
  webTransform: forbiddenIfSync,
  duplex: forbiddenIfSync,
  asyncIterable: forbiddenIfSync,
  native: forbiddenNativeIfSync
};
var addPropertiesSync = {
  input: {
    ...addProperties,
    fileUrl: ({ value }) => ({ contents: [bufferToUint8Array(readFileSync2(value))] }),
    filePath: ({ value: { file } }) => ({ contents: [bufferToUint8Array(readFileSync2(file))] }),
    fileNumber: forbiddenIfSync,
    iterable: ({ value }) => ({ contents: [...value] }),
    string: ({ value }) => ({ contents: [value] }),
    uint8Array: ({ value }) => ({ contents: [value] })
  },
  output: {
    ...addProperties,
    fileUrl: ({ value }) => ({ path: value }),
    filePath: ({ value: { file, append } }) => ({ path: file, append }),
    fileNumber: ({ value }) => ({ path: value }),
    iterable: forbiddenIfSync,
    string: forbiddenIfSync,
    uint8Array: forbiddenIfSync
  }
};

// node_modules/execa/lib/io/strip-newline.js
var stripNewline = (value, { stripFinalNewline: stripFinalNewline2 }, fdNumber) => getStripFinalNewline(stripFinalNewline2, fdNumber) && value !== void 0 && !Array.isArray(value) ? stripFinalNewline(value) : value;
var getStripFinalNewline = (stripFinalNewline2, fdNumber) => fdNumber === "all" ? stripFinalNewline2[1] || stripFinalNewline2[2] : stripFinalNewline2[fdNumber];

// node_modules/execa/lib/transform/generator.js
import { Transform, getDefaultHighWaterMark } from "node:stream";

// node_modules/execa/lib/transform/split.js
var getSplitLinesGenerator = (binary, preserveNewlines, skipped, state) => binary || skipped ? void 0 : initializeSplitLines(preserveNewlines, state);
var splitLinesSync = (chunk, preserveNewlines, objectMode) => objectMode ? chunk.flatMap((item) => splitLinesItemSync(item, preserveNewlines)) : splitLinesItemSync(chunk, preserveNewlines);
var splitLinesItemSync = (chunk, preserveNewlines) => {
  const { transform, final } = initializeSplitLines(preserveNewlines, {});
  return [...transform(chunk), ...final()];
};
var initializeSplitLines = (preserveNewlines, state) => {
  state.previousChunks = "";
  return {
    transform: splitGenerator.bind(void 0, state, preserveNewlines),
    final: linesFinal.bind(void 0, state)
  };
};
var splitGenerator = function* (state, preserveNewlines, chunk) {
  if (typeof chunk !== "string") {
    yield chunk;
    return;
  }
  let { previousChunks } = state;
  let start = -1;
  for (let end = 0; end < chunk.length; end += 1) {
    if (chunk[end] === "\n") {
      const newlineLength = getNewlineLength(chunk, end, preserveNewlines, state);
      let line = chunk.slice(start + 1, end + 1 - newlineLength);
      if (previousChunks.length > 0) {
        line = concatString(previousChunks, line);
        previousChunks = "";
      }
      yield line;
      start = end;
    }
  }
  if (start !== chunk.length - 1) {
    previousChunks = concatString(previousChunks, chunk.slice(start + 1));
  }
  state.previousChunks = previousChunks;
};
var getNewlineLength = (chunk, end, preserveNewlines, state) => {
  if (preserveNewlines) {
    return 0;
  }
  state.isWindowsNewline = end !== 0 && chunk[end - 1] === "\r";
  return state.isWindowsNewline ? 2 : 1;
};
var linesFinal = function* ({ previousChunks }) {
  if (previousChunks.length > 0) {
    yield previousChunks;
  }
};
var getAppendNewlineGenerator = ({ binary, preserveNewlines, readableObjectMode, state }) => binary || preserveNewlines || readableObjectMode ? void 0 : { transform: appendNewlineGenerator.bind(void 0, state) };
var appendNewlineGenerator = function* ({ isWindowsNewline = false }, chunk) {
  const { unixNewline, windowsNewline, LF: LF2, concatBytes } = typeof chunk === "string" ? linesStringInfo : linesUint8ArrayInfo;
  if (chunk.at(-1) === LF2) {
    yield chunk;
    return;
  }
  const newline = isWindowsNewline ? windowsNewline : unixNewline;
  yield concatBytes(chunk, newline);
};
var concatString = (firstChunk, secondChunk) => `${firstChunk}${secondChunk}`;
var linesStringInfo = {
  windowsNewline: "\r\n",
  unixNewline: "\n",
  LF: "\n",
  concatBytes: concatString
};
var concatUint8Array = (firstChunk, secondChunk) => {
  const chunk = new Uint8Array(firstChunk.length + secondChunk.length);
  chunk.set(firstChunk, 0);
  chunk.set(secondChunk, firstChunk.length);
  return chunk;
};
var linesUint8ArrayInfo = {
  windowsNewline: new Uint8Array([13, 10]),
  unixNewline: new Uint8Array([10]),
  LF: 10,
  concatBytes: concatUint8Array
};

// node_modules/execa/lib/transform/validate.js
import { Buffer as Buffer2 } from "node:buffer";
var getValidateTransformInput = (writableObjectMode, optionName) => writableObjectMode ? void 0 : validateStringTransformInput.bind(void 0, optionName);
var validateStringTransformInput = function* (optionName, chunk) {
  if (typeof chunk !== "string" && !isUint8Array(chunk) && !Buffer2.isBuffer(chunk)) {
    throw new TypeError(`The \`${optionName}\` option's transform must use "objectMode: true" to receive as input: ${typeof chunk}.`);
  }
  yield chunk;
};
var getValidateTransformReturn = (readableObjectMode, optionName) => readableObjectMode ? validateObjectTransformReturn.bind(void 0, optionName) : validateStringTransformReturn.bind(void 0, optionName);
var validateObjectTransformReturn = function* (optionName, chunk) {
  validateEmptyReturn(optionName, chunk);
  yield chunk;
};
var validateStringTransformReturn = function* (optionName, chunk) {
  validateEmptyReturn(optionName, chunk);
  if (typeof chunk !== "string" && !isUint8Array(chunk)) {
    throw new TypeError(`The \`${optionName}\` option's function must yield a string or an Uint8Array, not ${typeof chunk}.`);
  }
  yield chunk;
};
var validateEmptyReturn = (optionName, chunk) => {
  if (chunk === null || chunk === void 0) {
    throw new TypeError(`The \`${optionName}\` option's function must not call \`yield ${chunk}\`.
Instead, \`yield\` should either be called with a value, or not be called at all. For example:
  if (condition) { yield value; }`);
  }
};

// node_modules/execa/lib/transform/encoding-transform.js
import { Buffer as Buffer3 } from "node:buffer";
import { StringDecoder as StringDecoder2 } from "node:string_decoder";
var getEncodingTransformGenerator = (binary, encoding, skipped) => {
  if (skipped) {
    return;
  }
  if (binary) {
    return { transform: encodingUint8ArrayGenerator.bind(void 0, new TextEncoder()) };
  }
  const stringDecoder = new StringDecoder2(encoding);
  return {
    transform: encodingStringGenerator.bind(void 0, stringDecoder),
    final: encodingStringFinal.bind(void 0, stringDecoder)
  };
};
var encodingUint8ArrayGenerator = function* (textEncoder3, chunk) {
  if (Buffer3.isBuffer(chunk)) {
    yield bufferToUint8Array(chunk);
  } else if (typeof chunk === "string") {
    yield textEncoder3.encode(chunk);
  } else {
    yield chunk;
  }
};
var encodingStringGenerator = function* (stringDecoder, chunk) {
  yield isUint8Array(chunk) ? stringDecoder.write(chunk) : chunk;
};
var encodingStringFinal = function* (stringDecoder) {
  const lastChunk = stringDecoder.end();
  if (lastChunk !== "") {
    yield lastChunk;
  }
};

// node_modules/execa/lib/transform/run-async.js
import { callbackify } from "node:util";
var pushChunks = callbackify(async (getChunks, state, getChunksArguments, transformStream) => {
  state.currentIterable = getChunks(...getChunksArguments);
  try {
    for await (const chunk of state.currentIterable) {
      transformStream.push(chunk);
    }
  } finally {
    delete state.currentIterable;
  }
});
var transformChunk = async function* (chunk, generators, index) {
  if (index === generators.length) {
    yield chunk;
    return;
  }
  const { transform = identityGenerator } = generators[index];
  for await (const transformedChunk of transform(chunk)) {
    yield* transformChunk(transformedChunk, generators, index + 1);
  }
};
var finalChunks = async function* (generators) {
  for (const [index, { final }] of Object.entries(generators)) {
    yield* generatorFinalChunks(final, Number(index), generators);
  }
};
var generatorFinalChunks = async function* (final, index, generators) {
  if (final === void 0) {
    return;
  }
  for await (const finalChunk of final()) {
    yield* transformChunk(finalChunk, generators, index + 1);
  }
};
var destroyTransform = callbackify(async ({ currentIterable }, error) => {
  if (currentIterable !== void 0) {
    await (error ? currentIterable.throw(error) : currentIterable.return());
    return;
  }
  if (error) {
    throw error;
  }
});
var identityGenerator = function* (chunk) {
  yield chunk;
};

// node_modules/execa/lib/transform/run-sync.js
var pushChunksSync = (getChunksSync, getChunksArguments, transformStream, done) => {
  try {
    for (const chunk of getChunksSync(...getChunksArguments)) {
      transformStream.push(chunk);
    }
    done();
  } catch (error) {
    done(error);
  }
};
var runTransformSync = (generators, chunks) => [
  ...chunks.flatMap((chunk) => [...transformChunkSync(chunk, generators, 0)]),
  ...finalChunksSync(generators)
];
var transformChunkSync = function* (chunk, generators, index) {
  if (index === generators.length) {
    yield chunk;
    return;
  }
  const { transform = identityGenerator2 } = generators[index];
  for (const transformedChunk of transform(chunk)) {
    yield* transformChunkSync(transformedChunk, generators, index + 1);
  }
};
var finalChunksSync = function* (generators) {
  for (const [index, { final }] of Object.entries(generators)) {
    yield* generatorFinalChunksSync(final, Number(index), generators);
  }
};
var generatorFinalChunksSync = function* (final, index, generators) {
  if (final === void 0) {
    return;
  }
  for (const finalChunk of final()) {
    yield* transformChunkSync(finalChunk, generators, index + 1);
  }
};
var identityGenerator2 = function* (chunk) {
  yield chunk;
};

// node_modules/execa/lib/transform/generator.js
var generatorToStream = ({
  value,
  value: { transform, final, writableObjectMode, readableObjectMode },
  optionName
}, { encoding }) => {
  const state = {};
  const generators = addInternalGenerators(value, encoding, optionName);
  const transformAsync = isAsyncGenerator(transform);
  const finalAsync = isAsyncGenerator(final);
  const transformMethod = transformAsync ? pushChunks.bind(void 0, transformChunk, state) : pushChunksSync.bind(void 0, transformChunkSync);
  const finalMethod = transformAsync || finalAsync ? pushChunks.bind(void 0, finalChunks, state) : pushChunksSync.bind(void 0, finalChunksSync);
  const destroyMethod = transformAsync || finalAsync ? destroyTransform.bind(void 0, state) : void 0;
  const stream = new Transform({
    writableObjectMode,
    writableHighWaterMark: getDefaultHighWaterMark(writableObjectMode),
    readableObjectMode,
    readableHighWaterMark: getDefaultHighWaterMark(readableObjectMode),
    transform(chunk, encoding2, done) {
      transformMethod([chunk, generators, 0], this, done);
    },
    flush(done) {
      finalMethod([generators], this, done);
    },
    destroy: destroyMethod
  });
  return { stream };
};
var runGeneratorsSync = (chunks, stdioItems, encoding, isInput) => {
  const generators = stdioItems.filter(({ type }) => type === "generator");
  const reversedGenerators = isInput ? generators.reverse() : generators;
  for (const { value, optionName } of reversedGenerators) {
    const generators2 = addInternalGenerators(value, encoding, optionName);
    chunks = runTransformSync(generators2, chunks);
  }
  return chunks;
};
var addInternalGenerators = ({ transform, final, binary, writableObjectMode, readableObjectMode, preserveNewlines }, encoding, optionName) => {
  const state = {};
  return [
    { transform: getValidateTransformInput(writableObjectMode, optionName) },
    getEncodingTransformGenerator(binary, encoding, writableObjectMode),
    getSplitLinesGenerator(binary, preserveNewlines, writableObjectMode, state),
    { transform, final },
    { transform: getValidateTransformReturn(readableObjectMode, optionName) },
    getAppendNewlineGenerator({
      binary,
      preserveNewlines,
      readableObjectMode,
      state
    })
  ].filter(Boolean);
};

// node_modules/execa/lib/io/input-sync.js
var addInputOptionsSync = (fileDescriptors, options) => {
  for (const fdNumber of getInputFdNumbers(fileDescriptors)) {
    addInputOptionSync(fileDescriptors, fdNumber, options);
  }
};
var getInputFdNumbers = (fileDescriptors) => new Set(Object.entries(fileDescriptors).filter(([, { direction }]) => direction === "input").map(([fdNumber]) => Number(fdNumber)));
var addInputOptionSync = (fileDescriptors, fdNumber, options) => {
  const { stdioItems } = fileDescriptors[fdNumber];
  const allStdioItems = stdioItems.filter(({ contents }) => contents !== void 0);
  if (allStdioItems.length === 0) {
    return;
  }
  if (fdNumber !== 0) {
    const [{ type, optionName }] = allStdioItems;
    throw new TypeError(`Only the \`stdin\` option, not \`${optionName}\`, can be ${TYPE_TO_MESSAGE[type]} with synchronous methods.`);
  }
  const allContents = allStdioItems.map(({ contents }) => contents);
  const transformedContents = allContents.map((contents) => applySingleInputGeneratorsSync(contents, stdioItems));
  options.input = joinToUint8Array(transformedContents);
};
var applySingleInputGeneratorsSync = (contents, stdioItems) => {
  const newContents = runGeneratorsSync(contents, stdioItems, "utf8", true);
  validateSerializable(newContents);
  return joinToUint8Array(newContents);
};
var validateSerializable = (newContents) => {
  const invalidItem = newContents.find((item) => typeof item !== "string" && !isUint8Array(item));
  if (invalidItem !== void 0) {
    throw new TypeError(`The \`stdin\` option is invalid: when passing objects as input, a transform must be used to serialize them to strings or Uint8Arrays: ${invalidItem}.`);
  }
};

// node_modules/execa/lib/io/output-sync.js
import { writeFileSync, appendFileSync } from "node:fs";

// node_modules/execa/lib/verbose/output.js
var shouldLogOutput = ({ stdioItems, encoding, verboseInfo, fdNumber }) => fdNumber !== "all" && isFullVerbose(verboseInfo, fdNumber) && !BINARY_ENCODINGS.has(encoding) && fdUsesVerbose(fdNumber) && (stdioItems.some(({ type, value }) => type === "native" && PIPED_STDIO_VALUES.has(value)) || stdioItems.every(({ type }) => TRANSFORM_TYPES.has(type)));
var fdUsesVerbose = (fdNumber) => fdNumber === 1 || fdNumber === 2;
var PIPED_STDIO_VALUES = /* @__PURE__ */ new Set(["pipe", "overlapped"]);
var logLines = async (linesIterable, stream, fdNumber, verboseInfo) => {
  for await (const line of linesIterable) {
    if (!isPipingStream(stream)) {
      logLine(line, fdNumber, verboseInfo);
    }
  }
};
var logLinesSync = (linesArray, fdNumber, verboseInfo) => {
  for (const line of linesArray) {
    logLine(line, fdNumber, verboseInfo);
  }
};
var isPipingStream = (stream) => stream._readableState.pipes.length > 0;
var logLine = (line, fdNumber, verboseInfo) => {
  const verboseMessage = serializeVerboseMessage(line);
  verboseLog({
    type: "output",
    verboseMessage,
    fdNumber,
    verboseInfo
  });
};

// node_modules/execa/lib/io/output-sync.js
var transformOutputSync = ({ fileDescriptors, syncResult: { output }, options, isMaxBuffer, verboseInfo }) => {
  if (output === null) {
    return { output: Array.from({ length: 3 }) };
  }
  const state = {};
  const outputFiles = /* @__PURE__ */ new Set([]);
  const transformedOutput = output.map((result, fdNumber) => transformOutputResultSync({
    result,
    fileDescriptors,
    fdNumber,
    state,
    outputFiles,
    isMaxBuffer,
    verboseInfo
  }, options));
  return { output: transformedOutput, ...state };
};
var transformOutputResultSync = ({ result, fileDescriptors, fdNumber, state, outputFiles, isMaxBuffer, verboseInfo }, { buffer, encoding, lines, stripFinalNewline: stripFinalNewline2, maxBuffer }) => {
  if (result === null) {
    return;
  }
  const truncatedResult = truncateMaxBufferSync(result, isMaxBuffer, maxBuffer);
  const uint8ArrayResult = bufferToUint8Array(truncatedResult);
  const { stdioItems, objectMode } = fileDescriptors[fdNumber];
  const chunks = runOutputGeneratorsSync([uint8ArrayResult], stdioItems, encoding, state);
  const { serializedResult, finalResult = serializedResult } = serializeChunks({
    chunks,
    objectMode,
    encoding,
    lines,
    stripFinalNewline: stripFinalNewline2,
    fdNumber
  });
  logOutputSync({
    serializedResult,
    fdNumber,
    state,
    verboseInfo,
    encoding,
    stdioItems,
    objectMode
  });
  const returnedResult = buffer[fdNumber] ? finalResult : void 0;
  try {
    if (state.error === void 0) {
      writeToFiles(serializedResult, stdioItems, outputFiles);
    }
    return returnedResult;
  } catch (error) {
    state.error = error;
    return returnedResult;
  }
};
var runOutputGeneratorsSync = (chunks, stdioItems, encoding, state) => {
  try {
    return runGeneratorsSync(chunks, stdioItems, encoding, false);
  } catch (error) {
    state.error = error;
    return chunks;
  }
};
var serializeChunks = ({ chunks, objectMode, encoding, lines, stripFinalNewline: stripFinalNewline2, fdNumber }) => {
  if (objectMode) {
    return { serializedResult: chunks };
  }
  if (encoding === "buffer") {
    return { serializedResult: joinToUint8Array(chunks) };
  }
  const serializedResult = joinToString(chunks, encoding);
  if (lines[fdNumber]) {
    return { serializedResult, finalResult: splitLinesSync(serializedResult, !stripFinalNewline2[fdNumber], objectMode) };
  }
  return { serializedResult };
};
var logOutputSync = ({ serializedResult, fdNumber, state, verboseInfo, encoding, stdioItems, objectMode }) => {
  if (!shouldLogOutput({
    stdioItems,
    encoding,
    verboseInfo,
    fdNumber
  })) {
    return;
  }
  const linesArray = splitLinesSync(serializedResult, false, objectMode);
  try {
    logLinesSync(linesArray, fdNumber, verboseInfo);
  } catch (error) {
    state.error ??= error;
  }
};
var writeToFiles = (serializedResult, stdioItems, outputFiles) => {
  for (const { path: path13, append } of stdioItems.filter(({ type }) => FILE_TYPES.has(type))) {
    const pathString = typeof path13 === "string" ? path13 : path13.toString();
    if (append || outputFiles.has(pathString)) {
      appendFileSync(path13, serializedResult);
    } else {
      outputFiles.add(pathString);
      writeFileSync(path13, serializedResult);
    }
  }
};

// node_modules/execa/lib/resolve/all-sync.js
var getAllSync = ([, stdout, stderr], options) => {
  if (!options.all) {
    return;
  }
  if (stdout === void 0) {
    return stderr;
  }
  if (stderr === void 0) {
    return stdout;
  }
  if (Array.isArray(stdout)) {
    return Array.isArray(stderr) ? [...stdout, ...stderr] : [...stdout, stripNewline(stderr, options, "all")];
  }
  if (Array.isArray(stderr)) {
    return [stripNewline(stdout, options, "all"), ...stderr];
  }
  if (isUint8Array(stdout) && isUint8Array(stderr)) {
    return concatUint8Arrays([stdout, stderr]);
  }
  return `${stdout}${stderr}`;
};

// node_modules/execa/lib/resolve/exit-async.js
import { once as once4 } from "node:events";
var waitForExit = async (subprocess, context) => {
  const [exitCode, signal] = await waitForExitOrError(subprocess);
  context.isForcefullyTerminated ??= false;
  return [exitCode, signal];
};
var waitForExitOrError = async (subprocess) => {
  const [spawnPayload, exitPayload] = await Promise.allSettled([
    once4(subprocess, "spawn"),
    once4(subprocess, "exit")
  ]);
  if (spawnPayload.status === "rejected") {
    return [];
  }
  return exitPayload.status === "rejected" ? waitForSubprocessExit(subprocess) : exitPayload.value;
};
var waitForSubprocessExit = async (subprocess) => {
  try {
    return await once4(subprocess, "exit");
  } catch {
    return waitForSubprocessExit(subprocess);
  }
};
var waitForSuccessfulExit = async (exitPromise) => {
  const [exitCode, signal] = await exitPromise;
  if (!isSubprocessErrorExit(exitCode, signal) && isFailedExit(exitCode, signal)) {
    throw new DiscardedError();
  }
  return [exitCode, signal];
};
var isSubprocessErrorExit = (exitCode, signal) => exitCode === void 0 && signal === void 0;
var isFailedExit = (exitCode, signal) => exitCode !== 0 || signal !== null;

// node_modules/execa/lib/resolve/exit-sync.js
var getExitResultSync = ({ error, status: exitCode, signal, output }, { maxBuffer }) => {
  const resultError = getResultError(error, exitCode, signal);
  const timedOut = resultError?.code === "ETIMEDOUT";
  const isMaxBuffer = isMaxBufferSync(resultError, output, maxBuffer);
  return {
    resultError,
    exitCode,
    signal,
    timedOut,
    isMaxBuffer
  };
};
var getResultError = (error, exitCode, signal) => {
  if (error !== void 0) {
    return error;
  }
  return isFailedExit(exitCode, signal) ? new DiscardedError() : void 0;
};

// node_modules/execa/lib/methods/main-sync.js
var execaCoreSync = (rawFile, rawArguments, rawOptions) => {
  const { file, commandArguments, command, escapedCommand, startTime, verboseInfo, options, fileDescriptors } = handleSyncArguments(rawFile, rawArguments, rawOptions);
  const result = spawnSubprocessSync({
    file,
    commandArguments,
    options,
    command,
    escapedCommand,
    verboseInfo,
    fileDescriptors,
    startTime
  });
  return handleResult(result, verboseInfo, options);
};
var handleSyncArguments = (rawFile, rawArguments, rawOptions) => {
  const { command, escapedCommand, startTime, verboseInfo } = handleCommand(rawFile, rawArguments, rawOptions);
  const syncOptions = normalizeSyncOptions(rawOptions);
  const { file, commandArguments, options } = normalizeOptions(rawFile, rawArguments, syncOptions);
  validateSyncOptions(options);
  const fileDescriptors = handleStdioSync(options, verboseInfo);
  return {
    file,
    commandArguments,
    command,
    escapedCommand,
    startTime,
    verboseInfo,
    options,
    fileDescriptors
  };
};
var normalizeSyncOptions = (options) => options.node && !options.ipc ? { ...options, ipc: false } : options;
var validateSyncOptions = ({ ipc, ipcInput, detached, cancelSignal }) => {
  if (ipcInput) {
    throwInvalidSyncOption("ipcInput");
  }
  if (ipc) {
    throwInvalidSyncOption("ipc: true");
  }
  if (detached) {
    throwInvalidSyncOption("detached: true");
  }
  if (cancelSignal) {
    throwInvalidSyncOption("cancelSignal");
  }
};
var throwInvalidSyncOption = (value) => {
  throw new TypeError(`The "${value}" option cannot be used with synchronous methods.`);
};
var spawnSubprocessSync = ({ file, commandArguments, options, command, escapedCommand, verboseInfo, fileDescriptors, startTime }) => {
  const syncResult = runSubprocessSync({
    file,
    commandArguments,
    options,
    command,
    escapedCommand,
    fileDescriptors,
    startTime
  });
  if (syncResult.failed) {
    return syncResult;
  }
  const { resultError, exitCode, signal, timedOut, isMaxBuffer } = getExitResultSync(syncResult, options);
  const { output, error = resultError } = transformOutputSync({
    fileDescriptors,
    syncResult,
    options,
    isMaxBuffer,
    verboseInfo
  });
  const stdio = output.map((stdioOutput, fdNumber) => stripNewline(stdioOutput, options, fdNumber));
  const all = stripNewline(getAllSync(output, options), options, "all");
  return getSyncResult({
    error,
    exitCode,
    signal,
    timedOut,
    isMaxBuffer,
    stdio,
    all,
    options,
    command,
    escapedCommand,
    startTime
  });
};
var runSubprocessSync = ({ file, commandArguments, options, command, escapedCommand, fileDescriptors, startTime }) => {
  try {
    addInputOptionsSync(fileDescriptors, options);
    const normalizedOptions = normalizeSpawnSyncOptions(options);
    return spawnSync(...concatenateShell(file, commandArguments, normalizedOptions));
  } catch (error) {
    return makeEarlyError({
      error,
      command,
      escapedCommand,
      fileDescriptors,
      options,
      startTime,
      isSync: true
    });
  }
};
var normalizeSpawnSyncOptions = ({ encoding, maxBuffer, ...options }) => ({ ...options, encoding: "buffer", maxBuffer: getMaxBufferSync(maxBuffer) });
var getSyncResult = ({ error, exitCode, signal, timedOut, isMaxBuffer, stdio, all, options, command, escapedCommand, startTime }) => error === void 0 ? makeSuccessResult({
  command,
  escapedCommand,
  stdio,
  all,
  ipcOutput: [],
  options,
  startTime
}) : makeError({
  error,
  command,
  escapedCommand,
  timedOut,
  isCanceled: false,
  isGracefullyCanceled: false,
  isMaxBuffer,
  isForcefullyTerminated: false,
  exitCode,
  signal,
  stdio,
  all,
  ipcOutput: [],
  options,
  startTime,
  isSync: true
});

// node_modules/execa/lib/methods/main-async.js
import { setMaxListeners } from "node:events";
import { spawn } from "node:child_process";

// node_modules/execa/lib/ipc/methods.js
import process8 from "node:process";

// node_modules/execa/lib/ipc/get-one.js
import { once as once5, on as on2 } from "node:events";
var getOneMessage = ({ anyProcess, channel, isSubprocess, ipc }, { reference = true, filter } = {}) => {
  validateIpcMethod({
    methodName: "getOneMessage",
    isSubprocess,
    ipc,
    isConnected: isConnected(anyProcess)
  });
  return getOneMessageAsync({
    anyProcess,
    channel,
    isSubprocess,
    filter,
    reference
  });
};
var getOneMessageAsync = async ({ anyProcess, channel, isSubprocess, filter, reference }) => {
  addReference(channel, reference);
  const ipcEmitter = getIpcEmitter(anyProcess, channel, isSubprocess);
  const controller = new AbortController();
  try {
    return await Promise.race([
      getMessage(ipcEmitter, filter, controller),
      throwOnDisconnect2(ipcEmitter, isSubprocess, controller),
      throwOnStrictError(ipcEmitter, isSubprocess, controller)
    ]);
  } catch (error) {
    disconnect(anyProcess);
    throw error;
  } finally {
    controller.abort();
    removeReference(channel, reference);
  }
};
var getMessage = async (ipcEmitter, filter, { signal }) => {
  if (filter === void 0) {
    const [message] = await once5(ipcEmitter, "message", { signal });
    return message;
  }
  for await (const [message] of on2(ipcEmitter, "message", { signal })) {
    if (filter(message)) {
      return message;
    }
  }
};
var throwOnDisconnect2 = async (ipcEmitter, isSubprocess, { signal }) => {
  await once5(ipcEmitter, "disconnect", { signal });
  throwOnEarlyDisconnect(isSubprocess);
};
var throwOnStrictError = async (ipcEmitter, isSubprocess, { signal }) => {
  const [error] = await once5(ipcEmitter, "strict:error", { signal });
  throw getStrictResponseError(error, isSubprocess);
};

// node_modules/execa/lib/ipc/get-each.js
import { once as once6, on as on3 } from "node:events";
var getEachMessage = ({ anyProcess, channel, isSubprocess, ipc }, { reference = true } = {}) => loopOnMessages({
  anyProcess,
  channel,
  isSubprocess,
  ipc,
  shouldAwait: !isSubprocess,
  reference
});
var loopOnMessages = ({ anyProcess, channel, isSubprocess, ipc, shouldAwait, reference }) => {
  validateIpcMethod({
    methodName: "getEachMessage",
    isSubprocess,
    ipc,
    isConnected: isConnected(anyProcess)
  });
  addReference(channel, reference);
  const ipcEmitter = getIpcEmitter(anyProcess, channel, isSubprocess);
  const controller = new AbortController();
  const state = {};
  stopOnDisconnect(anyProcess, ipcEmitter, controller);
  abortOnStrictError({
    ipcEmitter,
    isSubprocess,
    controller,
    state
  });
  return iterateOnMessages({
    anyProcess,
    channel,
    ipcEmitter,
    isSubprocess,
    shouldAwait,
    controller,
    state,
    reference
  });
};
var stopOnDisconnect = async (anyProcess, ipcEmitter, controller) => {
  try {
    await once6(ipcEmitter, "disconnect", { signal: controller.signal });
    controller.abort();
  } catch {
  }
};
var abortOnStrictError = async ({ ipcEmitter, isSubprocess, controller, state }) => {
  try {
    const [error] = await once6(ipcEmitter, "strict:error", { signal: controller.signal });
    state.error = getStrictResponseError(error, isSubprocess);
    controller.abort();
  } catch {
  }
};
var iterateOnMessages = async function* ({ anyProcess, channel, ipcEmitter, isSubprocess, shouldAwait, controller, state, reference }) {
  try {
    for await (const [message] of on3(ipcEmitter, "message", { signal: controller.signal })) {
      throwIfStrictError(state);
      yield message;
    }
  } catch {
    throwIfStrictError(state);
  } finally {
    controller.abort();
    removeReference(channel, reference);
    if (!isSubprocess) {
      disconnect(anyProcess);
    }
    if (shouldAwait) {
      await anyProcess;
    }
  }
};
var throwIfStrictError = ({ error }) => {
  if (error) {
    throw error;
  }
};

// node_modules/execa/lib/ipc/methods.js
var addIpcMethods = (subprocess, { ipc }) => {
  Object.assign(subprocess, getIpcMethods(subprocess, false, ipc));
};
var getIpcExport = () => {
  const anyProcess = process8;
  const isSubprocess = true;
  const ipc = process8.channel !== void 0;
  return {
    ...getIpcMethods(anyProcess, isSubprocess, ipc),
    getCancelSignal: getCancelSignal.bind(void 0, {
      anyProcess,
      channel: anyProcess.channel,
      isSubprocess,
      ipc
    })
  };
};
var getIpcMethods = (anyProcess, isSubprocess, ipc) => ({
  sendMessage: sendMessage.bind(void 0, {
    anyProcess,
    channel: anyProcess.channel,
    isSubprocess,
    ipc
  }),
  getOneMessage: getOneMessage.bind(void 0, {
    anyProcess,
    channel: anyProcess.channel,
    isSubprocess,
    ipc
  }),
  getEachMessage: getEachMessage.bind(void 0, {
    anyProcess,
    channel: anyProcess.channel,
    isSubprocess,
    ipc
  })
});

// node_modules/execa/lib/return/early-error.js
import { ChildProcess as ChildProcess2 } from "node:child_process";
import {
  PassThrough,
  Readable,
  Writable,
  Duplex
} from "node:stream";
var handleEarlyError = ({ error, command, escapedCommand, fileDescriptors, options, startTime, verboseInfo }) => {
  cleanupCustomStreams(fileDescriptors);
  const subprocess = new ChildProcess2();
  createDummyStreams(subprocess, fileDescriptors);
  Object.assign(subprocess, { readable, writable, duplex });
  const earlyError = makeEarlyError({
    error,
    command,
    escapedCommand,
    fileDescriptors,
    options,
    startTime,
    isSync: false
  });
  const promise = handleDummyPromise(earlyError, verboseInfo, options);
  return { subprocess, promise };
};
var createDummyStreams = (subprocess, fileDescriptors) => {
  const stdin = createDummyStream();
  const stdout = createDummyStream();
  const stderr = createDummyStream();
  const extraStdio = Array.from({ length: fileDescriptors.length - 3 }, createDummyStream);
  const all = createDummyStream();
  const stdio = [stdin, stdout, stderr, ...extraStdio];
  Object.assign(subprocess, {
    stdin,
    stdout,
    stderr,
    all,
    stdio
  });
};
var createDummyStream = () => {
  const stream = new PassThrough();
  stream.end();
  return stream;
};
var readable = () => new Readable({ read() {
} });
var writable = () => new Writable({ write() {
} });
var duplex = () => new Duplex({ read() {
}, write() {
} });
var handleDummyPromise = async (error, verboseInfo, options) => handleResult(error, verboseInfo, options);

// node_modules/execa/lib/stdio/handle-async.js
import { createReadStream, createWriteStream } from "node:fs";
import { Buffer as Buffer4 } from "node:buffer";
import { Readable as Readable2, Writable as Writable2, Duplex as Duplex2 } from "node:stream";
var handleStdioAsync = (options, verboseInfo) => handleStdio(addPropertiesAsync, options, verboseInfo, false);
var forbiddenIfAsync = ({ type, optionName }) => {
  throw new TypeError(`The \`${optionName}\` option cannot be ${TYPE_TO_MESSAGE[type]}.`);
};
var addProperties2 = {
  fileNumber: forbiddenIfAsync,
  generator: generatorToStream,
  asyncGenerator: generatorToStream,
  nodeStream: ({ value }) => ({ stream: value }),
  webTransform({ value: { transform, writableObjectMode, readableObjectMode } }) {
    const objectMode = writableObjectMode || readableObjectMode;
    const stream = Duplex2.fromWeb(transform, { objectMode });
    return { stream };
  },
  duplex: ({ value: { transform } }) => ({ stream: transform }),
  native() {
  }
};
var addPropertiesAsync = {
  input: {
    ...addProperties2,
    fileUrl: ({ value }) => ({ stream: createReadStream(value) }),
    filePath: ({ value: { file } }) => ({ stream: createReadStream(file) }),
    webStream: ({ value }) => ({ stream: Readable2.fromWeb(value) }),
    iterable: ({ value }) => ({ stream: Readable2.from(value) }),
    asyncIterable: ({ value }) => ({ stream: Readable2.from(value) }),
    string: ({ value }) => ({ stream: Readable2.from(value) }),
    uint8Array: ({ value }) => ({ stream: Readable2.from(Buffer4.from(value)) })
  },
  output: {
    ...addProperties2,
    fileUrl: ({ value }) => ({ stream: createWriteStream(value) }),
    filePath: ({ value: { file, append } }) => ({ stream: createWriteStream(file, append ? { flags: "a" } : {}) }),
    webStream: ({ value }) => ({ stream: Writable2.fromWeb(value) }),
    iterable: forbiddenIfAsync,
    asyncIterable: forbiddenIfAsync,
    string: forbiddenIfAsync,
    uint8Array: forbiddenIfAsync
  }
};

// node_modules/@sindresorhus/merge-streams/index.js
import { on as on4, once as once7 } from "node:events";
import { PassThrough as PassThroughStream, getDefaultHighWaterMark as getDefaultHighWaterMark2 } from "node:stream";
import { finished as finished2 } from "node:stream/promises";
function mergeStreams(streams) {
  if (!Array.isArray(streams)) {
    throw new TypeError(`Expected an array, got \`${typeof streams}\`.`);
  }
  for (const stream of streams) {
    validateStream(stream);
  }
  const objectMode = streams.some(({ readableObjectMode }) => readableObjectMode);
  const highWaterMark = getHighWaterMark(streams, objectMode);
  const passThroughStream = new MergedStream({
    objectMode,
    writableHighWaterMark: highWaterMark,
    readableHighWaterMark: highWaterMark
  });
  for (const stream of streams) {
    passThroughStream.add(stream);
  }
  return passThroughStream;
}
var getHighWaterMark = (streams, objectMode) => {
  if (streams.length === 0) {
    return getDefaultHighWaterMark2(objectMode);
  }
  const highWaterMarks = streams.filter(({ readableObjectMode }) => readableObjectMode === objectMode).map(({ readableHighWaterMark }) => readableHighWaterMark);
  return Math.max(...highWaterMarks);
};
var MergedStream = class extends PassThroughStream {
  #streams = /* @__PURE__ */ new Set([]);
  #ended = /* @__PURE__ */ new Set([]);
  #aborted = /* @__PURE__ */ new Set([]);
  #onFinished;
  #unpipeEvent = Symbol("unpipe");
  #streamPromises = /* @__PURE__ */ new WeakMap();
  add(stream) {
    validateStream(stream);
    if (this.#streams.has(stream)) {
      return;
    }
    this.#streams.add(stream);
    this.#onFinished ??= onMergedStreamFinished(this, this.#streams, this.#unpipeEvent);
    const streamPromise = endWhenStreamsDone({
      passThroughStream: this,
      stream,
      streams: this.#streams,
      ended: this.#ended,
      aborted: this.#aborted,
      onFinished: this.#onFinished,
      unpipeEvent: this.#unpipeEvent
    });
    this.#streamPromises.set(stream, streamPromise);
    stream.pipe(this, { end: false });
  }
  async remove(stream) {
    validateStream(stream);
    if (!this.#streams.has(stream)) {
      return false;
    }
    const streamPromise = this.#streamPromises.get(stream);
    if (streamPromise === void 0) {
      return false;
    }
    this.#streamPromises.delete(stream);
    stream.unpipe(this);
    await streamPromise;
    return true;
  }
};
var onMergedStreamFinished = async (passThroughStream, streams, unpipeEvent) => {
  updateMaxListeners(passThroughStream, PASSTHROUGH_LISTENERS_COUNT);
  const controller = new AbortController();
  try {
    await Promise.race([
      onMergedStreamEnd(passThroughStream, controller),
      onInputStreamsUnpipe(passThroughStream, streams, unpipeEvent, controller)
    ]);
  } finally {
    controller.abort();
    updateMaxListeners(passThroughStream, -PASSTHROUGH_LISTENERS_COUNT);
  }
};
var onMergedStreamEnd = async (passThroughStream, { signal }) => {
  try {
    await finished2(passThroughStream, { signal, cleanup: true });
  } catch (error) {
    errorOrAbortStream(passThroughStream, error);
    throw error;
  }
};
var onInputStreamsUnpipe = async (passThroughStream, streams, unpipeEvent, { signal }) => {
  for await (const [unpipedStream] of on4(passThroughStream, "unpipe", { signal })) {
    if (streams.has(unpipedStream)) {
      unpipedStream.emit(unpipeEvent);
    }
  }
};
var validateStream = (stream) => {
  if (typeof stream?.pipe !== "function") {
    throw new TypeError(`Expected a readable stream, got: \`${typeof stream}\`.`);
  }
};
var endWhenStreamsDone = async ({ passThroughStream, stream, streams, ended, aborted: aborted2, onFinished, unpipeEvent }) => {
  updateMaxListeners(passThroughStream, PASSTHROUGH_LISTENERS_PER_STREAM);
  const controller = new AbortController();
  try {
    await Promise.race([
      afterMergedStreamFinished(onFinished, stream, controller),
      onInputStreamEnd({
        passThroughStream,
        stream,
        streams,
        ended,
        aborted: aborted2,
        controller
      }),
      onInputStreamUnpipe({
        stream,
        streams,
        ended,
        aborted: aborted2,
        unpipeEvent,
        controller
      })
    ]);
  } finally {
    controller.abort();
    updateMaxListeners(passThroughStream, -PASSTHROUGH_LISTENERS_PER_STREAM);
  }
  if (streams.size > 0 && streams.size === ended.size + aborted2.size) {
    if (ended.size === 0 && aborted2.size > 0) {
      abortStream(passThroughStream);
    } else {
      endStream(passThroughStream);
    }
  }
};
var afterMergedStreamFinished = async (onFinished, stream, { signal }) => {
  try {
    await onFinished;
    if (!signal.aborted) {
      abortStream(stream);
    }
  } catch (error) {
    if (!signal.aborted) {
      errorOrAbortStream(stream, error);
    }
  }
};
var onInputStreamEnd = async ({ passThroughStream, stream, streams, ended, aborted: aborted2, controller: { signal } }) => {
  try {
    await finished2(stream, {
      signal,
      cleanup: true,
      readable: true,
      writable: false
    });
    if (streams.has(stream)) {
      ended.add(stream);
    }
  } catch (error) {
    if (signal.aborted || !streams.has(stream)) {
      return;
    }
    if (isAbortError(error)) {
      aborted2.add(stream);
    } else {
      errorStream(passThroughStream, error);
    }
  }
};
var onInputStreamUnpipe = async ({ stream, streams, ended, aborted: aborted2, unpipeEvent, controller: { signal } }) => {
  await once7(stream, unpipeEvent, { signal });
  if (!stream.readable) {
    return once7(signal, "abort", { signal });
  }
  streams.delete(stream);
  ended.delete(stream);
  aborted2.delete(stream);
};
var endStream = (stream) => {
  if (stream.writable) {
    stream.end();
  }
};
var errorOrAbortStream = (stream, error) => {
  if (isAbortError(error)) {
    abortStream(stream);
  } else {
    errorStream(stream, error);
  }
};
var isAbortError = (error) => error?.code === "ERR_STREAM_PREMATURE_CLOSE";
var abortStream = (stream) => {
  if (stream.readable || stream.writable) {
    stream.destroy();
  }
};
var errorStream = (stream, error) => {
  if (!stream.destroyed) {
    stream.once("error", noop2);
    stream.destroy(error);
  }
};
var noop2 = () => {
};
var updateMaxListeners = (passThroughStream, increment2) => {
  const maxListeners = passThroughStream.getMaxListeners();
  if (maxListeners !== 0 && maxListeners !== Number.POSITIVE_INFINITY) {
    passThroughStream.setMaxListeners(maxListeners + increment2);
  }
};
var PASSTHROUGH_LISTENERS_COUNT = 2;
var PASSTHROUGH_LISTENERS_PER_STREAM = 1;

// node_modules/execa/lib/io/pipeline.js
import { finished as finished3 } from "node:stream/promises";
var pipeStreams = (source, destination) => {
  source.pipe(destination);
  onSourceFinish(source, destination);
  onDestinationFinish(source, destination);
};
var onSourceFinish = async (source, destination) => {
  if (isStandardStream(source) || isStandardStream(destination)) {
    return;
  }
  try {
    await finished3(source, { cleanup: true, readable: true, writable: false });
  } catch {
  }
  endDestinationStream(destination);
};
var endDestinationStream = (destination) => {
  if (destination.writable) {
    destination.end();
  }
};
var onDestinationFinish = async (source, destination) => {
  if (isStandardStream(source) || isStandardStream(destination)) {
    return;
  }
  try {
    await finished3(destination, { cleanup: true, readable: false, writable: true });
  } catch {
  }
  abortSourceStream(source);
};
var abortSourceStream = (source) => {
  if (source.readable) {
    source.destroy();
  }
};

// node_modules/execa/lib/io/output-async.js
var pipeOutputAsync = (subprocess, fileDescriptors, controller) => {
  const pipeGroups = /* @__PURE__ */ new Map();
  for (const [fdNumber, { stdioItems, direction }] of Object.entries(fileDescriptors)) {
    for (const { stream } of stdioItems.filter(({ type }) => TRANSFORM_TYPES.has(type))) {
      pipeTransform(subprocess, stream, direction, fdNumber);
    }
    for (const { stream } of stdioItems.filter(({ type }) => !TRANSFORM_TYPES.has(type))) {
      pipeStdioItem({
        subprocess,
        stream,
        direction,
        fdNumber,
        pipeGroups,
        controller
      });
    }
  }
  for (const [outputStream, inputStreams] of pipeGroups.entries()) {
    const inputStream = inputStreams.length === 1 ? inputStreams[0] : mergeStreams(inputStreams);
    pipeStreams(inputStream, outputStream);
  }
};
var pipeTransform = (subprocess, stream, direction, fdNumber) => {
  if (direction === "output") {
    pipeStreams(subprocess.stdio[fdNumber], stream);
  } else {
    pipeStreams(stream, subprocess.stdio[fdNumber]);
  }
  const streamProperty = SUBPROCESS_STREAM_PROPERTIES[fdNumber];
  if (streamProperty !== void 0) {
    subprocess[streamProperty] = stream;
  }
  subprocess.stdio[fdNumber] = stream;
};
var SUBPROCESS_STREAM_PROPERTIES = ["stdin", "stdout", "stderr"];
var pipeStdioItem = ({ subprocess, stream, direction, fdNumber, pipeGroups, controller }) => {
  if (stream === void 0) {
    return;
  }
  setStandardStreamMaxListeners(stream, controller);
  const [inputStream, outputStream] = direction === "output" ? [stream, subprocess.stdio[fdNumber]] : [subprocess.stdio[fdNumber], stream];
  const outputStreams = pipeGroups.get(inputStream) ?? [];
  pipeGroups.set(inputStream, [...outputStreams, outputStream]);
};
var setStandardStreamMaxListeners = (stream, { signal }) => {
  if (isStandardStream(stream)) {
    incrementMaxListeners(stream, MAX_LISTENERS_INCREMENT, signal);
  }
};
var MAX_LISTENERS_INCREMENT = 2;

// node_modules/execa/lib/terminate/cleanup.js
import { addAbortListener as addAbortListener2 } from "node:events";

// node_modules/signal-exit/dist/mjs/signals.js
var signals = [];
signals.push("SIGHUP", "SIGINT", "SIGTERM");
if (process.platform !== "win32") {
  signals.push(
    "SIGALRM",
    "SIGABRT",
    "SIGVTALRM",
    "SIGXCPU",
    "SIGXFSZ",
    "SIGUSR2",
    "SIGTRAP",
    "SIGSYS",
    "SIGQUIT",
    "SIGIOT"
    // should detect profiler and enable/disable accordingly.
    // see #21
    // 'SIGPROF'
  );
}
if (process.platform === "linux") {
  signals.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
}

// node_modules/signal-exit/dist/mjs/index.js
var processOk = (process10) => !!process10 && typeof process10 === "object" && typeof process10.removeListener === "function" && typeof process10.emit === "function" && typeof process10.reallyExit === "function" && typeof process10.listeners === "function" && typeof process10.kill === "function" && typeof process10.pid === "number" && typeof process10.on === "function";
var kExitEmitter = Symbol.for("signal-exit emitter");
var global2 = globalThis;
var ObjectDefineProperty = Object.defineProperty.bind(Object);
var Emitter = class {
  emitted = {
    afterExit: false,
    exit: false
  };
  listeners = {
    afterExit: [],
    exit: []
  };
  count = 0;
  id = Math.random();
  constructor() {
    if (global2[kExitEmitter]) {
      return global2[kExitEmitter];
    }
    ObjectDefineProperty(global2, kExitEmitter, {
      value: this,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
  on(ev, fn) {
    this.listeners[ev].push(fn);
  }
  removeListener(ev, fn) {
    const list = this.listeners[ev];
    const i2 = list.indexOf(fn);
    if (i2 === -1) {
      return;
    }
    if (i2 === 0 && list.length === 1) {
      list.length = 0;
    } else {
      list.splice(i2, 1);
    }
  }
  emit(ev, code, signal) {
    if (this.emitted[ev]) {
      return false;
    }
    this.emitted[ev] = true;
    let ret = false;
    for (const fn of this.listeners[ev]) {
      ret = fn(code, signal) === true || ret;
    }
    if (ev === "exit") {
      ret = this.emit("afterExit", code, signal) || ret;
    }
    return ret;
  }
};
var SignalExitBase = class {
};
var signalExitWrap = (handler) => {
  return {
    onExit(cb, opts) {
      return handler.onExit(cb, opts);
    },
    load() {
      return handler.load();
    },
    unload() {
      return handler.unload();
    }
  };
};
var SignalExitFallback = class extends SignalExitBase {
  onExit() {
    return () => {
    };
  }
  load() {
  }
  unload() {
  }
};
var SignalExit = class extends SignalExitBase {
  // "SIGHUP" throws an `ENOSYS` error on Windows,
  // so use a supported signal instead
  /* c8 ignore start */
  #hupSig = process9.platform === "win32" ? "SIGINT" : "SIGHUP";
  /* c8 ignore stop */
  #emitter = new Emitter();
  #process;
  #originalProcessEmit;
  #originalProcessReallyExit;
  #sigListeners = {};
  #loaded = false;
  constructor(process10) {
    super();
    this.#process = process10;
    this.#sigListeners = {};
    for (const sig of signals) {
      this.#sigListeners[sig] = () => {
        const listeners = this.#process.listeners(sig);
        let { count: count2 } = this.#emitter;
        const p = process10;
        if (typeof p.__signal_exit_emitter__ === "object" && typeof p.__signal_exit_emitter__.count === "number") {
          count2 += p.__signal_exit_emitter__.count;
        }
        if (listeners.length === count2) {
          this.unload();
          const ret = this.#emitter.emit("exit", null, sig);
          const s = sig === "SIGHUP" ? this.#hupSig : sig;
          if (!ret)
            process10.kill(process10.pid, s);
        }
      };
    }
    this.#originalProcessReallyExit = process10.reallyExit;
    this.#originalProcessEmit = process10.emit;
  }
  onExit(cb, opts) {
    if (!processOk(this.#process)) {
      return () => {
      };
    }
    if (this.#loaded === false) {
      this.load();
    }
    const ev = opts?.alwaysLast ? "afterExit" : "exit";
    this.#emitter.on(ev, cb);
    return () => {
      this.#emitter.removeListener(ev, cb);
      if (this.#emitter.listeners["exit"].length === 0 && this.#emitter.listeners["afterExit"].length === 0) {
        this.unload();
      }
    };
  }
  load() {
    if (this.#loaded) {
      return;
    }
    this.#loaded = true;
    this.#emitter.count += 1;
    for (const sig of signals) {
      try {
        const fn = this.#sigListeners[sig];
        if (fn)
          this.#process.on(sig, fn);
      } catch (_) {
      }
    }
    this.#process.emit = (ev, ...a2) => {
      return this.#processEmit(ev, ...a2);
    };
    this.#process.reallyExit = (code) => {
      return this.#processReallyExit(code);
    };
  }
  unload() {
    if (!this.#loaded) {
      return;
    }
    this.#loaded = false;
    signals.forEach((sig) => {
      const listener = this.#sigListeners[sig];
      if (!listener) {
        throw new Error("Listener not defined for signal: " + sig);
      }
      try {
        this.#process.removeListener(sig, listener);
      } catch (_) {
      }
    });
    this.#process.emit = this.#originalProcessEmit;
    this.#process.reallyExit = this.#originalProcessReallyExit;
    this.#emitter.count -= 1;
  }
  #processReallyExit(code) {
    if (!processOk(this.#process)) {
      return 0;
    }
    this.#process.exitCode = code || 0;
    this.#emitter.emit("exit", this.#process.exitCode, null);
    return this.#originalProcessReallyExit.call(this.#process, this.#process.exitCode);
  }
  #processEmit(ev, ...args) {
    const og = this.#originalProcessEmit;
    if (ev === "exit" && processOk(this.#process)) {
      if (typeof args[0] === "number") {
        this.#process.exitCode = args[0];
      }
      const ret = og.call(this.#process, ev, ...args);
      this.#emitter.emit("exit", this.#process.exitCode, null);
      return ret;
    } else {
      return og.call(this.#process, ev, ...args);
    }
  }
};
var process9 = globalThis.process;
var {
  /**
   * Called when the process is exiting, whether via signal, explicit
   * exit, or running out of stuff to do.
   *
   * If the global process object is not suitable for instrumentation,
   * then this will be a no-op.
   *
   * Returns a function that may be used to unload signal-exit.
   */
  onExit,
  /**
   * Load the listeners.  Likely you never need to call this, unless
   * doing a rather deep integration with signal-exit functionality.
   * Mostly exposed for the benefit of testing.
   *
   * @internal
   */
  load,
  /**
   * Unload the listeners.  Likely you never need to call this, unless
   * doing a rather deep integration with signal-exit functionality.
   * Mostly exposed for the benefit of testing.
   *
   * @internal
   */
  unload
} = signalExitWrap(processOk(process9) ? new SignalExit(process9) : new SignalExitFallback());

// node_modules/execa/lib/terminate/cleanup.js
var cleanupOnExit = (subprocess, { cleanup, detached }, { signal }) => {
  if (!cleanup || detached) {
    return;
  }
  const removeExitHandler = onExit(() => {
    subprocess.kill();
  });
  addAbortListener2(signal, () => {
    removeExitHandler();
  });
};

// node_modules/execa/lib/pipe/pipe-arguments.js
var normalizePipeArguments = ({ source, sourcePromise, boundOptions, createNested }, ...pipeArguments) => {
  const startTime = getStartTime();
  const {
    destination,
    destinationStream,
    destinationError,
    from,
    unpipeSignal
  } = getDestinationStream(boundOptions, createNested, pipeArguments);
  const { sourceStream, sourceError } = getSourceStream(source, from);
  const { options: sourceOptions, fileDescriptors } = SUBPROCESS_OPTIONS.get(source);
  return {
    sourcePromise,
    sourceStream,
    sourceOptions,
    sourceError,
    destination,
    destinationStream,
    destinationError,
    unpipeSignal,
    fileDescriptors,
    startTime
  };
};
var getDestinationStream = (boundOptions, createNested, pipeArguments) => {
  try {
    const {
      destination,
      pipeOptions: { from, to, unpipeSignal } = {}
    } = getDestination(boundOptions, createNested, ...pipeArguments);
    const destinationStream = getToStream(destination, to);
    return {
      destination,
      destinationStream,
      from,
      unpipeSignal
    };
  } catch (error) {
    return { destinationError: error };
  }
};
var getDestination = (boundOptions, createNested, firstArgument, ...pipeArguments) => {
  if (Array.isArray(firstArgument)) {
    const destination = createNested(mapDestinationArguments, boundOptions)(firstArgument, ...pipeArguments);
    return { destination, pipeOptions: boundOptions };
  }
  if (typeof firstArgument === "string" || firstArgument instanceof URL || isDenoExecPath(firstArgument)) {
    if (Object.keys(boundOptions).length > 0) {
      throw new TypeError('Please use .pipe("file", ..., options) or .pipe(execa("file", ..., options)) instead of .pipe(options)("file", ...).');
    }
    const [rawFile, rawArguments, rawOptions] = normalizeParameters(firstArgument, ...pipeArguments);
    const destination = createNested(mapDestinationArguments)(rawFile, rawArguments, rawOptions);
    return { destination, pipeOptions: rawOptions };
  }
  if (SUBPROCESS_OPTIONS.has(firstArgument)) {
    if (Object.keys(boundOptions).length > 0) {
      throw new TypeError("Please use .pipe(options)`command` or .pipe($(options)`command`) instead of .pipe(options)($`command`).");
    }
    return { destination: firstArgument, pipeOptions: pipeArguments[0] };
  }
  throw new TypeError(`The first argument must be a template string, an options object, or an Execa subprocess: ${firstArgument}`);
};
var mapDestinationArguments = ({ options }) => ({ options: { ...options, stdin: "pipe", piped: true } });
var getSourceStream = (source, from) => {
  try {
    const sourceStream = getFromStream(source, from);
    return { sourceStream };
  } catch (error) {
    return { sourceError: error };
  }
};

// node_modules/execa/lib/pipe/throw.js
var handlePipeArgumentsError = ({
  sourceStream,
  sourceError,
  destinationStream,
  destinationError,
  fileDescriptors,
  sourceOptions,
  startTime
}) => {
  const error = getPipeArgumentsError({
    sourceStream,
    sourceError,
    destinationStream,
    destinationError
  });
  if (error !== void 0) {
    throw createNonCommandError({
      error,
      fileDescriptors,
      sourceOptions,
      startTime
    });
  }
};
var getPipeArgumentsError = ({ sourceStream, sourceError, destinationStream, destinationError }) => {
  if (sourceError !== void 0 && destinationError !== void 0) {
    return destinationError;
  }
  if (destinationError !== void 0) {
    abortSourceStream(sourceStream);
    return destinationError;
  }
  if (sourceError !== void 0) {
    endDestinationStream(destinationStream);
    return sourceError;
  }
};
var createNonCommandError = ({ error, fileDescriptors, sourceOptions, startTime }) => makeEarlyError({
  error,
  command: PIPE_COMMAND_MESSAGE,
  escapedCommand: PIPE_COMMAND_MESSAGE,
  fileDescriptors,
  options: sourceOptions,
  startTime,
  isSync: false
});
var PIPE_COMMAND_MESSAGE = "source.pipe(destination)";

// node_modules/execa/lib/pipe/sequence.js
var waitForBothSubprocesses = async (subprocessPromises) => {
  const [
    { status: sourceStatus, reason: sourceReason, value: sourceResult = sourceReason },
    { status: destinationStatus, reason: destinationReason, value: destinationResult = destinationReason }
  ] = await subprocessPromises;
  if (!destinationResult.pipedFrom.includes(sourceResult)) {
    destinationResult.pipedFrom.push(sourceResult);
  }
  if (destinationStatus === "rejected") {
    throw destinationResult;
  }
  if (sourceStatus === "rejected") {
    throw sourceResult;
  }
  return destinationResult;
};

// node_modules/execa/lib/pipe/streaming.js
import { finished as finished4 } from "node:stream/promises";
var pipeSubprocessStream = (sourceStream, destinationStream, maxListenersController) => {
  const mergedStream = MERGED_STREAMS.has(destinationStream) ? pipeMoreSubprocessStream(sourceStream, destinationStream) : pipeFirstSubprocessStream(sourceStream, destinationStream);
  incrementMaxListeners(sourceStream, SOURCE_LISTENERS_PER_PIPE, maxListenersController.signal);
  incrementMaxListeners(destinationStream, DESTINATION_LISTENERS_PER_PIPE, maxListenersController.signal);
  cleanupMergedStreamsMap(destinationStream);
  return mergedStream;
};
var pipeFirstSubprocessStream = (sourceStream, destinationStream) => {
  const mergedStream = mergeStreams([sourceStream]);
  pipeStreams(mergedStream, destinationStream);
  MERGED_STREAMS.set(destinationStream, mergedStream);
  return mergedStream;
};
var pipeMoreSubprocessStream = (sourceStream, destinationStream) => {
  const mergedStream = MERGED_STREAMS.get(destinationStream);
  mergedStream.add(sourceStream);
  return mergedStream;
};
var cleanupMergedStreamsMap = async (destinationStream) => {
  try {
    await finished4(destinationStream, { cleanup: true, readable: false, writable: true });
  } catch {
  }
  MERGED_STREAMS.delete(destinationStream);
};
var MERGED_STREAMS = /* @__PURE__ */ new WeakMap();
var SOURCE_LISTENERS_PER_PIPE = 2;
var DESTINATION_LISTENERS_PER_PIPE = 1;

// node_modules/execa/lib/pipe/abort.js
import { aborted } from "node:util";
var unpipeOnAbort = (unpipeSignal, unpipeContext) => unpipeSignal === void 0 ? [] : [unpipeOnSignalAbort(unpipeSignal, unpipeContext)];
var unpipeOnSignalAbort = async (unpipeSignal, { sourceStream, mergedStream, fileDescriptors, sourceOptions, startTime }) => {
  await aborted(unpipeSignal, sourceStream);
  await mergedStream.remove(sourceStream);
  const error = new Error("Pipe canceled by `unpipeSignal` option.");
  throw createNonCommandError({
    error,
    fileDescriptors,
    sourceOptions,
    startTime
  });
};

// node_modules/execa/lib/pipe/setup.js
var pipeToSubprocess = (sourceInfo, ...pipeArguments) => {
  if (isPlainObject(pipeArguments[0])) {
    return pipeToSubprocess.bind(void 0, {
      ...sourceInfo,
      boundOptions: { ...sourceInfo.boundOptions, ...pipeArguments[0] }
    });
  }
  const { destination, ...normalizedInfo } = normalizePipeArguments(sourceInfo, ...pipeArguments);
  const promise = handlePipePromise({ ...normalizedInfo, destination });
  promise.pipe = pipeToSubprocess.bind(void 0, {
    ...sourceInfo,
    source: destination,
    sourcePromise: promise,
    boundOptions: {}
  });
  return promise;
};
var handlePipePromise = async ({
  sourcePromise,
  sourceStream,
  sourceOptions,
  sourceError,
  destination,
  destinationStream,
  destinationError,
  unpipeSignal,
  fileDescriptors,
  startTime
}) => {
  const subprocessPromises = getSubprocessPromises(sourcePromise, destination);
  handlePipeArgumentsError({
    sourceStream,
    sourceError,
    destinationStream,
    destinationError,
    fileDescriptors,
    sourceOptions,
    startTime
  });
  const maxListenersController = new AbortController();
  try {
    const mergedStream = pipeSubprocessStream(sourceStream, destinationStream, maxListenersController);
    return await Promise.race([
      waitForBothSubprocesses(subprocessPromises),
      ...unpipeOnAbort(unpipeSignal, {
        sourceStream,
        mergedStream,
        sourceOptions,
        fileDescriptors,
        startTime
      })
    ]);
  } finally {
    maxListenersController.abort();
  }
};
var getSubprocessPromises = (sourcePromise, destination) => Promise.allSettled([sourcePromise, destination]);

// node_modules/execa/lib/io/contents.js
import { setImmediate } from "node:timers/promises";

// node_modules/execa/lib/io/iterate.js
import { on as on5 } from "node:events";
import { getDefaultHighWaterMark as getDefaultHighWaterMark3 } from "node:stream";
var iterateOnSubprocessStream = ({ subprocessStdout, subprocess, binary, shouldEncode, encoding, preserveNewlines }) => {
  const controller = new AbortController();
  stopReadingOnExit(subprocess, controller);
  return iterateOnStream({
    stream: subprocessStdout,
    controller,
    binary,
    shouldEncode: !subprocessStdout.readableObjectMode && shouldEncode,
    encoding,
    shouldSplit: !subprocessStdout.readableObjectMode,
    preserveNewlines
  });
};
var stopReadingOnExit = async (subprocess, controller) => {
  try {
    await subprocess;
  } catch {
  } finally {
    controller.abort();
  }
};
var iterateForResult = ({ stream, onStreamEnd, lines, encoding, stripFinalNewline: stripFinalNewline2, allMixed }) => {
  const controller = new AbortController();
  stopReadingOnStreamEnd(onStreamEnd, controller, stream);
  const objectMode = stream.readableObjectMode && !allMixed;
  return iterateOnStream({
    stream,
    controller,
    binary: encoding === "buffer",
    shouldEncode: !objectMode,
    encoding,
    shouldSplit: !objectMode && lines,
    preserveNewlines: !stripFinalNewline2
  });
};
var stopReadingOnStreamEnd = async (onStreamEnd, controller, stream) => {
  try {
    await onStreamEnd;
  } catch {
    stream.destroy();
  } finally {
    controller.abort();
  }
};
var iterateOnStream = ({ stream, controller, binary, shouldEncode, encoding, shouldSplit, preserveNewlines }) => {
  const onStdoutChunk = on5(stream, "data", {
    signal: controller.signal,
    highWaterMark: HIGH_WATER_MARK,
    // Backward compatibility with older name for this option
    // See https://github.com/nodejs/node/pull/52080#discussion_r1525227861
    // @todo Remove after removing support for Node 21
    highWatermark: HIGH_WATER_MARK
  });
  return iterateOnData({
    onStdoutChunk,
    controller,
    binary,
    shouldEncode,
    encoding,
    shouldSplit,
    preserveNewlines
  });
};
var DEFAULT_OBJECT_HIGH_WATER_MARK = getDefaultHighWaterMark3(true);
var HIGH_WATER_MARK = DEFAULT_OBJECT_HIGH_WATER_MARK;
var iterateOnData = async function* ({ onStdoutChunk, controller, binary, shouldEncode, encoding, shouldSplit, preserveNewlines }) {
  const generators = getGenerators({
    binary,
    shouldEncode,
    encoding,
    shouldSplit,
    preserveNewlines
  });
  try {
    for await (const [chunk] of onStdoutChunk) {
      yield* transformChunkSync(chunk, generators, 0);
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      throw error;
    }
  } finally {
    yield* finalChunksSync(generators);
  }
};
var getGenerators = ({ binary, shouldEncode, encoding, shouldSplit, preserveNewlines }) => [
  getEncodingTransformGenerator(binary, encoding, !shouldEncode),
  getSplitLinesGenerator(binary, preserveNewlines, !shouldSplit, {})
].filter(Boolean);

// node_modules/execa/lib/io/contents.js
var getStreamOutput = async ({ stream, onStreamEnd, fdNumber, encoding, buffer, maxBuffer, lines, allMixed, stripFinalNewline: stripFinalNewline2, verboseInfo, streamInfo }) => {
  const logPromise = logOutputAsync({
    stream,
    onStreamEnd,
    fdNumber,
    encoding,
    allMixed,
    verboseInfo,
    streamInfo
  });
  if (!buffer) {
    await Promise.all([resumeStream(stream), logPromise]);
    return;
  }
  const stripFinalNewlineValue = getStripFinalNewline(stripFinalNewline2, fdNumber);
  const iterable = iterateForResult({
    stream,
    onStreamEnd,
    lines,
    encoding,
    stripFinalNewline: stripFinalNewlineValue,
    allMixed
  });
  const [output] = await Promise.all([
    getStreamContents2({
      stream,
      iterable,
      fdNumber,
      encoding,
      maxBuffer,
      lines
    }),
    logPromise
  ]);
  return output;
};
var logOutputAsync = async ({ stream, onStreamEnd, fdNumber, encoding, allMixed, verboseInfo, streamInfo: { fileDescriptors } }) => {
  if (!shouldLogOutput({
    stdioItems: fileDescriptors[fdNumber]?.stdioItems,
    encoding,
    verboseInfo,
    fdNumber
  })) {
    return;
  }
  const linesIterable = iterateForResult({
    stream,
    onStreamEnd,
    lines: true,
    encoding,
    stripFinalNewline: true,
    allMixed
  });
  await logLines(linesIterable, stream, fdNumber, verboseInfo);
};
var resumeStream = async (stream) => {
  await setImmediate();
  if (stream.readableFlowing === null) {
    stream.resume();
  }
};
var getStreamContents2 = async ({ stream, stream: { readableObjectMode }, iterable, fdNumber, encoding, maxBuffer, lines }) => {
  try {
    if (readableObjectMode || lines) {
      return await getStreamAsArray(iterable, { maxBuffer });
    }
    if (encoding === "buffer") {
      return new Uint8Array(await getStreamAsArrayBuffer(iterable, { maxBuffer }));
    }
    return await getStreamAsString(iterable, { maxBuffer });
  } catch (error) {
    return handleBufferedData(handleMaxBuffer({
      error,
      stream,
      readableObjectMode,
      lines,
      encoding,
      fdNumber
    }));
  }
};
var getBufferedData = async (streamPromise) => {
  try {
    return await streamPromise;
  } catch (error) {
    return handleBufferedData(error);
  }
};
var handleBufferedData = ({ bufferedData }) => isArrayBuffer(bufferedData) ? new Uint8Array(bufferedData) : bufferedData;

// node_modules/execa/lib/resolve/wait-stream.js
import { finished as finished5 } from "node:stream/promises";
var waitForStream = async (stream, fdNumber, streamInfo, { isSameDirection, stopOnExit = false } = {}) => {
  const state = handleStdinDestroy(stream, streamInfo);
  const abortController = new AbortController();
  try {
    await Promise.race([
      ...stopOnExit ? [streamInfo.exitPromise] : [],
      finished5(stream, { cleanup: true, signal: abortController.signal })
    ]);
  } catch (error) {
    if (!state.stdinCleanedUp) {
      handleStreamError(error, fdNumber, streamInfo, isSameDirection);
    }
  } finally {
    abortController.abort();
  }
};
var handleStdinDestroy = (stream, { originalStreams: [originalStdin], subprocess }) => {
  const state = { stdinCleanedUp: false };
  if (stream === originalStdin) {
    spyOnStdinDestroy(stream, subprocess, state);
  }
  return state;
};
var spyOnStdinDestroy = (subprocessStdin, subprocess, state) => {
  const { _destroy } = subprocessStdin;
  subprocessStdin._destroy = (...destroyArguments) => {
    setStdinCleanedUp(subprocess, state);
    _destroy.call(subprocessStdin, ...destroyArguments);
  };
};
var setStdinCleanedUp = ({ exitCode, signalCode }, state) => {
  if (exitCode !== null || signalCode !== null) {
    state.stdinCleanedUp = true;
  }
};
var handleStreamError = (error, fdNumber, streamInfo, isSameDirection) => {
  if (!shouldIgnoreStreamError(error, fdNumber, streamInfo, isSameDirection)) {
    throw error;
  }
};
var shouldIgnoreStreamError = (error, fdNumber, streamInfo, isSameDirection = true) => {
  if (streamInfo.propagating) {
    return isStreamEpipe(error) || isStreamAbort(error);
  }
  streamInfo.propagating = true;
  return isInputFileDescriptor(streamInfo, fdNumber) === isSameDirection ? isStreamEpipe(error) : isStreamAbort(error);
};
var isInputFileDescriptor = ({ fileDescriptors }, fdNumber) => fdNumber !== "all" && fileDescriptors[fdNumber].direction === "input";
var isStreamAbort = (error) => error?.code === "ERR_STREAM_PREMATURE_CLOSE";
var isStreamEpipe = (error) => error?.code === "EPIPE";

// node_modules/execa/lib/resolve/stdio.js
var waitForStdioStreams = ({ subprocess, encoding, buffer, maxBuffer, lines, stripFinalNewline: stripFinalNewline2, verboseInfo, streamInfo }) => subprocess.stdio.map((stream, fdNumber) => waitForSubprocessStream({
  stream,
  fdNumber,
  encoding,
  buffer: buffer[fdNumber],
  maxBuffer: maxBuffer[fdNumber],
  lines: lines[fdNumber],
  allMixed: false,
  stripFinalNewline: stripFinalNewline2,
  verboseInfo,
  streamInfo
}));
var waitForSubprocessStream = async ({ stream, fdNumber, encoding, buffer, maxBuffer, lines, allMixed, stripFinalNewline: stripFinalNewline2, verboseInfo, streamInfo }) => {
  if (!stream) {
    return;
  }
  const onStreamEnd = waitForStream(stream, fdNumber, streamInfo);
  if (isInputFileDescriptor(streamInfo, fdNumber)) {
    await onStreamEnd;
    return;
  }
  const [output] = await Promise.all([
    getStreamOutput({
      stream,
      onStreamEnd,
      fdNumber,
      encoding,
      buffer,
      maxBuffer,
      lines,
      allMixed,
      stripFinalNewline: stripFinalNewline2,
      verboseInfo,
      streamInfo
    }),
    onStreamEnd
  ]);
  return output;
};

// node_modules/execa/lib/resolve/all-async.js
var makeAllStream = ({ stdout, stderr }, { all }) => all && (stdout || stderr) ? mergeStreams([stdout, stderr].filter(Boolean)) : void 0;
var waitForAllStream = ({ subprocess, encoding, buffer, maxBuffer, lines, stripFinalNewline: stripFinalNewline2, verboseInfo, streamInfo }) => waitForSubprocessStream({
  ...getAllStream(subprocess, buffer),
  fdNumber: "all",
  encoding,
  maxBuffer: maxBuffer[1] + maxBuffer[2],
  lines: lines[1] || lines[2],
  allMixed: getAllMixed(subprocess),
  stripFinalNewline: stripFinalNewline2,
  verboseInfo,
  streamInfo
});
var getAllStream = ({ stdout, stderr, all }, [, bufferStdout, bufferStderr]) => {
  const buffer = bufferStdout || bufferStderr;
  if (!buffer) {
    return { stream: all, buffer };
  }
  if (!bufferStdout) {
    return { stream: stderr, buffer };
  }
  if (!bufferStderr) {
    return { stream: stdout, buffer };
  }
  return { stream: all, buffer };
};
var getAllMixed = ({ all, stdout, stderr }) => all && stdout && stderr && stdout.readableObjectMode !== stderr.readableObjectMode;

// node_modules/execa/lib/resolve/wait-subprocess.js
import { once as once8 } from "node:events";

// node_modules/execa/lib/verbose/ipc.js
var shouldLogIpc = (verboseInfo) => isFullVerbose(verboseInfo, "ipc");
var logIpcOutput = (message, verboseInfo) => {
  const verboseMessage = serializeVerboseMessage(message);
  verboseLog({
    type: "ipc",
    verboseMessage,
    fdNumber: "ipc",
    verboseInfo
  });
};

// node_modules/execa/lib/ipc/buffer-messages.js
var waitForIpcOutput = async ({
  subprocess,
  buffer: bufferArray,
  maxBuffer: maxBufferArray,
  ipc,
  ipcOutput,
  verboseInfo
}) => {
  if (!ipc) {
    return ipcOutput;
  }
  const isVerbose2 = shouldLogIpc(verboseInfo);
  const buffer = getFdSpecificValue(bufferArray, "ipc");
  const maxBuffer = getFdSpecificValue(maxBufferArray, "ipc");
  for await (const message of loopOnMessages({
    anyProcess: subprocess,
    channel: subprocess.channel,
    isSubprocess: false,
    ipc,
    shouldAwait: false,
    reference: true
  })) {
    if (buffer) {
      checkIpcMaxBuffer(subprocess, ipcOutput, maxBuffer);
      ipcOutput.push(message);
    }
    if (isVerbose2) {
      logIpcOutput(message, verboseInfo);
    }
  }
  return ipcOutput;
};
var getBufferedIpcOutput = async (ipcOutputPromise, ipcOutput) => {
  await Promise.allSettled([ipcOutputPromise]);
  return ipcOutput;
};

// node_modules/execa/lib/resolve/wait-subprocess.js
var waitForSubprocessResult = async ({
  subprocess,
  options: {
    encoding,
    buffer,
    maxBuffer,
    lines,
    timeoutDuration: timeout,
    cancelSignal,
    gracefulCancel,
    forceKillAfterDelay,
    stripFinalNewline: stripFinalNewline2,
    ipc,
    ipcInput
  },
  context,
  verboseInfo,
  fileDescriptors,
  originalStreams,
  onInternalError,
  controller
}) => {
  const exitPromise = waitForExit(subprocess, context);
  const streamInfo = {
    originalStreams,
    fileDescriptors,
    subprocess,
    exitPromise,
    propagating: false
  };
  const stdioPromises = waitForStdioStreams({
    subprocess,
    encoding,
    buffer,
    maxBuffer,
    lines,
    stripFinalNewline: stripFinalNewline2,
    verboseInfo,
    streamInfo
  });
  const allPromise = waitForAllStream({
    subprocess,
    encoding,
    buffer,
    maxBuffer,
    lines,
    stripFinalNewline: stripFinalNewline2,
    verboseInfo,
    streamInfo
  });
  const ipcOutput = [];
  const ipcOutputPromise = waitForIpcOutput({
    subprocess,
    buffer,
    maxBuffer,
    ipc,
    ipcOutput,
    verboseInfo
  });
  const originalPromises = waitForOriginalStreams(originalStreams, subprocess, streamInfo);
  const customStreamsEndPromises = waitForCustomStreamsEnd(fileDescriptors, streamInfo);
  try {
    return await Promise.race([
      Promise.all([
        {},
        waitForSuccessfulExit(exitPromise),
        Promise.all(stdioPromises),
        allPromise,
        ipcOutputPromise,
        sendIpcInput(subprocess, ipcInput),
        ...originalPromises,
        ...customStreamsEndPromises
      ]),
      onInternalError,
      throwOnSubprocessError(subprocess, controller),
      ...throwOnTimeout(subprocess, timeout, context, controller),
      ...throwOnCancel({
        subprocess,
        cancelSignal,
        gracefulCancel,
        context,
        controller
      }),
      ...throwOnGracefulCancel({
        subprocess,
        cancelSignal,
        gracefulCancel,
        forceKillAfterDelay,
        context,
        controller
      })
    ]);
  } catch (error) {
    context.terminationReason ??= "other";
    return Promise.all([
      { error },
      exitPromise,
      Promise.all(stdioPromises.map((stdioPromise) => getBufferedData(stdioPromise))),
      getBufferedData(allPromise),
      getBufferedIpcOutput(ipcOutputPromise, ipcOutput),
      Promise.allSettled(originalPromises),
      Promise.allSettled(customStreamsEndPromises)
    ]);
  }
};
var waitForOriginalStreams = (originalStreams, subprocess, streamInfo) => originalStreams.map((stream, fdNumber) => stream === subprocess.stdio[fdNumber] ? void 0 : waitForStream(stream, fdNumber, streamInfo));
var waitForCustomStreamsEnd = (fileDescriptors, streamInfo) => fileDescriptors.flatMap(({ stdioItems }, fdNumber) => stdioItems.filter(({ value, stream = value }) => isStream(stream, { checkOpen: false }) && !isStandardStream(stream)).map(({ type, value, stream = value }) => waitForStream(stream, fdNumber, streamInfo, {
  isSameDirection: TRANSFORM_TYPES.has(type),
  stopOnExit: type === "native"
})));
var throwOnSubprocessError = async (subprocess, { signal }) => {
  const [error] = await once8(subprocess, "error", { signal });
  throw error;
};

// node_modules/execa/lib/convert/concurrent.js
var initializeConcurrentStreams = () => ({
  readableDestroy: /* @__PURE__ */ new WeakMap(),
  writableFinal: /* @__PURE__ */ new WeakMap(),
  writableDestroy: /* @__PURE__ */ new WeakMap()
});
var addConcurrentStream = (concurrentStreams, stream, waitName) => {
  const weakMap = concurrentStreams[waitName];
  if (!weakMap.has(stream)) {
    weakMap.set(stream, []);
  }
  const promises = weakMap.get(stream);
  const promise = createDeferred();
  promises.push(promise);
  const resolve = promise.resolve.bind(promise);
  return { resolve, promises };
};
var waitForConcurrentStreams = async ({ resolve, promises }, subprocess) => {
  resolve();
  const [isSubprocessExit] = await Promise.race([
    Promise.allSettled([true, subprocess]),
    Promise.all([false, ...promises])
  ]);
  return !isSubprocessExit;
};

// node_modules/execa/lib/convert/readable.js
import { Readable as Readable3 } from "node:stream";
import { callbackify as callbackify2 } from "node:util";

// node_modules/execa/lib/convert/shared.js
import { finished as finished6 } from "node:stream/promises";
var safeWaitForSubprocessStdin = async (subprocessStdin) => {
  if (subprocessStdin === void 0) {
    return;
  }
  try {
    await waitForSubprocessStdin(subprocessStdin);
  } catch {
  }
};
var safeWaitForSubprocessStdout = async (subprocessStdout) => {
  if (subprocessStdout === void 0) {
    return;
  }
  try {
    await waitForSubprocessStdout(subprocessStdout);
  } catch {
  }
};
var waitForSubprocessStdin = async (subprocessStdin) => {
  await finished6(subprocessStdin, { cleanup: true, readable: false, writable: true });
};
var waitForSubprocessStdout = async (subprocessStdout) => {
  await finished6(subprocessStdout, { cleanup: true, readable: true, writable: false });
};
var waitForSubprocess = async (subprocess, error) => {
  await subprocess;
  if (error) {
    throw error;
  }
};
var destroyOtherStream = (stream, isOpen, error) => {
  if (error && !isStreamAbort(error)) {
    stream.destroy(error);
  } else if (isOpen) {
    stream.destroy();
  }
};

// node_modules/execa/lib/convert/readable.js
var createReadable = ({ subprocess, concurrentStreams, encoding }, { from, binary: binaryOption = true, preserveNewlines = true } = {}) => {
  const binary = binaryOption || BINARY_ENCODINGS.has(encoding);
  const { subprocessStdout, waitReadableDestroy } = getSubprocessStdout(subprocess, from, concurrentStreams);
  const { readableEncoding, readableObjectMode, readableHighWaterMark } = getReadableOptions(subprocessStdout, binary);
  const { read, onStdoutDataDone } = getReadableMethods({
    subprocessStdout,
    subprocess,
    binary,
    encoding,
    preserveNewlines
  });
  const readable2 = new Readable3({
    read,
    destroy: callbackify2(onReadableDestroy.bind(void 0, { subprocessStdout, subprocess, waitReadableDestroy })),
    highWaterMark: readableHighWaterMark,
    objectMode: readableObjectMode,
    encoding: readableEncoding
  });
  onStdoutFinished({
    subprocessStdout,
    onStdoutDataDone,
    readable: readable2,
    subprocess
  });
  return readable2;
};
var getSubprocessStdout = (subprocess, from, concurrentStreams) => {
  const subprocessStdout = getFromStream(subprocess, from);
  const waitReadableDestroy = addConcurrentStream(concurrentStreams, subprocessStdout, "readableDestroy");
  return { subprocessStdout, waitReadableDestroy };
};
var getReadableOptions = ({ readableEncoding, readableObjectMode, readableHighWaterMark }, binary) => binary ? { readableEncoding, readableObjectMode, readableHighWaterMark } : { readableEncoding, readableObjectMode: true, readableHighWaterMark: DEFAULT_OBJECT_HIGH_WATER_MARK };
var getReadableMethods = ({ subprocessStdout, subprocess, binary, encoding, preserveNewlines }) => {
  const onStdoutDataDone = createDeferred();
  const onStdoutData = iterateOnSubprocessStream({
    subprocessStdout,
    subprocess,
    binary,
    shouldEncode: !binary,
    encoding,
    preserveNewlines
  });
  return {
    read() {
      onRead(this, onStdoutData, onStdoutDataDone);
    },
    onStdoutDataDone
  };
};
var onRead = async (readable2, onStdoutData, onStdoutDataDone) => {
  try {
    const { value, done } = await onStdoutData.next();
    if (done) {
      onStdoutDataDone.resolve();
    } else {
      readable2.push(value);
    }
  } catch {
  }
};
var onStdoutFinished = async ({ subprocessStdout, onStdoutDataDone, readable: readable2, subprocess, subprocessStdin }) => {
  try {
    await waitForSubprocessStdout(subprocessStdout);
    await subprocess;
    await safeWaitForSubprocessStdin(subprocessStdin);
    await onStdoutDataDone;
    if (readable2.readable) {
      readable2.push(null);
    }
  } catch (error) {
    await safeWaitForSubprocessStdin(subprocessStdin);
    destroyOtherReadable(readable2, error);
  }
};
var onReadableDestroy = async ({ subprocessStdout, subprocess, waitReadableDestroy }, error) => {
  if (await waitForConcurrentStreams(waitReadableDestroy, subprocess)) {
    destroyOtherReadable(subprocessStdout, error);
    await waitForSubprocess(subprocess, error);
  }
};
var destroyOtherReadable = (stream, error) => {
  destroyOtherStream(stream, stream.readable, error);
};

// node_modules/execa/lib/convert/writable.js
import { Writable as Writable3 } from "node:stream";
import { callbackify as callbackify3 } from "node:util";
var createWritable = ({ subprocess, concurrentStreams }, { to } = {}) => {
  const { subprocessStdin, waitWritableFinal, waitWritableDestroy } = getSubprocessStdin(subprocess, to, concurrentStreams);
  const writable2 = new Writable3({
    ...getWritableMethods(subprocessStdin, subprocess, waitWritableFinal),
    destroy: callbackify3(onWritableDestroy.bind(void 0, {
      subprocessStdin,
      subprocess,
      waitWritableFinal,
      waitWritableDestroy
    })),
    highWaterMark: subprocessStdin.writableHighWaterMark,
    objectMode: subprocessStdin.writableObjectMode
  });
  onStdinFinished(subprocessStdin, writable2);
  return writable2;
};
var getSubprocessStdin = (subprocess, to, concurrentStreams) => {
  const subprocessStdin = getToStream(subprocess, to);
  const waitWritableFinal = addConcurrentStream(concurrentStreams, subprocessStdin, "writableFinal");
  const waitWritableDestroy = addConcurrentStream(concurrentStreams, subprocessStdin, "writableDestroy");
  return { subprocessStdin, waitWritableFinal, waitWritableDestroy };
};
var getWritableMethods = (subprocessStdin, subprocess, waitWritableFinal) => ({
  write: onWrite.bind(void 0, subprocessStdin),
  final: callbackify3(onWritableFinal.bind(void 0, subprocessStdin, subprocess, waitWritableFinal))
});
var onWrite = (subprocessStdin, chunk, encoding, done) => {
  if (subprocessStdin.write(chunk, encoding)) {
    done();
  } else {
    subprocessStdin.once("drain", done);
  }
};
var onWritableFinal = async (subprocessStdin, subprocess, waitWritableFinal) => {
  if (await waitForConcurrentStreams(waitWritableFinal, subprocess)) {
    if (subprocessStdin.writable) {
      subprocessStdin.end();
    }
    await subprocess;
  }
};
var onStdinFinished = async (subprocessStdin, writable2, subprocessStdout) => {
  try {
    await waitForSubprocessStdin(subprocessStdin);
    if (writable2.writable) {
      writable2.end();
    }
  } catch (error) {
    await safeWaitForSubprocessStdout(subprocessStdout);
    destroyOtherWritable(writable2, error);
  }
};
var onWritableDestroy = async ({ subprocessStdin, subprocess, waitWritableFinal, waitWritableDestroy }, error) => {
  await waitForConcurrentStreams(waitWritableFinal, subprocess);
  if (await waitForConcurrentStreams(waitWritableDestroy, subprocess)) {
    destroyOtherWritable(subprocessStdin, error);
    await waitForSubprocess(subprocess, error);
  }
};
var destroyOtherWritable = (stream, error) => {
  destroyOtherStream(stream, stream.writable, error);
};

// node_modules/execa/lib/convert/duplex.js
import { Duplex as Duplex3 } from "node:stream";
import { callbackify as callbackify4 } from "node:util";
var createDuplex = ({ subprocess, concurrentStreams, encoding }, { from, to, binary: binaryOption = true, preserveNewlines = true } = {}) => {
  const binary = binaryOption || BINARY_ENCODINGS.has(encoding);
  const { subprocessStdout, waitReadableDestroy } = getSubprocessStdout(subprocess, from, concurrentStreams);
  const { subprocessStdin, waitWritableFinal, waitWritableDestroy } = getSubprocessStdin(subprocess, to, concurrentStreams);
  const { readableEncoding, readableObjectMode, readableHighWaterMark } = getReadableOptions(subprocessStdout, binary);
  const { read, onStdoutDataDone } = getReadableMethods({
    subprocessStdout,
    subprocess,
    binary,
    encoding,
    preserveNewlines
  });
  const duplex2 = new Duplex3({
    read,
    ...getWritableMethods(subprocessStdin, subprocess, waitWritableFinal),
    destroy: callbackify4(onDuplexDestroy.bind(void 0, {
      subprocessStdout,
      subprocessStdin,
      subprocess,
      waitReadableDestroy,
      waitWritableFinal,
      waitWritableDestroy
    })),
    readableHighWaterMark,
    writableHighWaterMark: subprocessStdin.writableHighWaterMark,
    readableObjectMode,
    writableObjectMode: subprocessStdin.writableObjectMode,
    encoding: readableEncoding
  });
  onStdoutFinished({
    subprocessStdout,
    onStdoutDataDone,
    readable: duplex2,
    subprocess,
    subprocessStdin
  });
  onStdinFinished(subprocessStdin, duplex2, subprocessStdout);
  return duplex2;
};
var onDuplexDestroy = async ({ subprocessStdout, subprocessStdin, subprocess, waitReadableDestroy, waitWritableFinal, waitWritableDestroy }, error) => {
  await Promise.all([
    onReadableDestroy({ subprocessStdout, subprocess, waitReadableDestroy }, error),
    onWritableDestroy({
      subprocessStdin,
      subprocess,
      waitWritableFinal,
      waitWritableDestroy
    }, error)
  ]);
};

// node_modules/execa/lib/convert/iterable.js
var createIterable = (subprocess, encoding, {
  from,
  binary: binaryOption = false,
  preserveNewlines = false
} = {}) => {
  const binary = binaryOption || BINARY_ENCODINGS.has(encoding);
  const subprocessStdout = getFromStream(subprocess, from);
  const onStdoutData = iterateOnSubprocessStream({
    subprocessStdout,
    subprocess,
    binary,
    shouldEncode: true,
    encoding,
    preserveNewlines
  });
  return iterateOnStdoutData(onStdoutData, subprocessStdout, subprocess);
};
var iterateOnStdoutData = async function* (onStdoutData, subprocessStdout, subprocess) {
  try {
    yield* onStdoutData;
  } finally {
    if (subprocessStdout.readable) {
      subprocessStdout.destroy();
    }
    await subprocess;
  }
};

// node_modules/execa/lib/convert/add.js
var addConvertedStreams = (subprocess, { encoding }) => {
  const concurrentStreams = initializeConcurrentStreams();
  subprocess.readable = createReadable.bind(void 0, { subprocess, concurrentStreams, encoding });
  subprocess.writable = createWritable.bind(void 0, { subprocess, concurrentStreams });
  subprocess.duplex = createDuplex.bind(void 0, { subprocess, concurrentStreams, encoding });
  subprocess.iterable = createIterable.bind(void 0, subprocess, encoding);
  subprocess[Symbol.asyncIterator] = createIterable.bind(void 0, subprocess, encoding, {});
};

// node_modules/execa/lib/methods/promise.js
var mergePromise = (subprocess, promise) => {
  for (const [property, descriptor] of descriptors) {
    const value = descriptor.value.bind(promise);
    Reflect.defineProperty(subprocess, property, { ...descriptor, value });
  }
};
var nativePromisePrototype = (async () => {
})().constructor.prototype;
var descriptors = ["then", "catch", "finally"].map((property) => [
  property,
  Reflect.getOwnPropertyDescriptor(nativePromisePrototype, property)
]);

// node_modules/execa/lib/methods/main-async.js
var execaCoreAsync = (rawFile, rawArguments, rawOptions, createNested) => {
  const { file, commandArguments, command, escapedCommand, startTime, verboseInfo, options, fileDescriptors } = handleAsyncArguments(rawFile, rawArguments, rawOptions);
  const { subprocess, promise } = spawnSubprocessAsync({
    file,
    commandArguments,
    options,
    startTime,
    verboseInfo,
    command,
    escapedCommand,
    fileDescriptors
  });
  subprocess.pipe = pipeToSubprocess.bind(void 0, {
    source: subprocess,
    sourcePromise: promise,
    boundOptions: {},
    createNested
  });
  mergePromise(subprocess, promise);
  SUBPROCESS_OPTIONS.set(subprocess, { options, fileDescriptors });
  return subprocess;
};
var handleAsyncArguments = (rawFile, rawArguments, rawOptions) => {
  const { command, escapedCommand, startTime, verboseInfo } = handleCommand(rawFile, rawArguments, rawOptions);
  const { file, commandArguments, options: normalizedOptions } = normalizeOptions(rawFile, rawArguments, rawOptions);
  const options = handleAsyncOptions(normalizedOptions);
  const fileDescriptors = handleStdioAsync(options, verboseInfo);
  return {
    file,
    commandArguments,
    command,
    escapedCommand,
    startTime,
    verboseInfo,
    options,
    fileDescriptors
  };
};
var handleAsyncOptions = ({ timeout, signal, ...options }) => {
  if (signal !== void 0) {
    throw new TypeError('The "signal" option has been renamed to "cancelSignal" instead.');
  }
  return { ...options, timeoutDuration: timeout };
};
var spawnSubprocessAsync = ({ file, commandArguments, options, startTime, verboseInfo, command, escapedCommand, fileDescriptors }) => {
  let subprocess;
  try {
    subprocess = spawn(...concatenateShell(file, commandArguments, options));
  } catch (error) {
    return handleEarlyError({
      error,
      command,
      escapedCommand,
      fileDescriptors,
      options,
      startTime,
      verboseInfo
    });
  }
  const controller = new AbortController();
  setMaxListeners(Number.POSITIVE_INFINITY, controller.signal);
  const originalStreams = [...subprocess.stdio];
  pipeOutputAsync(subprocess, fileDescriptors, controller);
  cleanupOnExit(subprocess, options, controller);
  const context = {};
  const onInternalError = createDeferred();
  subprocess.kill = subprocessKill.bind(void 0, {
    kill: subprocess.kill.bind(subprocess),
    options,
    onInternalError,
    context,
    controller
  });
  subprocess.all = makeAllStream(subprocess, options);
  addConvertedStreams(subprocess, options);
  addIpcMethods(subprocess, options);
  const promise = handlePromise({
    subprocess,
    options,
    startTime,
    verboseInfo,
    fileDescriptors,
    originalStreams,
    command,
    escapedCommand,
    context,
    onInternalError,
    controller
  });
  return { subprocess, promise };
};
var handlePromise = async ({ subprocess, options, startTime, verboseInfo, fileDescriptors, originalStreams, command, escapedCommand, context, onInternalError, controller }) => {
  const [
    errorInfo,
    [exitCode, signal],
    stdioResults,
    allResult,
    ipcOutput
  ] = await waitForSubprocessResult({
    subprocess,
    options,
    context,
    verboseInfo,
    fileDescriptors,
    originalStreams,
    onInternalError,
    controller
  });
  controller.abort();
  onInternalError.resolve();
  const stdio = stdioResults.map((stdioResult, fdNumber) => stripNewline(stdioResult, options, fdNumber));
  const all = stripNewline(allResult, options, "all");
  const result = getAsyncResult({
    errorInfo,
    exitCode,
    signal,
    stdio,
    all,
    ipcOutput,
    context,
    options,
    command,
    escapedCommand,
    startTime
  });
  return handleResult(result, verboseInfo, options);
};
var getAsyncResult = ({ errorInfo, exitCode, signal, stdio, all, ipcOutput, context, options, command, escapedCommand, startTime }) => "error" in errorInfo ? makeError({
  error: errorInfo.error,
  command,
  escapedCommand,
  timedOut: context.terminationReason === "timeout",
  isCanceled: context.terminationReason === "cancel" || context.terminationReason === "gracefulCancel",
  isGracefullyCanceled: context.terminationReason === "gracefulCancel",
  isMaxBuffer: errorInfo.error instanceof MaxBufferError,
  isForcefullyTerminated: context.isForcefullyTerminated,
  exitCode,
  signal,
  stdio,
  all,
  ipcOutput,
  options,
  startTime,
  isSync: false
}) : makeSuccessResult({
  command,
  escapedCommand,
  stdio,
  all,
  ipcOutput,
  options,
  startTime
});

// node_modules/execa/lib/methods/bind.js
var mergeOptions = (boundOptions, options) => {
  const newOptions = Object.fromEntries(
    Object.entries(options).map(([optionName, optionValue]) => [
      optionName,
      mergeOption(optionName, boundOptions[optionName], optionValue)
    ])
  );
  return { ...boundOptions, ...newOptions };
};
var mergeOption = (optionName, boundOptionValue, optionValue) => {
  if (DEEP_OPTIONS.has(optionName) && isPlainObject(boundOptionValue) && isPlainObject(optionValue)) {
    return { ...boundOptionValue, ...optionValue };
  }
  return optionValue;
};
var DEEP_OPTIONS = /* @__PURE__ */ new Set(["env", ...FD_SPECIFIC_OPTIONS]);

// node_modules/execa/lib/methods/create.js
var createExeca = (mapArguments, boundOptions, deepOptions, setBoundExeca) => {
  const createNested = (mapArguments2, boundOptions2, setBoundExeca2) => createExeca(mapArguments2, boundOptions2, deepOptions, setBoundExeca2);
  const boundExeca = (...execaArguments) => callBoundExeca({
    mapArguments,
    deepOptions,
    boundOptions,
    setBoundExeca,
    createNested
  }, ...execaArguments);
  if (setBoundExeca !== void 0) {
    setBoundExeca(boundExeca, createNested, boundOptions);
  }
  return boundExeca;
};
var callBoundExeca = ({ mapArguments, deepOptions = {}, boundOptions = {}, setBoundExeca, createNested }, firstArgument, ...nextArguments) => {
  if (isPlainObject(firstArgument)) {
    return createNested(mapArguments, mergeOptions(boundOptions, firstArgument), setBoundExeca);
  }
  const { file, commandArguments, options, isSync } = parseArguments({
    mapArguments,
    firstArgument,
    nextArguments,
    deepOptions,
    boundOptions
  });
  return isSync ? execaCoreSync(file, commandArguments, options) : execaCoreAsync(file, commandArguments, options, createNested);
};
var parseArguments = ({ mapArguments, firstArgument, nextArguments, deepOptions, boundOptions }) => {
  const callArguments = isTemplateString(firstArgument) ? parseTemplates(firstArgument, nextArguments) : [firstArgument, ...nextArguments];
  const [initialFile, initialArguments, initialOptions] = normalizeParameters(...callArguments);
  const mergedOptions = mergeOptions(mergeOptions(deepOptions, boundOptions), initialOptions);
  const {
    file = initialFile,
    commandArguments = initialArguments,
    options = mergedOptions,
    isSync = false
  } = mapArguments({ file: initialFile, commandArguments: initialArguments, options: mergedOptions });
  return {
    file,
    commandArguments,
    options,
    isSync
  };
};

// node_modules/execa/lib/methods/command.js
var mapCommandAsync = ({ file, commandArguments }) => parseCommand(file, commandArguments);
var mapCommandSync = ({ file, commandArguments }) => ({ ...parseCommand(file, commandArguments), isSync: true });
var parseCommand = (command, unusedArguments) => {
  if (unusedArguments.length > 0) {
    throw new TypeError(`The command and its arguments must be passed as a single string: ${command} ${unusedArguments}.`);
  }
  const [file, ...commandArguments] = parseCommandString(command);
  return { file, commandArguments };
};
var parseCommandString = (command) => {
  if (typeof command !== "string") {
    throw new TypeError(`The command must be a string: ${String(command)}.`);
  }
  const trimmedCommand = command.trim();
  if (trimmedCommand === "") {
    return [];
  }
  const tokens = [];
  for (const token of trimmedCommand.split(SPACES_REGEXP)) {
    const previousToken = tokens.at(-1);
    if (previousToken && previousToken.endsWith("\\")) {
      tokens[tokens.length - 1] = `${previousToken.slice(0, -1)} ${token}`;
    } else {
      tokens.push(token);
    }
  }
  return tokens;
};
var SPACES_REGEXP = / +/g;

// node_modules/execa/lib/methods/script.js
var setScriptSync = (boundExeca, createNested, boundOptions) => {
  boundExeca.sync = createNested(mapScriptSync, boundOptions);
  boundExeca.s = boundExeca.sync;
};
var mapScriptAsync = ({ options }) => getScriptOptions(options);
var mapScriptSync = ({ options }) => ({ ...getScriptOptions(options), isSync: true });
var getScriptOptions = (options) => ({ options: { ...getScriptStdinOption(options), ...options } });
var getScriptStdinOption = ({ input: input2, inputFile, stdio }) => input2 === void 0 && inputFile === void 0 && stdio === void 0 ? { stdin: "inherit" } : {};
var deepScriptOptions = { preferLocal: true };

// node_modules/execa/index.js
var execa = createExeca(() => ({}));
var execaSync = createExeca(() => ({ isSync: true }));
var execaCommand = createExeca(mapCommandAsync);
var execaCommandSync = createExeca(mapCommandSync);
var execaNode = createExeca(mapNode);
var $ = createExeca(mapScriptAsync, {}, deepScriptOptions, setScriptSync);
var {
  sendMessage: sendMessage2,
  getOneMessage: getOneMessage2,
  getEachMessage: getEachMessage2,
  getCancelSignal: getCancelSignal2
} = getIpcExport();

// src/safe-exec.js
import os from "node:os";
var ALLOWED = /* @__PURE__ */ new Map([
  [
    "git",
    /* @__PURE__ */ new Set([
      "clone",
      "config",
      "checkout",
      "add",
      "diff",
      "commit",
      "push",
      "rm",
      "reflog",
      "rev-parse",
      "status",
      "ls-files"
    ])
  ],
  ["gh", /* @__PURE__ */ new Set(["api", "pr"])]
]);
var GIT_VALUE_OPTS = /* @__PURE__ */ new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path"
]);
var HOOK_GUARD = ["-c", `core.hooksPath=${os.devNull}`];
var CommandNotAllowedError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CommandNotAllowedError";
  }
};
function firstSubcommand(args, valueOpts) {
  for (let i2 = 0; i2 < args.length; i2++) {
    const a2 = args[i2];
    if (typeof a2 !== "string") continue;
    if (!a2.startsWith("-")) return a2;
    if (a2.includes("=")) continue;
    if (valueOpts && valueOpts.has(a2)) i2++;
  }
  return void 0;
}
function assertAllowed(cmd, args = []) {
  if (typeof cmd !== "string" || cmd.length === 0) {
    throw new CommandNotAllowedError("command must be a non-empty string");
  }
  if (cmd.includes("/") || cmd.includes("\\")) {
    throw new CommandNotAllowedError(
      `refusing path-bearing command "${cmd}" \u2014 only the bare names "git"/"gh" are allowed`
    );
  }
  if (!ALLOWED.has(cmd)) {
    throw new CommandNotAllowedError(
      `command "${cmd}" is not on the allowlist (allowed: git, gh)`
    );
  }
  const sub = firstSubcommand(args, cmd === "git" ? GIT_VALUE_OPTS : null);
  if (!sub || !ALLOWED.get(cmd).has(sub)) {
    throw new CommandNotAllowedError(
      `subcommand "${sub ?? "(none)"}" is not allowed for "${cmd}"`
    );
  }
  return { cmd, sub };
}
function safeExec(cmd, args = [], opts = {}) {
  assertAllowed(cmd, args);
  return execa(cmd, args, { reject: false, shell: false, ...opts });
}
function gitEnv(extra) {
  return {
    ...extra,
    GIT_CONFIG_NOSYSTEM: "1",
    // ignore /etc/gitconfig
    GIT_CONFIG_GLOBAL: os.devNull,
    // ignore ~/.gitconfig (no hijacked hooksPath)
    GIT_TERMINAL_PROMPT: "0"
    // never block on an interactive credential prompt
  };
}
function buildGitArgs(args = []) {
  const finalArgs = [...HOOK_GUARD, ...args];
  const sub = firstSubcommand(finalArgs, GIT_VALUE_OPTS);
  if ((sub === "commit" || sub === "push") && !finalArgs.includes("--no-verify")) {
    finalArgs.push("--no-verify");
  }
  return finalArgs;
}
function safeGit(args = [], opts = {}) {
  return safeExec("git", buildGitArgs(args), { ...opts, env: gitEnv(opts.env) });
}
function safeGh(args = [], opts = {}, token = process.env.GH_TOKEN) {
  const env = { ...opts.env };
  if (token) {
    env.GH_TOKEN = token;
    env.GITHUB_TOKEN = token;
  }
  return safeExec("gh", args, { ...opts, env });
}

// src/remediator.js
async function remediate(repoDir, findings, opts = {}) {
  const { dryRun = false, git = safeGit } = opts;
  const result = {
    changed: false,
    dryRun,
    applied: [],
    skipped: [],
    filesModified: [],
    filesDeleted: [],
    notes: []
  };
  for (const f of findings.findings) {
    switch (f.action) {
      case "strip-js-payload":
        await stripJsPayload(repoDir, f, result, dryRun);
        break;
      case "remove-dir":
        await deleteDir(f, result, dryRun);
        break;
      case "delete-font":
      case "remove-artifact":
        await deleteFile(f, result, dryRun);
        break;
      case "remove-font-set":
        await deleteFileSet(f, result, dryRun);
        break;
      case "fix-gitignore":
        break;
      case "manual-review":
        result.skipped.push({ finding: f, reason: "manual review required \u2014 not auto-removed" });
        break;
      default:
        result.skipped.push({ finding: f, reason: `unknown action "${f.action}"` });
    }
  }
  await hardenGitignore(repoDir, result, dryRun);
  await untrackEnvFiles(repoDir, result, dryRun, git);
  result.changed = !dryRun && (result.filesModified.length > 0 || result.filesDeleted.length > 0);
  return result;
}
function recordModified(result, file) {
  if (!result.filesModified.includes(file)) result.filesModified.push(file);
}
function recordDeleted(result, file) {
  if (!result.filesDeleted.includes(file)) result.filesDeleted.push(file);
}
function rangesAgree(a2, b) {
  if (!Array.isArray(a2) || !Array.isArray(b) || a2.length !== b.length) return false;
  const key = (r) => `${r.start}:${r.end}:${r.role ?? ""}`;
  const left = a2.map(key).sort();
  const right = b.map(key).sort();
  return left.every((k, i2) => k === right[i2]);
}
async function stripJsPayload(repoDir, f, result, dryRun) {
  const absPath = f.edit?.absPath ?? path9.join(repoDir, f.file);
  const skip = (reason) => result.skipped.push({ finding: f, reason });
  let text;
  try {
    text = await fs4.readFile(absPath, "utf8");
  } catch {
    return skip("file unreadable");
  }
  const assessment = assessJsText(text, f.file);
  const v = assessment.verdict;
  if (!assessment.lex.ok) {
    return skip(`could not tokenize the file safely (${assessment.lex.reason}) \u2014 refusing to strip`);
  }
  if (v.verdict !== "confirmed" && v.verdict !== "shim-only") {
    return skip(`re-verification says "${v.verdict}" \u2014 the file changed since the scan`);
  }
  if (assessment.ranges.length === 0) {
    return skip("nothing to strip after re-verification");
  }
  if (assessment.ranges.some((r) => r.role !== "payload" && r.role !== "shim")) {
    return skip("unrecognised edit role \u2014 refusing to strip");
  }
  if (f.edit?.ranges?.length && !rangesAgree(f.edit.ranges, assessment.ranges)) {
    return skip("payload location moved since the scan \u2014 re-scan and retry");
  }
  const kept = assessment.keptText;
  if (kept == null) {
    return skip(`splice post-condition failed (${v.blockers.join(", ") || "unknown"})`);
  }
  if (kept.trim().length === 0) return skip("stripping would empty the file");
  if (kept === text) return skip("no change");
  if (!dryRun) await fs4.writeFile(absPath, kept, "utf8");
  result.applied.push(f);
  recordModified(result, f.file);
}
async function deleteDir(f, result, dryRun) {
  const absPath = f.edit?.absPath;
  if (!absPath || !existsSync2(absPath)) {
    result.skipped.push({ finding: f, reason: "already gone" });
    return;
  }
  if (!dryRun) await fs4.rm(absPath, { recursive: true, force: true });
  result.applied.push(f);
  recordDeleted(result, f.file);
}
async function deleteFile(f, result, dryRun) {
  const absPath = f.edit?.absPath;
  if (!absPath || !existsSync2(absPath)) {
    result.skipped.push({ finding: f, reason: "already gone" });
    return;
  }
  if (!dryRun) await fs4.rm(absPath, { force: true });
  result.applied.push(f);
  recordDeleted(result, f.file);
}
async function deleteFileSet(f, result, dryRun) {
  const removals = Array.isArray(f.edit?.removals) ? f.edit.removals : [];
  let any = false;
  for (const { abs, rel } of removals) {
    if (!abs || !existsSync2(abs)) continue;
    if (!dryRun) await fs4.rm(abs, { force: true });
    recordDeleted(result, rel);
    any = true;
  }
  if (any) result.applied.push(f);
  else result.skipped.push({ finding: f, reason: "already gone" });
}
async function hardenGitignore(repoDir, result, dryRun) {
  const file = path9.join(repoDir, ".gitignore");
  let content = "";
  try {
    content = await fs4.readFile(file, "utf8");
  } catch {
    content = "";
  }
  let lines = content.length ? content.split(/\r?\n/) : [];
  const original = lines.join("\n");
  lines = lines.filter((l) => !GITIGNORE_INJECTED.includes(l.trim()));
  const present = new Set(lines.map((l) => l.trim()));
  for (const pat of ENV_PATTERNS) {
    if (!present.has(pat)) {
      lines.push(pat);
      present.add(pat);
    }
  }
  const next = lines.join("\n");
  if (next === original) return;
  if (!dryRun) {
    await fs4.writeFile(file, next.endsWith("\n") ? next : next + "\n", "utf8");
  }
  recordModified(result, ".gitignore");
  result.notes.push(
    `${dryRun ? "would remove" : "removed"} malware-injected entries from .gitignore and ensure${dryRun ? "" : "d"} .env patterns are ignored`
  );
}
async function untrackEnvFiles(repoDir, result, dryRun, git) {
  if (!existsSync2(path9.join(repoDir, ".git"))) return;
  const literals = ENV_PATTERNS.filter((p) => !p.includes("*"));
  for (const pat of literals) {
    if (!existsSync2(path9.join(repoDir, pat))) continue;
    const tracked = await git(["-C", repoDir, "ls-files", "--error-unmatch", pat]);
    if (tracked.exitCode !== 0) continue;
    if (dryRun) {
      result.notes.push(`would untrack ${pat} from the git index`);
      continue;
    }
    const rm = await git(["-C", repoDir, "rm", "--cached", "--force", pat]);
    if (rm.exitCode === 0) {
      result.notes.push(`untracked ${pat} from the git index`);
      recordModified(result, pat);
    }
  }
}

// src/report.js
var PR_TITLE = "security: remove PolinRider malware artifacts";
function findingLines(findings) {
  return findings.findings.map((f) => {
    const tag = f.contentConfirmed ? "[confirmed]" : "[review]";
    return `${tag} ${f.file}: ${f.description}`;
  });
}
function resultLines(result) {
  const verb = result.dryRun ? "would " : "";
  const lines = [];
  for (const f of result.applied) {
    lines.push(`${verb}fixed ${f.file}: ${f.description ?? f.action}`);
  }
  for (const n2 of result.notes) lines.push(n2);
  for (const s of result.skipped) {
    lines.push(`skipped ${s.finding.file}: ${s.reason}`);
  }
  return lines;
}
function buildPrBody({ findings, result }) {
  const out = [];
  out.push("## PolinRider malware cleanup");
  out.push("");
  out.push(
    "Automatically generated by polinrider-remover. Every change below was confirmed by a known PolinRider signature. The scanner reads files as inert text and never executes them."
  );
  out.push("");
  const REMOVAL_ACTIONS = /* @__PURE__ */ new Set(["remove-dir", "remove-font-set", "delete-font", "remove-artifact"]);
  const fixed = [];
  for (const f of result.applied) {
    const what = REMOVAL_ACTIONS.has(f.action) || result.filesDeleted.includes(f.file) ? "removed" : "cleaned";
    fixed.push(`- \`${f.file}\`: ${what} \u2014 ${f.description ?? f.action}`);
  }
  for (const n2 of result.notes) fixed.push(`- ${n2}`);
  if (fixed.length) {
    out.push("### Removed / fixed");
    out.push(...fixed);
    out.push("");
  }
  const review = [
    ...findings.manualReview.map((m) => `- ${m}`),
    ...result.skipped.map((s) => `- \`${s.finding.file}\`: ${s.reason}`)
  ];
  if (review.length) {
    out.push("### Needs manual review");
    out.push(...review);
    out.push("");
  }
  out.push(
    "> \u26A0\uFE0F Also check the affected developer's machine for the initial dropper (a malicious npm global package or VS Code extension), and rotate any secrets that may have been exposed via committed `.env` files."
  );
  out.push("");
  return out.join("\n");
}

// src/lines.js
import fs5 from "node:fs";
import path10 from "node:path";
function findingStartLine(repoDir, finding) {
  const offset = finding?.edit?.offset;
  if (!(offset > 0) || !repoDir) return 1;
  try {
    const text = fs5.readFileSync(path10.join(repoDir, finding.file), "utf8");
    if (offset > text.length) return 1;
    return text.slice(0, offset).split("\n").length;
  } catch {
    return 1;
  }
}

// src/sarif.js
import path11 from "node:path";
var PROJECT_URL = "https://github.com/Innovative-VAS/polinrider-cleanup";
var levelOf = (f) => f.contentConfirmed ? "error" : "warning";
function uriFor(repoRoot, repoDir, relFile) {
  const abs = path11.join(repoDir || repoRoot, relFile);
  const rel = path11.relative(repoRoot || repoDir, abs) || relFile;
  return rel.split(path11.sep).join("/");
}
function buildSarif(findings, opts = {}) {
  const root = opts.repoRoot || opts.repoDir || findings.repoDir;
  const dir = opts.repoDir || findings.repoDir || root;
  const rules = /* @__PURE__ */ new Map();
  const results = findings.findings.map((f) => {
    if (!rules.has(f.id)) {
      rules.set(f.id, {
        id: f.id,
        name: f.id,
        shortDescription: { text: `PolinRider ${f.category} artifact` },
        fullDescription: { text: f.description },
        defaultConfiguration: { level: levelOf(f) },
        helpUri: PROJECT_URL,
        properties: { tags: ["security", "malware", "polinrider", f.category] }
      });
    }
    return {
      ruleId: f.id,
      level: levelOf(f),
      message: { text: f.description },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: uriFor(root, dir, f.file) },
            region: { startLine: findingStartLine(dir, f) }
          }
        }
      ],
      properties: { confidence: f.confidence, contentConfirmed: f.contentConfirmed, action: f.action }
    };
  });
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "polinrider-cleanup",
            informationUri: PROJECT_URL,
            rules: [...rules.values()]
          }
        },
        results
      }
    ]
  };
}

// src/ci.js
var BOT_EMAIL = "polinrider-cleanup-bot@users.noreply.github.com";
var BOT_NAME = "PolinRider Cleanup Bot";
var PROJECT_URL2 = "https://github.com/Innovative-VAS/polinrider-cleanup";
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var oneLine = (s) => (s || "").trim().split("\n")[0];
function input(name) {
  const v = process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`];
  return v === void 0 ? "" : v.trim();
}
var bool = (v) => /^(true|1|yes|on)$/i.test(String(v).trim());
function resolveSettings() {
  const commentRaw = input("comment-on-pr");
  return {
    mode: (input("mode") || "check").toLowerCase(),
    scanPath: input("path") || ".",
    exclude: input("exclude") || process.env.POLINRIDER_EXCLUDE || "",
    token: input("token") || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "",
    failOn: (input("fail-on") || "infected").toLowerCase(),
    commit: bool(input("commit")),
    // default false
    amend: input("amend") ? bool(input("amend")) : process.env.AMEND === "true",
    commentOnPr: commentRaw === "" ? true : bool(commentRaw),
    sarifFile: input("sarif-file") || process.env.SARIF_FILE || "",
    dryRun: input("dry-run") ? bool(input("dry-run")) : process.env.DRY_RUN === "true",
    autoMerge: input("auto-merge") ? bool(input("auto-merge")) : process.env.AUTO_MERGE === "true",
    mergeMethod: (input("merge-method") || process.env.MERGE_METHOD || "squash").toLowerCase(),
    branchPrefix: input("branch-prefix") || process.env.BRANCH_PREFIX || "fix/polinrider-cleanup"
  };
}
function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  try {
    fs6.appendFileSync(file, `${name}=${value}
`);
  } catch {
  }
}
function appendSummary(md) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  try {
    fs6.appendFileSync(file, md.endsWith("\n") ? md : md + "\n");
  } catch {
  }
}
var escData = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
var escProp = (s) => escData(s).replace(/,/g, "%2C").replace(/:/g, "%3A");
function annotate(level, { file, line, title, message }) {
  const props = [];
  if (file) props.push(`file=${escProp(file)}`);
  if (line) props.push(`line=${line}`);
  if (title) props.push(`title=${escProp(title)}`);
  console.log(`::${level}${props.length ? " " + props.join(",") : ""}::${escData(message)}`);
}
var notice = (m) => console.log(`::notice::${escData(m)}`);
var warn = (m) => console.log(`::warning::${escData(m)}`);
var SEVERITY_RANK = { clean: 0, suspicious: 1, infected: 2 };
function failThreshold(failOn) {
  if (failOn === "never") return Infinity;
  if (failOn === "suspicious") return SEVERITY_RANK.suspicious;
  return SEVERITY_RANK.infected;
}
function annotationPath(workspace, repoDir, relFile) {
  return path12.relative(workspace, path12.join(repoDir, relFile)) || relFile;
}
function emitAnnotations(workspace, repoDir, findings) {
  for (const f of findings.findings) {
    annotate(f.contentConfirmed ? "error" : "warning", {
      file: annotationPath(workspace, repoDir, f.file),
      line: findingStartLine(repoDir, f),
      title: f.contentConfirmed ? "PolinRider malware" : "PolinRider (review)",
      message: f.description
    });
  }
}
function buildSummary({ settings, findings, result }) {
  const icon = findings.severity === "infected" ? "\u{1F534}" : findings.severity === "suspicious" ? "\u{1F7E1}" : "\u{1F7E2}";
  const out = [
    "## \u{1F6E1}\uFE0F PolinRider Malware Scan",
    "",
    `**Mode:** \`${settings.mode}\`${settings.dryRun ? " (dry run)" : ""} \xB7 **Severity:** ${icon} \`${findings.severity}\` \xB7 **Findings:** ${findings.findings.length}`,
    ""
  ];
  if (findings.findings.length) {
    out.push("### Findings");
    for (const l of findingLines(findings)) out.push(`- ${l}`);
    out.push("");
  } else {
    out.push("No PolinRider signatures found. \u2705", "");
  }
  if (result) {
    out.push(settings.dryRun ? "### Planned remediation (dry run)" : "### Remediation");
    const lines = resultLines(result);
    if (lines.length) for (const l of lines) out.push(`- ${l}`);
    else out.push("- (no changes)");
    out.push("");
  }
  if (findings.manualReview.length) {
    out.push("### Needs manual review");
    for (const m of findings.manualReview) out.push(`- ${m}`);
    out.push("");
  }
  out.push("---", `_Generated by [polinrider-cleanup](${PROJECT_URL2})._`);
  return out.join("\n");
}
async function configureIdentity(repoDir) {
  await safeGit(["-C", repoDir, "config", "user.email", BOT_EMAIL]);
  await safeGit(["-C", repoDir, "config", "user.name", BOT_NAME]);
}
var tokenUrl = (fullName, token) => `https://x-access-token:${token}@github.com/${fullName}.git`;
function readEvent() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p) return null;
  try {
    return JSON.parse(fs6.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
async function commitBack(repoDir, settings) {
  const event = process.env.GITHUB_EVENT_NAME || "";
  if (event.startsWith("pull_request")) {
    warn("commit skipped on pull_request events (detached HEAD / forks can't be pushed). Use mode: pr, or run fix on push events.");
    return false;
  }
  const fullName = process.env.GITHUB_REPOSITORY;
  if (!fullName || !settings.token) {
    warn("commit skipped \u2014 GITHUB_REPOSITORY or token unavailable.");
    return false;
  }
  let branch = process.env.GITHUB_REF_NAME;
  if (!branch) {
    const rp = await safeGit(["-C", repoDir, "rev-parse", "--abbrev-ref", "HEAD"]);
    branch = rp.stdout.trim();
  }
  if (!branch || branch === "HEAD") {
    warn("commit skipped \u2014 could not resolve a branch to push to (detached HEAD).");
    return false;
  }
  if (settings.amend) {
    const shallow = (await safeGit(["-C", repoDir, "rev-parse", "--is-shallow-repository"])).stdout.trim();
    if (shallow === "true") {
      warn("amend needs full history to avoid destroying it \u2014 set `fetch-depth: 0` on actions/checkout (or drop `amend` for a normal cleanup commit, or use mode: pr).");
      return false;
    }
  }
  await configureIdentity(repoDir);
  const origHead = settings.amend ? (await safeGit(["-C", repoDir, "rev-parse", "HEAD"])).stdout.trim() : null;
  await safeGit(["-C", repoDir, "add", "-A"]);
  const staged = await safeGit(["-C", repoDir, "diff", "--cached", "--name-only"]);
  if (!staged.stdout.trim()) return false;
  const commitArgs = settings.amend ? ["-C", repoDir, "commit", "--amend", "--no-edit", "--allow-empty"] : [
    "-C",
    repoDir,
    "commit",
    "-m",
    "security: remove PolinRider malware artifacts\n\nAutomated cleanup by the polinrider-cleanup action."
  ];
  const commit = await safeGit(commitArgs);
  if (commit.exitCode !== 0) {
    warn(`commit failed: ${oneLine(commit.stderr)}`);
    return false;
  }
  const push = settings.amend ? await forcePush(repoDir, fullName, settings.token, branch, origHead) : await safeGit(["-C", repoDir, "push", tokenUrl(fullName, settings.token), `HEAD:${branch}`]);
  if (push.exitCode !== 0) {
    warn(`push to ${branch} failed (protected branch?): ${oneLine(push.stderr)}`);
    return false;
  }
  notice(
    settings.amend ? `Cleaned files amended into HEAD and force-pushed to ${branch}.` : `Cleaned files committed and pushed to ${branch}.`
  );
  return true;
}
async function forcePush(repoDir, fullName, token, branch, origHead) {
  const url = tokenUrl(fullName, token);
  const lease = await safeGit([
    "-C",
    repoDir,
    "push",
    `--force-with-lease=${branch}:${origHead}`,
    url,
    `HEAD:${branch}`
  ]);
  if (lease.exitCode === 0) return lease;
  warn(`--force-with-lease rejected (${oneLine(lease.stderr)}); retrying with --force.`);
  return safeGit(["-C", repoDir, "push", "--force", url, `HEAD:${branch}`]);
}
async function openCleanupPr(repoDir, settings, findings, result) {
  const fullName = process.env.GITHUB_REPOSITORY;
  if (!fullName) throw new Error("GITHUB_REPOSITORY is not set");
  if (!settings.token) throw new Error("a token is required for mode: pr (set `token:` or GH_TOKEN)");
  const branch = `${settings.branchPrefix}-${Date.now()}`;
  await configureIdentity(repoDir);
  const co = await safeGit(["-C", repoDir, "checkout", "-b", branch]);
  if (co.exitCode !== 0) throw new Error(`branch creation failed: ${oneLine(co.stderr)}`);
  await safeGit(["-C", repoDir, "add", "-A"]);
  const staged = await safeGit(["-C", repoDir, "diff", "--cached", "--name-only"]);
  if (!staged.stdout.trim()) return { skipped: true, reason: "no staged changes after remediation" };
  const commit = await safeGit([
    "-C",
    repoDir,
    "commit",
    "-m",
    `${PR_TITLE}

Automated surgical cleanup by the polinrider-cleanup action.`
  ]);
  if (commit.exitCode !== 0) throw new Error(`commit failed: ${oneLine(commit.stderr)}`);
  const push = await safeGit(["-C", repoDir, "push", tokenUrl(fullName, settings.token), branch]);
  if (push.exitCode !== 0) throw new Error(`push failed: ${oneLine(push.stderr)}`);
  const body = buildPrBody({ findings, result });
  const base = ["pr", "create", "--repo", fullName, "--title", PR_TITLE, "--body", body, "--head", branch];
  let pr = await safeGh([...base, "--label", "security"], {}, settings.token);
  if (pr.exitCode !== 0) pr = await safeGh(base, {}, settings.token);
  if (pr.exitCode !== 0) throw new Error(`PR creation failed: ${oneLine(pr.stderr)}`);
  const url = pr.stdout.trim();
  if (!settings.autoMerge) return { url, merged: false, mergeError: null };
  const mergeArgs = ["pr", "merge", url, `--${settings.mergeMethod}`, "--delete-branch"];
  let merge = await safeGh(mergeArgs, {}, settings.token);
  if (merge.exitCode !== 0) {
    await sleep(3e3);
    merge = await safeGh(mergeArgs, {}, settings.token);
  }
  if (merge.exitCode === 0) return { url, merged: true, mergeError: null };
  return { url, merged: false, mergeError: oneLine(merge.stderr || merge.stdout) || "merge failed" };
}
async function postPrComment(settings, summaryMd) {
  if (!settings.commentOnPr) return;
  if (!(process.env.GITHUB_EVENT_NAME || "").startsWith("pull_request")) return;
  if (!settings.token) return;
  const ev = readEvent();
  const num = ev?.pull_request?.number ?? ev?.number;
  const fullName = process.env.GITHUB_REPOSITORY;
  if (!num || !fullName) return;
  const res = await safeGh(
    ["pr", "comment", String(num), "--repo", fullName, "--body", summaryMd],
    {},
    settings.token
  );
  if (res.exitCode !== 0) warn(`could not post PR comment (needs pull-requests: write): ${oneLine(res.stderr)}`);
}
async function run() {
  const settings = resolveSettings();
  if (!["check", "fix", "pr"].includes(settings.mode)) {
    console.log(`::error::invalid mode "${settings.mode}" (expected check | fix | pr)`);
    return 2;
  }
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const repoDir = path12.resolve(workspace, settings.scanPath);
  console.log(
    `PolinRider scan \u2014 mode=${settings.mode} path=${path12.relative(workspace, repoDir) || "."}${settings.dryRun ? " (dry run)" : ""}`
  );
  const findings = await scanRepo(repoDir, { exclude: settings.exclude });
  emitAnnotations(workspace, repoDir, findings);
  let result = null;
  let prUrl = "";
  let changed = false;
  const shouldRemediate = findings.severity === "infected" || findings.hasAutoFixable === true;
  if ((settings.mode === "fix" || settings.mode === "pr") && shouldRemediate) {
    result = await remediate(repoDir, findings, { dryRun: settings.dryRun });
    changed = result.changed;
    if (settings.mode === "fix" && (settings.commit || settings.amend) && !settings.dryRun && changed) {
      await commitBack(repoDir, settings);
    }
    if (settings.mode === "pr" && !settings.dryRun) {
      if (changed) {
        try {
          const pr = await openCleanupPr(repoDir, settings, findings, result);
          if (pr.skipped) {
            warn(`PR skipped: ${pr.reason}`);
          } else {
            prUrl = pr.url;
            if (pr.merged) notice(`Cleanup PR merged: ${prUrl}`);
            else if (pr.mergeError) warn(`Cleanup PR opened (auto-merge blocked: ${pr.mergeError}): ${prUrl}`);
            else notice(`Cleanup PR opened: ${prUrl}`);
          }
        } catch (e) {
          warn(`PR mode failed: ${e.message}`);
        }
      } else {
        warn("Infected, but only manual-review items remain \u2014 no automated changes to open a PR for.");
      }
    }
  }
  if (settings.sarifFile) {
    try {
      const sarif = buildSarif(findings, { repoRoot: workspace, repoDir });
      const dest = path12.resolve(settings.sarifFile);
      await fsp.mkdir(path12.dirname(dest), { recursive: true });
      await fsp.writeFile(dest, JSON.stringify(sarif, null, 2));
      setOutput("sarif-file", settings.sarifFile);
    } catch (e) {
      warn(`could not write SARIF: ${e.message}`);
    }
  }
  const summaryMd = buildSummary({ settings, findings, result });
  appendSummary(summaryMd);
  await postPrComment(settings, summaryMd);
  const remediated = !!(result && (result.filesModified.length || result.filesDeleted.length));
  setOutput("severity", findings.severity);
  setOutput("infected", String(findings.severity === "infected"));
  setOutput("findings-count", String(findings.findings.length));
  setOutput("changed", String(changed));
  setOutput("remediated", String(remediated));
  if (prUrl) setOutput("pr-url", prUrl);
  const threshold = failThreshold(settings.failOn);
  const sev = SEVERITY_RANK[findings.severity] ?? 0;
  const wouldFailSeverity = threshold !== Infinity && sev >= threshold;
  let code = 0;
  if (settings.mode === "check" || settings.dryRun) {
    code = wouldFailSeverity ? 1 : 0;
  } else if (settings.mode === "fix") {
    const unresolved = findings.findings.filter((f) => f.contentConfirmed && f.action === "manual-review").length + (result?.skipped?.filter((s) => s.finding.contentConfirmed).length ?? 0);
    code = threshold !== Infinity && findings.severity === "infected" && unresolved > 0 ? 1 : 0;
  } else if (settings.mode === "pr") {
    code = threshold !== Infinity && findings.severity === "infected" && !prUrl ? 1 : 0;
  }
  console.log(
    findings.severity === "infected" ? `Result: INFECTED \u2014 ${findings.findings.length} finding(s).` : findings.severity === "suspicious" ? "Result: suspicious file layout \u2014 no confirmed payload." : "Result: clean."
  );
  return code;
}
var invokedDirectly = process.argv[1] && path12.resolve(process.argv[1]) === fileURLToPath3(import.meta.url);
if (invokedDirectly) {
  run().then((code) => process.exit(code)).catch((err) => {
    console.log(`::error::${escData(err.message)}`);
    process.exit(1);
  });
}
export {
  buildSummary,
  failThreshold,
  resolveSettings,
  run
};
