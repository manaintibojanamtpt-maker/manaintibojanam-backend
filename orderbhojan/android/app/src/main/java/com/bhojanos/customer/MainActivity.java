package com.bhojanos.customer;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register local plugins before bridge init so JS registerPlugin can resolve them.
        registerPlugin(OrderBhojanNativeSttPlugin.class);
        registerPlugin(OrderBhojanNativeTrackPlugin.class);
        registerPlugin(OrderBhojanNativeUpiPlugin.class);
        registerPlugin(OrderBhojanNativeChromePlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
