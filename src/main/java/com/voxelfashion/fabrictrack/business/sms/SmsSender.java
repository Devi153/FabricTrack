package com.voxelfashion.fabrictrack.business.sms;

public interface SmsSender {
    void send(String phone, String code);
    boolean development();
}
