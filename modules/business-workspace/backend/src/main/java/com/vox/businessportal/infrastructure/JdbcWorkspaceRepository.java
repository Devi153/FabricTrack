package com.vox.businessportal.infrastructure;

import com.vox.businessportal.application.WorkspaceRepository;
import com.vox.businessportal.domain.PortalException;
import com.vox.businessportal.domain.WorkspaceCollection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
public class JdbcWorkspaceRepository implements WorkspaceRepository {

  private final JdbcTemplate jdbc;
  private final ObjectMapper json;

  private final RowMapper<Map<String, Object>> mapper = this::readRow;

  public JdbcWorkspaceRepository(
          JdbcTemplate jdbc,
          ObjectMapper json) {

    this.jdbc = jdbc;
    this.json = json;
  }

  private String snake(String camel) {
    return camel
            .replaceAll("([a-z])([A-Z])", "$1_$2")
            .toLowerCase(Locale.ROOT);
  }

  private String camel(String name) {
    StringBuilder result = new StringBuilder();
    boolean uppercaseNext = false;

    for (char character : name.toCharArray()) {
      if (character == '_') {
        uppercaseNext = true;
        continue;
      }

      result.append(
              uppercaseNext
                      ? Character.toUpperCase(character)
                      : character);

      uppercaseNext = false;
    }

    return result.toString();
  }

  private Map<String, Object> readRow(
          ResultSet resultSet,
          int rowNumber) throws SQLException {

    Map<String, Object> row = new LinkedHashMap<>();
    var metadata = resultSet.getMetaData();

    for (int index = 1; index <= metadata.getColumnCount(); index++) {
      Object value = resultSet.getObject(index);

      if (value instanceof UUID uuid) {
        value = uuid.toString();
      }

      if (value instanceof Timestamp timestamp) {
        value = timestamp.toInstant().toString();
      }

      if ("jsonb".equals(metadata.getColumnTypeName(index))) {
        try {
          value = json.readValue(
                  resultSet.getString(index),
                  Object.class);
        } catch (Exception exception) {
          throw new IllegalStateException(
                  "Invalid stored JSON",
                  exception);
        }
      }

      row.put(
              camel(metadata.getColumnLabel(index)),
              value);
    }

    return row;
  }

  @Override
  public List<Map<String, Object>> list(
          UUID owner,
          WorkspaceCollection collection) {

    String sql =
            "select * from business_portal."
                    + collection.table
                    + " where owner_id=? order by created_at desc,id";

    return jdbc.query(sql, mapper, owner);
  }

  @Override
  public Map<String, Object> find(
          UUID owner,
          WorkspaceCollection collection,
          UUID id) {

    String sql =
            "select * from business_portal."
                    + collection.table
                    + " where owner_id=? and id=?";

    return jdbc.query(sql, mapper, owner, id)
            .stream()
            .findFirst()
            .orElseThrow(
                    () -> new PortalException(
                            404,
                            "This record was not found in your workspace."));
  }

  private Object value(String key, Object value) {
    if (key.endsWith("Id") && value != null) {
      return UUID.fromString(value.toString());
    }

    if ("measurements".equals(key)) {
      try {
        return json.writeValueAsString(value);
      } catch (Exception exception) {
        throw new IllegalArgumentException(
                "Invalid measurements",
                exception);
      }
    }

    return value;
  }

  private void validate(
          WorkspaceCollection collection,
          Map<String, Object> fields) {

    if (fields.isEmpty()
            || !collection.fields.containsAll(fields.keySet())) {

      throw new IllegalArgumentException(
              "Unsupported workspace fields");
    }
  }

  @Override
  public Map<String, Object> insert(
          UUID owner,
          WorkspaceCollection collection,
          Map<String, Object> values) {

    validate(collection, values);

    UUID id = UUID.randomUUID();
    List<String> keys = new ArrayList<>(values.keySet());
    List<Object> arguments = new ArrayList<>();

    arguments.add(id);
    arguments.add(owner);

    keys.forEach(
            key -> arguments.add(value(key, values.get(key))));

    String columns = String.join(
            ",",
            keys.stream()
                    .map(this::snake)
                    .toList());

    String placeholders = String.join(
            ",",
            keys.stream()
                    .map(key ->
                            "measurements".equals(key)
                                    ? "cast(? as jsonb)"
                                    : "?")
                    .toList());

    String sql =
            "insert into business_portal."
                    + collection.table
                    + "(id,owner_id,"
                    + columns
                    + ") values(?,?,"
                    + placeholders
                    + ")";

    jdbc.update(sql, arguments.toArray());

    return find(owner, collection, id);
  }

  @Override
  public Map<String, Object> update(
          UUID owner,
          WorkspaceCollection collection,
          UUID id,
          Map<String, Object> values) {

    validate(collection, values);

    List<String> keys = new ArrayList<>(values.keySet());
    List<Object> arguments = new ArrayList<>();

    keys.forEach(
            key -> arguments.add(value(key, values.get(key))));

    arguments.add(owner);
    arguments.add(id);

    String assignments = String.join(
            ",",
            keys.stream()
                    .map(key ->
                            snake(key)
                                    + "="
                                    + ("measurements".equals(key)
                                    ? "cast(? as jsonb)"
                                    : "?"))
                    .toList());

    String sql =
            "update business_portal."
                    + collection.table
                    + " set "
                    + assignments
                    + " where owner_id=? and id=?";

    int updatedRows = jdbc.update(sql, arguments.toArray());

    if (updatedRows != 1) {
      throw new PortalException(
              404,
              "This record was not found in your workspace.");
    }

    return find(owner, collection, id);
  }
}