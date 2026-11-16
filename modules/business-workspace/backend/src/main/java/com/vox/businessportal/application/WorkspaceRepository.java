package com.vox.businessportal.application;

import com.vox.businessportal.domain.WorkspaceCollection;
import java.util.*;

public interface WorkspaceRepository {
  List<Map<String, Object>> list(UUID owner, WorkspaceCollection collection);

  Map<String, Object> find(UUID owner, WorkspaceCollection collection, UUID id);

  Map<String, Object> insert(
      UUID owner, WorkspaceCollection collection, Map<String, Object> values);

  Map<String, Object> update(
      UUID owner, WorkspaceCollection collection, UUID id, Map<String, Object> values);
}
