import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import MSAL

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // NoShakeWindow swallows shake motion events at the responder-chain
    // root in DEBUG so RN's swizzled `motionEnded` (which posts the
    // show-dev-menu notification) never fires. Belt-and-suspenders with
    // the JS-side disable in index.js — the JS path is occasionally late
    // or version-dependent, the native path is bulletproof.
    window = NoShakeWindow(frame: UIScreen.main.bounds)

    // Suppress RN's `RCTDevLoadingView` overlay — the white "Connect to Metro
    // to develop JavaScript." banner and the bundle-download progress bar.
    //
    // In Release builds this is already a no-op: `RCTDevLoadingView`'s
    // implementation is wrapped in `#if RCT_DEV_MENU` which is undefined in
    // Release, so the class is empty and the overlay can never render.
    // The call here additionally hides it in Debug installs on a physical
    // device that can't reach Metro. `cmd+D` still opens the dev menu.
    RCTDevLoadingViewSetEnabled(false)

    factory.startReactNative(
      withModuleName: "MyEK",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // Required for MSAL broker (Microsoft Authenticator) round-trip.
  // When the user authenticates in Authenticator, iOS hands the auth response
  // back to MyEK via our `msauth.com.myek.app.bm.dev://auth` URL scheme.
  // Without this method, the response is dropped and MSAL fails with
  // `MSALErrorBrokerNoResponse` (-42700).
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return MSALPublicClientApplication.handleMSALResponse(
      url,
      sourceApplication: options[.sourceApplication] as? String
    )
  }
}

// Custom UIWindow subclass kept for code symmetry. The dev menu's
// shake trigger is now suppressed via the JS-side
// NativeModules.DevSettings.setIsShakeToShowDevMenuEnabled(false) call
// in index.js, so we no longer swallow motion events here — app-level
// shake listeners (react-native-shake → open Employee-ID sheet) need
// the events to flow through the responder chain.
final class NoShakeWindow: UIWindow {}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
