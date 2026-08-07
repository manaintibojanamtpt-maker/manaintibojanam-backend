package com.bhojanos.orderbhojan;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Toggle edge-to-edge while Razorpay Checkout is open so the Continue bar
 * is not covered by the Android system navigation bar.
 */
@CapacitorPlugin(name = "OrderBhojanNativeChrome")
public class OrderBhojanNativeChromePlugin extends Plugin {

    private Integer previousNavBarColor = null;
    private Boolean previousDrawSystemBarBackgrounds = null;

    @PluginMethod
    public void setFitsSystemWindows(PluginCall call) {
        Boolean fits = call.getBoolean("fits", Boolean.TRUE);
        final boolean value = fits == null || fits;
        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                WindowCompat.setDecorFitsSystemWindows(window, value);

                View webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    if (value) {
                        Insets nav = ViewCompat.getRootWindowInsets(webView) != null
                            ? ViewCompat.getRootWindowInsets(webView)
                                .getInsets(WindowInsetsCompat.Type.navigationBars())
                            : Insets.of(0, 0, 0, 0);
                        int bottom = Math.max(nav.bottom, dp(48));
                        webView.setPadding(webView.getPaddingLeft(), webView.getPaddingTop(),
                            webView.getPaddingRight(), bottom);
                    } else {
                        webView.setPadding(webView.getPaddingLeft(), webView.getPaddingTop(),
                            webView.getPaddingRight(), 0);
                    }
                }

                if (value) {
                    if (previousNavBarColor == null) {
                        previousNavBarColor = window.getNavigationBarColor();
                    }
                    if (previousDrawSystemBarBackgrounds == null) {
                        previousDrawSystemBarBackgrounds =
                            (window.getAttributes().flags & WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS) != 0;
                    }
                    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                    window.setNavigationBarColor(Color.BLACK);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        window.setNavigationBarContrastEnforced(true);
                    }
                    WindowInsetsControllerCompat controller =
                        WindowCompat.getInsetsController(window, window.getDecorView());
                    if (controller != null) {
                        controller.setAppearanceLightNavigationBars(false);
                    }
                } else {
                    if (previousNavBarColor != null) {
                        window.setNavigationBarColor(previousNavBarColor);
                        previousNavBarColor = null;
                    }
                    if (Boolean.FALSE.equals(previousDrawSystemBarBackgrounds)) {
                        window.clearFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                    }
                    previousDrawSystemBarBackgrounds = null;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        window.setNavigationBarContrastEnforced(false);
                    }
                }

                JSObject ret = new JSObject();
                ret.put("fits", value);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to update system windows: " + e.getMessage(), e);
            }
        });
    }

    private int dp(int value) {
        float density = getActivity().getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }
}
