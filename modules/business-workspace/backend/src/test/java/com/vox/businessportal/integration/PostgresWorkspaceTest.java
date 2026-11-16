package com.vox.businessportal.integration;

import static com.vox.businessportal.domain.WorkspaceCollection.*;
import static org.junit.jupiter.api.Assertions.*;

import com.vox.businessportal.application.*;
import com.vox.businessportal.config.PortalProperties;
import com.vox.businessportal.domain.*;
import com.vox.businessportal.domain.Models.*;
import com.vox.businessportal.domain.WorkspaceRequests.*;
import com.vox.businessportal.infrastructure.*;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import tools.jackson.databind.json.JsonMapper;

/**
 * Integration tests for an isolated PostgreSQL database.
 *
 * Requires BUSINESS_TEST_DB_URL ending with /vox_portal_test.
 * Test data is cleared before every test.
 */
@EnabledIfEnvironmentVariable(
        named = "BUSINESS_TEST_DB_URL",
        matches = ".+/vox_portal_test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PostgresWorkspaceTest {

  private AnnotationConfigApplicationContext context;
  private JdbcTemplate jdbc;
  private PortalStore store;
  private WorkspaceRepository repository;
  private OwnerWorkspaceService inventory;
  private WorkspaceService workspace;
  private BusinessAuthService auth;
  private AtomicReference<String> sentCode = new AtomicReference<>();

  @Configuration
  @EnableTransactionManagement
  static class Config {

    @Bean
    DataSource dataSource() {
      return new DriverManagerDataSource(
              System.getenv("BUSINESS_TEST_DB_URL"),
              "postgres",
              "");
    }

    @Bean
    JdbcTemplate jdbc(DataSource dataSource) {
      return new JdbcTemplate(dataSource);
    }

    @Bean
    PlatformTransactionManager transactionManager(
            DataSource dataSource) {

      return new DataSourceTransactionManager(dataSource);
    }

    @Bean
    PortalStore store(JdbcTemplate jdbc) {
      return new JdbcPortalStore(jdbc);
    }

    @Bean
    WorkspaceRepository repository(JdbcTemplate jdbc) {
      return new JdbcWorkspaceRepository(
              jdbc,
              JsonMapper.builder().build());
    }

    @Bean
    OwnerWorkspaceService inventory(PortalStore store) {
      return new OwnerWorkspaceService(store);
    }

    @Bean
    WorkspaceService workspace(
            PortalStore store,
            WorkspaceRepository repository,
            OwnerWorkspaceService inventory) {

      return new WorkspaceService(
              store,
              repository,
              inventory);
    }

    @Bean
    AtomicReference<String> sent() {
      return new AtomicReference<>();
    }

    @Bean
    BusinessAuthService auth(
            PortalStore store,
            AtomicReference<String> sent) {

      VerificationSender sender = new VerificationSender() {

        @Override
        public VerificationChannel channel() {
          return VerificationChannel.PHONE;
        }

        @Override
        public void send(String phone, String code) {
          sent.set(code);
        }
      };

      PortalProperties properties = new PortalProperties(
              "isolated-test-secret-at-least-32-characters",
              "http://localhost",
              false,
              "",
              "");

      return new BusinessAuthService(
              store,
              List.of(sender),
              new PortalCrypto(properties),
              new PortalTime());
    }
  }

  @BeforeAll
  @SuppressWarnings("unchecked")
  void init() throws Exception {
    context = new AnnotationConfigApplicationContext(Config.class);
    jdbc = context.getBean(JdbcTemplate.class);

    assertEquals(
            "vox_portal_test",
            jdbc.queryForObject(
                    "select current_database()",
                    String.class));

    Path migrationRoot = java.util.stream.Stream.of(
                    Path.of("src/main/resources/db/business-portal"),
                    Path.of("fabrictract/src/main/resources/db/business-portal"),
                    Path.of("database"),
                    Path.of("../database"))
            .filter(Files::isDirectory)
            .findFirst()
            .orElseThrow(
                    () -> new IllegalStateException(
                            "Business Portal migration directory was not found."));

    try (Connection connection =
                 context.getBean(DataSource.class).getConnection();
         Statement statement = connection.createStatement()) {

      statement.execute(
              Files.readString(
                      migrationRoot.resolve("001_business_portal.sql")));

      statement.execute(
              Files.readString(
                      migrationRoot.resolve("002_workspace_features.sql")));
    }

    store = context.getBean(PortalStore.class);
    repository = context.getBean(WorkspaceRepository.class);
    inventory = context.getBean(OwnerWorkspaceService.class);
    workspace = context.getBean(WorkspaceService.class);
    auth = context.getBean(BusinessAuthService.class);
    sentCode = context.getBean(AtomicReference.class);
  }

  @BeforeEach
  void clear() {
    jdbc.execute(
            "truncate table business_portal.owners cascade");

    jdbc.execute(
            "truncate table business_portal.otp_challenges,"
                    + "business_portal.delivery_limits");
  }

  @AfterAll
  void stop() {
    if (context != null) {
      context.close();
    }
  }

  private BigDecimal n(String value) {
    return new BigDecimal(value);
  }

  private Owner owner(String phone, Plan plan) {
    Owner first = store.findOrCreateOwner(phone);

    store.saveProfile(
            first.id(),
            new Profile("Owner", "Studio", "", ""));

    jdbc.update(
            "update business_portal.owners set plan=? where id=?",
            plan.name(),
            first.id());

    return store.lockOwner(first.id());
  }

  private NewFabric fabric() {
    return new NewFabric(
            "Cotton",
            "Cotton",
            "Ivory",
            180,
            n("58"),
            n("100"),
            n("100"),
            "A-01");
  }

  private UUID id(Map<String, Object> record) {
    return UUID.fromString(record.get("id").toString());
  }

  @Test
  void realOtpSessionOnboardingAndEmptyWorkspace() {
    var requested = auth.requestOtp(
            "+919876543210",
            "client");

    assertTrue(sentCode.get().matches("[0-9]{4}"));

    var result = auth.verify(
            requested.challengeId(),
            sentCode.get());

    assertFalse(result.owner().onboardingComplete());

    assertEquals(
            result.owner().id(),
            auth.requireOwner(result.sessionToken()).id());

    var saved = inventory.saveProfile(
            result.owner(),
            new Profile(
                    "Devi",
                    "Devi Textiles",
                    "",
                    "Chennai"));

    assertTrue(inventory.listFabrics(saved).isEmpty());

    assertTrue(
            ((List<?>) workspace.snapshot(saved).get("rolls"))
                    .isEmpty());

    auth.logout(result.sessionToken());

    assertEquals(
            401,
            assertThrows(
                    PortalException.class,
                    () -> auth.requireOwner(result.sessionToken()))
                    .status());
  }

  @Test
  void openingStockCreatesOneRollAndMovement() {
    var owner = owner(
            "+919876543210",
            Plan.FREE);

    var saved = inventory.addFabric(owner, fabric());
    var snapshot = workspace.snapshot(owner);

    assertEquals(
            1,
            ((List<?>) snapshot.get("rolls")).size());

    assertEquals(
            1,
            ((List<?>) snapshot.get("movements")).size());

    assertEquals(
            0,
            n("100").compareTo(
                    inventory.listFabrics(owner)
                            .getFirst()
                            .quantityMeters()));

    assertEquals(
            saved.id().toString(),
            repository.list(owner.id(), ROLLS)
                    .getFirst()
                    .get("fabricId"));
  }

  @Test
  void everyQueryIsScopedToSessionOwner() {
    var firstOwner = owner(
            "+919876543210",
            Plan.FREE);

    var secondOwner = owner(
            "+919876543211",
            Plan.FREE);

    var saved = inventory.addFabric(
            firstOwner,
            fabric());

    assertTrue(
            repository.list(secondOwner.id(), FABRICS)
                    .isEmpty());

    assertEquals(
            404,
            assertThrows(
                    PortalException.class,
                    () -> repository.find(
                            secondOwner.id(),
                            FABRICS,
                            saved.id()))
                    .status());
  }

  @Test
  void reserveProtectsStockAndCompletionConsumesItAtomically() {
    var owner = owner(
            "+919876543210",
            Plan.BUSINESS);

    var saved = inventory.addFabric(owner, fabric());

    var design = workspace.design(
            owner,
            new Design(
                    "Shirt",
                    "V1",
                    saved.id(),
                    List.of(new SizeRow("M", n("1"), 1)),
                    60,
                    n("0")));

    workspace.reserve(owner, id(design));

    var roll = repository.list(owner.id(), ROLLS)
            .getFirst();

    assertEquals(
            409,
            assertThrows(
                    PortalException.class,
                    () -> workspace.move(
                            owner,
                            new Movement(
                                    id(roll),
                                    "OUT",
                                    n("50"),
                                    "attempt")))
                    .status());

    assertEquals(
            0,
            n("100").compareTo(
                    inventory.listFabrics(owner)
                            .getFirst()
                            .quantityMeters()));

    workspace.complete(
            owner,
            id(design),
            new Complete(n("5")));

    assertEquals(
            0,
            n("40").compareTo(
                    inventory.listFabrics(owner)
                            .getFirst()
                            .quantityMeters()));

    assertEquals(
            "COMPLETED",
            repository.find(
                            owner.id(),
                            DESIGNS,
                            id(design))
                    .get("state"));

    assertEquals(
            0,
            n("0").compareTo(
                    new BigDecimal(
                            repository.find(
                                            owner.id(),
                                            ROLLS,
                                            id(roll))
                                    .get("reservedMeters")
                                    .toString())));
  }

  @Test
  void purchaseCreatesRealHistoryAndWeightedCost() {
    var owner = owner(
            "+919876543210",
            Plan.STARTER);

    var saved = inventory.addFabric(owner, fabric());

    var supplier = workspace.addSupplier(
            owner,
            new Supplier("Textiles", "", "", ""));

    workspace.purchase(
            owner,
            new Purchase(
                    id(supplier),
                    saved.id(),
                    "R-02",
                    n("50"),
                    n("200"),
                    "A-02",
                    "LOT-2",
                    "PO-1"));

    var updated = inventory.listFabrics(owner)
            .getFirst();

    assertEquals(
            0,
            n("150").compareTo(updated.quantityMeters()));

    assertEquals(
            0,
            n("133.33").compareTo(updated.costPerMeter()));

    assertEquals(
            1,
            repository.list(owner.id(), PURCHASES).size());

    assertEquals(
            2,
            repository.list(owner.id(), ROLLS).size());

    assertTrue(
            repository.list(owner.id(), MOVEMENTS)
                    .stream()
                    .anyMatch(
                            movement -> new BigDecimal(
                                    movement.get("unitPrice")
                                            .toString())
                                    .compareTo(n("200")) == 0));
  }

  @Test
  void failedVerificationCommitsAttemptCounterAndCannotReuseCode() {
    var requested = auth.requestOtp(
            "+919876543210",
            "client");

    String actual = sentCode.get();
    String wrong = actual.equals("0000") ? "0001" : "0000";

    assertThrows(
            PortalException.class,
            () -> auth.verify(
                    requested.challengeId(),
                    wrong));

    assertEquals(
            1,
            store.findChallenge(requested.challengeId())
                    .orElseThrow()
                    .attempts());

    auth.verify(
            requested.challengeId(),
            actual);

    assertThrows(
            PortalException.class,
            () -> auth.verify(
                    requested.challengeId(),
                    actual));
  }

  @Test
  void freeSupplierLimitAndBusinessGatesAreEnforced() {
    var owner = owner(
            "+919876543210",
            Plan.FREE);

    for (int index = 0; index < 3; index++) {
      workspace.addSupplier(
              owner,
              new Supplier(
                      "Supplier " + index,
                      "",
                      "",
                      ""));
    }

    assertEquals(
            409,
            assertThrows(
                    PortalException.class,
                    () -> workspace.addSupplier(
                            owner,
                            new Supplier("Fourth", "", "", "")))
                    .status());

    assertEquals(
            403,
            assertThrows(
                    PortalException.class,
                    () -> workspace.reserve(
                            owner,
                            UUID.randomUUID()))
                    .status());
  }

  @Test
  void perGarmentDesignLimitsNormalizeNames() {
    var owner = owner(
            "+919876543210",
            Plan.FREE);

    var saved = inventory.addFabric(owner, fabric());

    for (String garment : List.of(" Shirt ", "shirt")) {
      workspace.design(
              owner,
              new Design(
                      garment,
                      "Version",
                      saved.id(),
                      List.of(new SizeRow("All", n("1.5"), 1)),
                      10,
                      n("5")));
    }

    assertEquals(
            409,
            assertThrows(
                    PortalException.class,
                    () -> workspace.design(
                            owner,
                            new Design(
                                    "SHIRT",
                                    "Third",
                                    saved.id(),
                                    List.of(
                                            new SizeRow(
                                                    "All",
                                                    n("1.5"),
                                                    1)),
                                    10,
                                    n("0"))))
                    .status());

    workspace.design(
            owner,
            new Design(
                    "Trousers",
                    "First",
                    saved.id(),
                    List.of(new SizeRow("All", n("1.5"), 1)),
                    10,
                    n("0")));

    assertEquals(
            3,
            repository.list(owner.id(), DESIGNS).size());
  }

  @Test
  void passportUpdateMaintainsOneRecordAndSetsThreshold() {
    var owner = owner(
            "+919876543210",
            Plan.FREE);

    var saved = inventory.addFabric(owner, fabric());

    workspace.passport(
            owner,
            saved.id(),
            new Passport(
                    "100% cotton",
                    n("3"),
                    "L1",
                    "Ivory",
                    "Cold wash",
                    "First",
                    "",
                    n("25"),
                    null));

    workspace.passport(
            owner,
            saved.id(),
            new Passport(
                    "100% cotton",
                    n("3"),
                    "L1",
                    "Ivory",
                    "Cold wash",
                    "Updated",
                    "",
                    n("30"),
                    null));

    assertEquals(
            1,
            repository.list(owner.id(), PASSPORTS).size());

    assertEquals(
            "Updated",
            repository.list(owner.id(), PASSPORTS)
                    .getFirst()
                    .get("notes"));

    assertEquals(
            0,
            n("30").compareTo(
                    new BigDecimal(
                            repository.find(
                                            owner.id(),
                                            FABRICS,
                                            saved.id())
                                    .get("minStockQuantity")
                                    .toString())));
  }

  @Test
  void concurrentFabricAddsCannotExceedFreeLimit() throws Exception {
    var owner = owner(
            "+919876543210",
            Plan.FREE);

    for (int index = 0; index < 4; index++) {
      inventory.addFabric(owner, fabric());
    }

    CountDownLatch start = new CountDownLatch(1);
    AtomicInteger successfulAdds = new AtomicInteger();

    try (var pool = Executors.newFixedThreadPool(2)) {
      List<Future<?>> futures = new ArrayList<>();

      for (int index = 0; index < 2; index++) {
        futures.add(
                pool.submit(
                        () -> {
                          try {
                            start.await();
                            inventory.addFabric(owner, fabric());
                            successfulAdds.incrementAndGet();
                          } catch (PortalException expected) {
                            assertEquals(409, expected.status());
                          } catch (InterruptedException exception) {
                            Thread.currentThread().interrupt();
                            throw new RuntimeException(exception);
                          }
                        }));
      }

      start.countDown();

      for (Future<?> future : futures) {
        future.get(10, TimeUnit.SECONDS);
      }
    }

    assertEquals(1, successfulAdds.get());
    assertEquals(5, inventory.listFabrics(owner).size());
  }

  @Test
  void bulkImportRollsBackEntireBatchAtPlanLimit() {
    var owner = owner(
            "+919876543210",
            Plan.FREE);

    for (int index = 0; index < 4; index++) {
      inventory.addFabric(owner, fabric());
    }

    var record = new FabricInput(
            "Imported",
            "Cotton",
            "White",
            180,
            n("58"),
            n("10"),
            n("10"),
            "");

    assertThrows(
            PortalException.class,
            () -> workspace.importFabrics(
                    owner,
                    new Import(List.of(record, record))));

    assertEquals(
            4,
            inventory.listFabrics(owner).size());

    assertEquals(
            4,
            repository.list(owner.id(), ROLLS).size());
  }

  @Test
  void standardPlanEnforcesHundredFabricsTwentyFiveSuppliersAndFiveDesignsPerGarment() {
    var owner = owner(
            "+919876543210",
            Plan.STARTER);

    for (int index = 0; index < 100; index++) {
      inventory.addFabric(
              owner,
              new NewFabric(
                      "Fabric " + index,
                      "Cotton",
                      "Ivory",
                      180,
                      n("58"),
                      n("0"),
                      n("100"),
                      ""));
    }

    assertEquals(
            409,
            assertThrows(
                    PortalException.class,
                    () -> inventory.addFabric(owner, fabric()))
                    .status());

    for (int index = 0; index < 25; index++) {
      workspace.addSupplier(
              owner,
              new Supplier(
                      "Supplier " + index,
                      "",
                      "",
                      ""));
    }

    assertEquals(
            409,
            assertThrows(
                    PortalException.class,
                    () -> workspace.addSupplier(
                            owner,
                            new Supplier("Supplier 26", "", "", "")))
                    .status());

    UUID fabricId = inventory.listFabrics(owner)
            .getFirst()
            .id();

    var request = new Design(
            "Shirt",
            "Version",
            fabricId,
            List.of(
                    new SizeRow("S", n("1.4"), 1),
                    new SizeRow("M", n("1.6"), 1)),
            1,
            n("0"));

    for (int index = 0; index < 5; index++) {
      workspace.design(owner, request);
    }

    assertEquals(
            409,
            assertThrows(
                    PortalException.class,
                    () -> workspace.design(owner, request))
                    .status());

    assertEquals(
            100,
            inventory.listFabrics(owner).size());

    assertEquals(
            25,
            repository.list(owner.id(), SUPPLIERS).size());

    assertEquals(
            5,
            repository.list(owner.id(), DESIGNS).size());
  }
}