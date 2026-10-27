const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withRNFBFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        const fixSnippet = `
  installer.pods_project.targets.each do |target|
    if ['RNFBApp'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['DEFINES_MODULE'] = 'NO'
      end
    end
  end
`;

        if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
          podfileContent = podfileContent.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|\n${fixSnippet}`
          );
          fs.writeFileSync(podfilePath, podfileContent);
        }
      }
      return config;
    },
  ]);
};
