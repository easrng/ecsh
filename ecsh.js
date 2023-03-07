import * as std from "std";
let input = std.in;
const file = scriptArgs[1];
if (file) {
  input = std.open(file, "r");
  if(!input) {
    std.err.printf("ecsh: file '%s' not found\n", file);
    std.exit(1);
  }
}
var scan = (string, pattern, callback) => {
  let result = "";
  while (string.length > 0) {
    const match = string.match(pattern);
    if (match && match.index != null && match[0] != null) {
      result += string.slice(0, match.index);
      result += callback(match);
      string = string.slice(match.index + match[0].length);
    } else {
      result += string;
      string = "";
    }
  }
  return result;
};
var split = (line = "") => {
  const words = [];
  let field = [];
  scan(
    line,
    /\s*(?:([^\s\\\'\"]+)|'((?:[^\'\\]|\\.)*)'|"((?:[^\"\\]|\\.)*)"|(\\.?)|(\S))(\s|$)?/,
    (match) => {
      const [_raw, word, sq, dq, escape2, garbage, separator] = match;
      if (garbage != null) {
        throw new Error(`Unmatched quote: ${line}`);
      }
      if (word) {
        field.push(word);
      } else {
        let addition;
        if (sq) {
          addition = sq;
        } else if (dq) {
          addition = dq;
        } else if (escape2) {
          addition = escape2;
        }
        if (addition) {
          field.push([addition.replace(/\\(?=.)/, "")]);
        }
      }
      if (separator != null) {
        words.push(field);
        field = [];
      }
    }
  );
  if (field.length > 0) {
    words.push(field);
  }
  return words;
};
var escape = (str = "") => {
  return str
    .replace(/([^A-Za-z0-9_\-.,:\/@\n])/g, "\\$1")
    .replace(/\n/g, "'\n'");
};

var stripComments = (arr) => {
  let out = [];
  let done = false;
  for (let seg of arr) {
    let outseg = [];
    for (let part of seg) {
      if (typeof part !== "string") {
        outseg.push(part);
      } else {
        const i = part.indexOf("#");
        if (i === -1) {
          outseg.push(part);
        } else {
          part = part.slice(0, i);
          if (part) outseg.push(part);
          done = true;
          break;
        }
      }
    }
    if (outseg.length > 0) out.push(outseg);
    if (done) break;
  }
  return out;
};
const flatten = (arr) => arr.map((e) => e.flat(Infinity).join(""));
const parseEnv = (arr) => {
  const vars = {};
  const farr = flatten(arr);
  for (let i = 0; i < farr.length; i++) {
    const match = farr[i].match(/^([a-zA-Z_]+[a-zA-Z0-9_]*)=([\s\S]+)$/);
    if (!match) return { vars, argv: arr.slice(i), fargv: farr };
    vars[match[1]] = match[2];
  }
  return { vars, argv: [], fargv: [] };
};
let line;
while ((line = input.getline()) !== null) {
  const { vars, fargv } = parseEnv(stripComments(split(line)));
  if (fargv.length < 1) continue;
  if (fargv[0] !== "echo") {
    std.err.printf("ecsh: attempt to run non-echo command '%s'\n", fargv[0]);
  } else {
    std.out.printf("%s\n", fargv.slice(1).join(" "));
  }
}
