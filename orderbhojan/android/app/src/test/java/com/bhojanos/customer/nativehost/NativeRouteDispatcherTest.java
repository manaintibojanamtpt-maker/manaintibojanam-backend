package com.bhojanos.customer.nativehost;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class NativeRouteDispatcherTest {
    @Test
    public void parsesTrackPaths() {
        assertEquals("abc123", NativeRouteDispatcher.INSTANCE.parseTrackOrderId("/orders/abc123/track"));
        assertEquals("abc123", NativeRouteDispatcher.INSTANCE.parseTrackOrderId("/orders/abc123/track?phone=99"));
        assertNull(NativeRouteDispatcher.INSTANCE.parseTrackOrderId("/cart"));
    }

    @Test
    public void dispatchRequiresAllGates() {
        assertFalse(NativeRouteDispatcher.INSTANCE.shouldOpenNativeTrack(false, true, true));
        assertFalse(NativeRouteDispatcher.INSTANCE.shouldOpenNativeTrack(true, false, true));
        assertFalse(NativeRouteDispatcher.INSTANCE.shouldOpenNativeTrack(true, true, false));
        assertTrue(NativeRouteDispatcher.INSTANCE.shouldOpenNativeTrack(true, true, true));
    }
}
