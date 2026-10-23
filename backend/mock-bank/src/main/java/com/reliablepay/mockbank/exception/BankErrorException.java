package com.reliablepay.mockbank.exception;

public class BankErrorException extends RuntimeException {
    public BankErrorException(String message) {
        super(message);
    }
}
