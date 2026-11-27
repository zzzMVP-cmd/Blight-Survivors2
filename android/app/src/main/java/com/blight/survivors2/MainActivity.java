package com.blight.survivors2;

import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onBackPressed() {
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            moveTaskToBack(true);
            return;
        }

        String script = "(function(){ if (window.Game && Game.running) {"
                + " if (Game.paused) { return 'exit'; }"
                + " Game.pause(); return 'pause'; } return 'exit'; })()";

        bridge.getWebView().evaluateJavascript(script, value -> {
            if (value == null || !value.contains("pause")) {
                moveTaskToBack(true);
            }
        });
    }
}