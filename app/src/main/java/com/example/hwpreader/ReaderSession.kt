package com.example.hwpreader

/** Monotonic active-work budget. Password entry time never consumes the budget. */
internal class ReaderSession {
    enum class State { STOPPED, ACTIVE, WAITING_PASSWORD, READY }
    var state = State.STOPPED
        private set
    var token: String? = null
        private set
    private var remaining = 0L
    private var deadline = 0L
    private var recovered = false

    fun newDocument() { stop(); recovered = false }
    fun start(value: String, now: Long, budget: Long) {
        require(budget > 0)
        token = value; remaining = budget; deadline = now + budget; state = State.ACTIVE
    }
    fun accepts(value: String) = token == value && state != State.STOPPED
    fun deadline(value: String): Long? = if (token == value && state == State.ACTIVE) deadline else null
    fun pause(value: String, now: Long): Boolean {
        if (token != value || state != State.ACTIVE) return false
        remaining = (deadline - now).coerceAtLeast(0)
        if (remaining == 0L) return false
        state = State.WAITING_PASSWORD; return true
    }
    fun resume(value: String, now: Long): Boolean {
        if (token != value || state != State.WAITING_PASSWORD) return false
        deadline = now + remaining; state = State.ACTIVE; return true
    }
    fun ready(value: String, now: Long): Boolean {
        if (token != value || state != State.ACTIVE || now >= deadline) return false
        state = State.READY; return true
    }
    fun expire(value: String, now: Long): Boolean {
        if (token != value || state != State.ACTIVE || now < deadline) return false
        stop(); return true
    }
    fun stop() { state = State.STOPPED; remaining = 0; deadline = 0 }
    fun claimAutomaticRecovery(): Boolean {
        if (recovered) return false
        recovered = true; return true
    }
    fun resetRecoveryBudget() { recovered = false }
}
