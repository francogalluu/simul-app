// The iOS 27 SDK refuses to launch apps that don't use the UIScene lifecycle
// ("UIScene life cycle is required for apps built with this SDK"), but the
// AppDelegate that Expo SDK 57 generates still creates its window directly.
// This plugin moves window creation and React Native startup into a
// SceneDelegate, so the generated project keeps working after `expo prebuild`.
const {
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
  IOSConfig,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SCENE_DELEGATE = `import UIKit
import React

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // Scenes don't get launch options in didFinishLaunching, so rebuild the
    // one React Native's Linking module reads for the initial URL.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    if let userActivity = connectionOptions.userActivities.first {
      self.scene(scene, continue: userActivity)
    }
  }

  // Linking API
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  // Universal Links
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in })
  }
}
`;

const WINDOW_BLOCK = /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\(\s*withModuleName: "main",\s*in: window,\s*launchOptions: launchOptions\)\s*#endif\s*/;

module.exports = function withUIScene(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return mod;
  });

  config = withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('withUIScene only supports the Swift AppDelegate.');
    }
    const contents = mod.modResults.contents;
    if (WINDOW_BLOCK.test(contents)) {
      mod.modResults.contents = contents.replace(
        WINDOW_BLOCK,
        '// The window is created and React Native is started in SceneDelegate.\n\n'
      );
    } else if (!contents.includes('SceneDelegate')) {
      throw new Error(
        'withUIScene: could not find the window setup in AppDelegate.swift. ' +
          'The generated template changed; update plugins/withUIScene.js.'
      );
    }
    return mod;
  });

  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const file = path.join(
        mod.modRequest.platformProjectRoot,
        mod.modRequest.projectName,
        'SceneDelegate.swift'
      );
      fs.writeFileSync(file, SCENE_DELEGATE);
      return mod;
    },
  ]);

  config = withXcodeProject(config, (mod) => {
    const projectName = mod.modRequest.projectName;
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${projectName}/SceneDelegate.swift`,
      groupName: projectName,
      project: mod.modResults,
    });
    return mod;
  });

  return config;
};
