package com.voxelfashion.fabrictrack.business.repository;

import java.sql.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import org.springframework.core.env.Environment;
/** A separate PostgreSQL schema; no writes to Supabase auth.users or admin data. */
public final class BusinessStore {
    private final String url, user, password;
    public BusinessStore(Environment env) {
        url = env.getRequiredProperty("business.db-url");
        user = env.getRequiredProperty("business.db-user");
        password = env.getRequiredProperty("business.db-password");
    }
    public Connection open() throws SQLException { return DriverManager.getConnection(url, user, password); }
    public void initialize() throws Exception {
        try (var input = getClass().getResourceAsStream("/db/business/schema.sql"); var c = open()) {
            if (input == null) throw new IllegalStateException("Missing db/business/schema.sql");
            c.setAutoCommit(false);
            for (String sql : new String(input.readAllBytes(), StandardCharsets.UTF_8).split(";"))
                if (!sql.isBlank()) try (var statement = c.createStatement()) { statement.execute(sql); }
            c.commit();
        }
    }
    public static PreparedStatement query(Connection c, String sql, Object... args) throws SQLException {
        var statement = c.prepareStatement(sql);
        for (int i=0; i<args.length; i++) statement.setObject(i+1, args[i]);
        return statement;
    }
    public static void update(Connection c, String sql, Object... args) throws SQLException {
        try (var s = query(c, sql, args)) { s.executeUpdate(); }
    }
    public static void lock(Connection c, String key) throws SQLException {
        try (var s = query(c, "select pg_advisory_xact_lock(hashtextextended(?, 0))", key)) { s.execute(); }
    }
    public static boolean exists(Connection c, String sql, Object... args) throws SQLException {
        try (var s = query(c, sql, args); var r=s.executeQuery()) { return r.next(); }
    }
}
