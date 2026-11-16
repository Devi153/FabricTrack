package com.vox.businessportal.application;

import com.vox.businessportal.domain.*;
import com.vox.businessportal.domain.Models.*;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OwnerWorkspaceService {
  private final PortalStore store;

  public OwnerWorkspaceService(PortalStore store) {
    this.store = store;
  }

  @Transactional
  public Owner saveProfile(Owner owner, Profile profile) {
    Profile clean =
        new Profile(
            profile.ownerName().trim(),
            profile.businessName().trim(),
            profile.email().trim(),
            profile.city().trim());
    if (clean.ownerName().isEmpty() || clean.businessName().isEmpty())
      throw new PortalException(400, "Your name and business name are required.");
    return store.saveProfile(owner.id(), clean);
  }

  @Transactional(readOnly = true)
  public List<Fabric> listFabrics(Owner owner) {
    requireOnboarded(owner);
    return store.fabrics(owner.id());
  }

  @Transactional
  public Fabric addFabric(Owner owner, NewFabric fabric) {
    requireOnboarded(owner);
    Owner current = store.lockOwner(owner.id());
    if (!current.plan().allowsFabricCount(store.fabricCount(owner.id())))
      throw new PortalException(
          409, "Your plan’s fabric limit has been reached. Use your billing flow to upgrade.");
    NewFabric clean =
        new NewFabric(
            fabric.name().trim(),
            fabric.type().trim(),
            fabric.color().trim(),
            fabric.gsm(),
            fabric.widthInches(),
            fabric.quantityMeters(),
            fabric.costPerMeter(),
            fabric.location().trim());
    if (clean.name().isEmpty() || clean.color().isEmpty())
      throw new PortalException(400, "Fabric name and color are required.");
    return store.insertFabric(owner.id(), clean);
  }

  private void requireOnboarded(Owner owner) {
    if (!owner.onboardingComplete())
      throw new PortalException(409, "Complete your business details before adding fabrics.");
  }
}
