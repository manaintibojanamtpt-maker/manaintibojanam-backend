package com.bhojanos.customer;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/**
 * Native Android speech recognition for OrderBhojan voice agent.
 * Exposed to JS as Capacitor plugin "OrderBhojanNativeStt".
 */
@CapacitorPlugin(
    name = "OrderBhojanNativeStt",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class OrderBhojanNativeSttPlugin extends Plugin {
    private static final String EVENT_PARTIAL = "partialResult";
    private static final String EVENT_FINAL = "finalResult";
    private static final String EVENT_ERROR = "error";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private SpeechRecognizer speechRecognizer;
    private PluginCall activeCall;
    private boolean listening = false;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        boolean available = SpeechRecognizer.isRecognitionAvailable(getContext());
        ret.put("available", available);
        call.resolve(ret);
    }

    @PluginMethod
    public void getPermissionState(PluginCall call) {
        JSObject ret = new JSObject();
        PermissionState state = getPermissionState("microphone");
        if (state == PermissionState.GRANTED) {
            ret.put("state", "granted");
        } else if (state == PermissionState.DENIED) {
            ret.put("state", "denied");
        } else {
            ret.put("state", "prompt");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("state", "granted");
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("microphone", call, "permissionRequestCallback");
    }

    @PermissionCallback
    private void permissionRequestCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put(
            "state",
            getPermissionState("microphone") == PermissionState.GRANTED ? "granted" : "denied"
        );
        call.resolve(ret);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            rejectWithCode(call, "unavailable", "Speech recognition is not available on this device.");
            return;
        }
        if (listening) {
            rejectWithCode(call, "recognizer_busy", "Speech recognizer is already listening.");
            return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "startAfterPermissionCallback");
            return;
        }
        beginListening(call);
    }

    @PermissionCallback
    private void startAfterPermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            rejectWithCode(call, "permission_denied", "Microphone permission was denied.");
            return;
        }
        beginListening(call);
    }

    private void beginListening(PluginCall call) {
        call.setKeepAlive(true);
        activeCall = call;
        String language = call.getString("language", "en-IN");
        String prompt = call.getString("prompt", "Speak now");
        boolean partialResults = Boolean.TRUE.equals(call.getBoolean("partialResults", true));
        int maxResults = call.getInt("maxResults", 3);

        mainHandler.post(() -> {
            try {
                destroyRecognizer();
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                speechRecognizer.setRecognitionListener(buildListener());

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                );
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, partialResults);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, maxResults);
                intent.putExtra(RecognizerIntent.EXTRA_PROMPT, prompt);
                intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());

                listening = true;
                speechRecognizer.startListening(intent);
            } catch (Exception e) {
                listening = false;
                rejectWithCode(call, "unavailable", "Failed to start speech recognition: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        mainHandler.post(() -> {
            if (speechRecognizer != null && listening) {
                speechRecognizer.stopListening();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void cancelListening(PluginCall call) {
        mainHandler.post(() -> {
            if (speechRecognizer != null) {
                speechRecognizer.cancel();
            }
            listening = false;
            if (activeCall != null) {
                rejectWithCode(activeCall, "cancelled", "Listening cancelled.");
                activeCall = null;
            }
            destroyRecognizer();
            call.resolve();
        });
    }

    private RecognitionListener buildListener() {
        return new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {}

            @Override
            public void onBeginningOfSpeech() {}

            @Override
            public void onRmsChanged(float rmsdB) {}

            @Override
            public void onBufferReceived(byte[] buffer) {}

            @Override
            public void onEndOfSpeech() {
                listening = false;
            }

            @Override
            public void onError(int error) {
                listening = false;
                String code = mapErrorCode(error);
                String message = mapErrorMessage(error);
                JSObject payload = new JSObject();
                payload.put("code", code);
                payload.put("message", message);
                notifyListeners(EVENT_ERROR, payload);
                if (activeCall != null) {
                    rejectWithCode(activeCall, code, message);
                    activeCall = null;
                }
                destroyRecognizer();
            }

            @Override
            public void onResults(Bundle results) {
                listening = false;
                String transcript = firstTranscript(results);
                float confidence = firstConfidence(results);
                JSObject payload = new JSObject();
                payload.put("transcript", transcript != null ? transcript : "");
                if (confidence >= 0) {
                    payload.put("confidence", confidence);
                }
                payload.put("isFinal", true);
                notifyListeners(EVENT_FINAL, payload);
                if (activeCall != null) {
                    if (transcript == null || transcript.trim().isEmpty()) {
                        rejectWithCode(activeCall, "no_speech", "No speech heard. Try again.");
                    } else {
                        activeCall.resolve(payload);
                    }
                    activeCall = null;
                }
                destroyRecognizer();
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                String transcript = firstTranscript(partialResults);
                if (transcript == null || transcript.trim().isEmpty()) return;
                JSObject payload = new JSObject();
                payload.put("transcript", transcript);
                payload.put("isFinal", false);
                notifyListeners(EVENT_PARTIAL, payload);
            }

            @Override
            public void onEvent(int eventType, Bundle params) {}
        };
    }

    private String firstTranscript(Bundle results) {
        if (results == null) return null;
        ArrayList<String> list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (list == null || list.isEmpty()) return null;
        return list.get(0);
    }

    private float firstConfidence(Bundle results) {
        if (results == null) return -1f;
        float[] scores = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
        if (scores == null || scores.length == 0) return -1f;
        return scores[0];
    }

    private String mapErrorCode(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "permission_denied";
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "no_speech";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "network_error";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "recognizer_busy";
            case SpeechRecognizer.ERROR_CLIENT:
            case SpeechRecognizer.ERROR_SERVER:
            case SpeechRecognizer.ERROR_AUDIO:
            default:
                return "unavailable";
        }
    }

    private String mapErrorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "Microphone permission denied. Enable Microphone for OrderBhojan in system Settings.";
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "No speech heard. Tap the mic and speak clearly, then pause.";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "Speech recognition needs a network connection. Check connectivity and try again.";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "Speech recognizer is busy. Wait a moment and try again.";
            default:
                return "Speech recognition failed. Try again or type your request.";
        }
    }

    private void rejectWithCode(PluginCall call, String code, String message) {
        JSObject data = new JSObject();
        data.put("code", code);
        data.put("message", message);
        notifyListeners(EVENT_ERROR, data);
        call.reject(message, code, data);
    }

    private void destroyRecognizer() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (Exception ignored) {
                // no-op
            }
            speechRecognizer = null;
        }
        listening = false;
    }

    @Override
    protected void handleOnDestroy() {
        destroyRecognizer();
        activeCall = null;
        super.handleOnDestroy();
    }
}
