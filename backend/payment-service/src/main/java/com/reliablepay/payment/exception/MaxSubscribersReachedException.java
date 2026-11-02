package com.reliablepay.payment.exception;

public class MaxSubscribersReachedException extends RuntimeException {
    public MaxSubscribersReachedException(String message) {
        super(message);
    }
}
