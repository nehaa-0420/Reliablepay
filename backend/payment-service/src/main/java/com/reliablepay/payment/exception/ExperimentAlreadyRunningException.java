package com.reliablepay.payment.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class ExperimentAlreadyRunningException extends RuntimeException {
    public ExperimentAlreadyRunningException(String message) {
        super(message);
    }
}
