package com.voxelfashion.fabrictrack.common.exception;

public record ApiError(int status, String code, String message) {}
