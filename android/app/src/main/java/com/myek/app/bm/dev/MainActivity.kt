package com.myek.app.bm.dev

import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.common.ShakeDetector
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MyEK"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // RN's DevSupportManager starts an internal ShakeDetector whenever dev
  // support is on, and there's no public API to disable just shake. Reach
  // in via reflection and stop the detector after RN spins it up — Fast
  // Refresh and the inspector still work, but a shake no longer pops the
  // dev menu. Best-effort: if RN internals shift in a future version this
  // fails silently and the default shake behaviour returns.
  override fun onResume() {
    super.onResume()
    if (BuildConfig.DEBUG) {
      Handler(Looper.getMainLooper()).postDelayed({ stopShakeDetector() }, 250)
    }
  }

  private fun stopShakeDetector() {
    try {
      val host = reactHost ?: return
      val devSupport = host.devSupportManager ?: return
      var cls: Class<*>? = devSupport.javaClass
      while (cls != null) {
        for (field in cls.declaredFields) {
          if (field.type == ShakeDetector::class.java) {
            field.isAccessible = true
            (field.get(devSupport) as? ShakeDetector)?.stop()
            return
          }
        }
        cls = cls.superclass
      }
    } catch (t: Throwable) {
      // Tolerate RN-internal layout changes; not worth a crash in dev.
    }
  }
}
