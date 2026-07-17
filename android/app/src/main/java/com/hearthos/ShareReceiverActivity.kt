package com.hearthos

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

class ShareReceiverActivity : ReactActivity() {
    
    /**
     * Returns the name of the main component registered from JavaScript.
     * This matches the exact string key you registered in index.js!
     */
    override fun getMainComponentName(): String? {
        return "ShareMenuReceiver"
    }

    /**
     * 🚀 CRITICAL FOR NEW RN VERSIONS: Spawns the delegate bridge layout
     * parameters safely to avoid instant initialization window crashes.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(this, mainComponentName!!, false)
    }
}