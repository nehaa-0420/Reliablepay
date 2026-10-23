package com.reliablepay.mockbank.exception;

public class ChannelFailureException extends RuntimeException {
    public ChannelFailureException(String message) {
        super(message);
    }
}
