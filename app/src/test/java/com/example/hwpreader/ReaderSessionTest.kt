package com.example.hwpreader

import org.junit.Assert.*
import org.junit.Test

class ReaderSessionTest {
    @Test fun passwordWaitPreservesRemainingActiveTime() {
        val s = ReaderSession(); s.start("a", 100, 1000)
        assertTrue(s.pause("a", 400)); assertNull(s.deadline("a"))
        assertFalse(s.expire("a", 100000))
        assertTrue(s.resume("a", 100000)); assertEquals(100700L, s.deadline("a"))
        assertFalse(s.expire("a", 100699)); assertTrue(s.expire("a", 100700))
    }
    @Test fun duplicateOrStaleMessagesCannotExtendDeadline() {
        val s = ReaderSession(); s.start("old", 0, 1000); s.start("new", 20, 1000)
        assertFalse(s.accepts("old")); assertFalse(s.pause("old", 40)); assertFalse(s.resume("new", 50))
        assertEquals(1020L, s.deadline("new")); assertFalse(s.ready("old", 100))
        assertTrue(s.pause("new", 220)); assertFalse(s.pause("new", 400))
        assertTrue(s.resume("new", 2000)); assertFalse(s.resume("new", 2200)); assertEquals(2800L, s.deadline("new"))
    }
    @Test fun lateSuccessCannotOverrideTimeoutOrCancellation() {
        val s = ReaderSession(); s.start("a", 0, 1000)
        assertFalse(s.ready("a", 1000)); assertTrue(s.expire("a", 1000))
        assertFalse(s.accepts("a")); assertFalse(s.ready("a", 1001)); assertFalse(s.expire("a", 2000))
        s.start("b", 0, 1000); s.stop(); assertFalse(s.ready("b", 500)); assertFalse(s.accepts("b"))
    }
    @Test fun readyDocumentHasNoLoadDeadline() {
        val s = ReaderSession(); s.start("a", 0, 1000)
        assertTrue(s.ready("a", 999)); assertTrue(s.accepts("a")); assertNull(s.deadline("a")); assertFalse(s.expire("a", 5000))
    }
    @Test fun automaticRecoveryIsBoundedPerDocument() {
        val s = ReaderSession(); s.newDocument(); s.start("a", 0, 1000)
        assertTrue(s.claimAutomaticRecovery()); s.start("retry", 100, 1000); s.ready("retry", 200)
        assertFalse(s.claimAutomaticRecovery()); s.stop(); assertFalse(s.claimAutomaticRecovery())
        s.resetRecoveryBudget(); assertTrue(s.claimAutomaticRecovery())
        s.newDocument(); assertTrue(s.claimAutomaticRecovery())
    }
}
