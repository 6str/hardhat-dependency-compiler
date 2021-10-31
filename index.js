const fs = require('fs');
const path = require('path');
const { extendConfig } = require('hardhat/config');

const { HardhatPluginError } = require('hardhat/plugins');

const { name } = require('./package.json');

const {
  TASK_COMPILE,
} = require('hardhat/builtin-tasks/task-names');

extendConfig(function (config, userConfig) {
  config.dependencyCompiler = Object.assign(
    {
      paths: [],
      path: `./${ name }`,
      keep: false,
    },
    userConfig.dependencyCompiler
  );
});

const generate = function (dependency) {
  return [
    '// SPDX-License-Identifier: UNLICENSED',
    'pragma solidity >0.0.0;',
    `import '${ dependency }';`,
  ].map(l => `${ l }\n`).join('');
};

task(TASK_COMPILE, async function (args, hre, runSuper) {
  const config = hre.config.dependencyCompiler;

  const directory = path.resolve(hre.config.paths.sources, config.path);
  const tracker = path.resolve(directory, `.${ name }`);

  if (!directory.startsWith(hre.config.paths.sources)) {
    throw new HardhatPluginError('resolved path must be inside of sources directory');
  }

  if (directory === hre.config.paths.sources) {
    throw new HardhatPluginError('resolved path must not be sources directory');
  }

  if (fs.existsSync(directory)) {
    if (fs.existsSync(tracker)) {
      fs.rmSync(directory, { recursive: true });
    } else {
      throw new HardhatPluginError(`temporary source directory must have been generated by ${ name }`);
    }
  }

  fs.mkdirSync(directory);
  fs.writeFileSync(tracker, `directory approved for write access by ${ name }\n`);

  for (let dependency of config.paths) {
    const fullPath = path.join(directory, dependency);

    if (!fs.existsSync(path.dirname(fullPath))) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    }

    fs.writeFileSync(fullPath, generate(dependency));
  }

  try {
    await runSuper();
  } finally {
    if (!config.keep) {
      fs.rmSync(directory, { recursive: true });
    }
  }
});
