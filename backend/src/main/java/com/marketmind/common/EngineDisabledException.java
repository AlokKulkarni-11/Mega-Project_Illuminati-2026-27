package com.marketmind.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class EngineDisabledException extends RuntimeException {
    public EngineDisabledException(String message) {
        super(message);
    }
}
