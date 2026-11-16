package com.voxelfashion.fabrictrack.auth.dto;
public record AdminProfile(String userId, String email, String role, boolean canManageAdmins) {}
