package com.voxelfashion.fabrictrack.business.exception;

public class BusinessProblem extends RuntimeException {
    public final int status;
    public BusinessProblem(int status, String message) { super(message); this.status = status; }
}
