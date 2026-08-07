package com.bhojanos.orderbhojan;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

/**
 * Opens installed UPI apps via Android intents (kitchen VPA / upi://pay).
 * WebView location.assign for upi:// is unreliable; startActivity is Zomato-style reliable.
 */
@CapacitorPlugin(name = "OrderBhojanNativeUpi")
public class OrderBhojanNativeUpiPlugin extends Plugin {

    @PluginMethod
    public void openPayUrl(PluginCall call) {
        String url = call.getString("url", "");
        if (url == null || url.trim().isEmpty()) {
            call.reject("Missing UPI url");
            return;
        }
        String trimmed = url.trim();

        getActivity().runOnUiThread(() -> {
            try {
                Intent intent;
                if (trimmed.toLowerCase().startsWith("intent:")) {
                    intent = Intent.parseUri(trimmed, Intent.URI_INTENT_SCHEME);
                } else {
                    intent = new Intent(Intent.ACTION_VIEW, Uri.parse(trimmed));
                }
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                PackageManager pm = getContext().getPackageManager();
                List<ResolveInfo> handlers =
                        pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
                if (handlers == null || handlers.isEmpty()) {
                    JSObject ret = new JSObject();
                    ret.put("opened", false);
                    ret.put("reason", "no_handler");
                    call.resolve(ret);
                    return;
                }

                // Let the user pick among GPay / PhonePe / Paytm when multiple apps handle upi://
                Intent chooser = Intent.createChooser(intent, "Pay with UPI");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(chooser);

                JSObject ret = new JSObject();
                ret.put("opened", true);
                ret.put("reason", "chooser");
                call.resolve(ret);
            } catch (ActivityNotFoundException e) {
                JSObject ret = new JSObject();
                ret.put("opened", false);
                ret.put("reason", "not_found");
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to open UPI app: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void hasUpiApps(PluginCall call) {
        try {
            Intent probe = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"));
            PackageManager pm = getContext().getPackageManager();
            List<ResolveInfo> handlers =
                    pm.queryIntentActivities(probe, PackageManager.MATCH_DEFAULT_ONLY);
            JSObject ret = new JSObject();
            ret.put("available", handlers != null && !handlers.isEmpty());
            ret.put("count", handlers == null ? 0 : handlers.size());
            JSArray packages = new JSArray();
            if (handlers != null) {
                for (ResolveInfo info : handlers) {
                    if (info.activityInfo != null && info.activityInfo.packageName != null) {
                        packages.put(info.activityInfo.packageName);
                    }
                }
            }
            ret.put("packages", packages);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("available", false);
            ret.put("count", 0);
            call.resolve(ret);
        }
    }
}
