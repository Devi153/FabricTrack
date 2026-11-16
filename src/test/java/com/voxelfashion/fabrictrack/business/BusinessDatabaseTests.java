package com.voxelfashion.fabrictrack.business;
import com.voxelfashion.fabrictrack.business.service.BusinessService;
import com.voxelfashion.fabrictrack.business.repository.BusinessStore;
import com.voxelfashion.fabrictrack.business.exception.BusinessProblem;
import com.voxelfashion.fabrictrack.business.sms.SmsSender;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.mock.env.MockEnvironment;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static com.voxelfashion.fabrictrack.business.repository.BusinessStore.*;
/** Run only against a disposable local Supabase database. Never a production database. */
@EnabledIfEnvironmentVariable(named="TEST_BUSINESS_DB_URL",matches=".+")
class BusinessDatabaseTests {
 BusinessStore store; BusinessService service; String phone; String code;
 @BeforeEach void setup() throws Exception {
  var env=new MockEnvironment()
   .withProperty("business.db-url",System.getenv("TEST_BUSINESS_DB_URL"))
   .withProperty("business.db-user",System.getenv().getOrDefault("TEST_BUSINESS_DB_USER","postgres"))
   .withProperty("business.db-password",System.getenv().getOrDefault("TEST_BUSINESS_DB_PASSWORD","postgres"));
  store=new BusinessStore(env); store.initialize();
  phone="+1555"+String.format("%07d",new java.security.SecureRandom().nextInt(10000000));
  service=new BusinessService(store,new SmsSender(){
   public void send(String p,String c){code=c;}
   public boolean development(){return true;}
  },"integration-test-pepper-32-characters-long");
 }
 @AfterEach void cleanup() throws Exception {
  if(store==null||phone==null)return;
  try(var c=store.open()){
   update(c,"delete from business_private.challenges where phone=?",phone);
   update(c,"delete from business_private.send_events where phone=?",phone);
   update(c,"delete from business_private.accounts where phone=?",phone);
  }
 }
 BusinessService.Challenge start() throws Exception { return service.start(phone,"Test Business","register",phone); }
 @Test void verificationCreatesFreeAccountAndLogoutRevokesSession() throws Exception {
  var challenge=start();var login=service.verify(challenge.challengeId(),code);
  assertEquals("FREE",login.account().plan()); assertEquals("Test Business",login.account().name());
  assertEquals(login.account(),service.authenticate(login.token()));
  assertThrows(BusinessProblem.class,()->service.verify(challenge.challengeId(),code));
  service.logout(login.token()); assertThrows(BusinessProblem.class,()->service.authenticate(login.token()));
 }
 @Test void fifthFailureLocksEvenTheCorrectCode() throws Exception {
  var challenge=start();String wrong=code.equals("0000")?"0001":"0000";
  for(int i=0;i<5;i++)assertThrows(BusinessProblem.class,()->service.verify(challenge.challengeId(),wrong));
  var e=assertThrows(BusinessProblem.class,()->service.verify(challenge.challengeId(),code));assertEquals(429,e.status);
 }
 @Test void expiredCodeCannotCreateAnAccount() throws Exception {
  var challenge=start();
  try(var c=store.open()){update(c,"update business_private.challenges set expires_at=now()-interval '1 second' where id=?",UUID.fromString(challenge.challengeId()));}
  assertThrows(BusinessProblem.class,()->service.verify(challenge.challengeId(),code));
  try(var c=store.open()){assertFalse(exists(c,"select 1 from business_private.accounts where phone=?",phone));}
 }
 @Test void cooldownBlocksAnotherSend() throws Exception {
  start();var e=assertThrows(BusinessProblem.class,this::start);assertEquals(429,e.status);
 }
 @Test void concurrentVerificationConsumesCodeOnce() throws Exception {
  var challenge=start();String otp=code;
  var gate=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)){
   Callable<Boolean> verify=()->{gate.await();try{service.verify(challenge.challengeId(),otp);return true;}catch(BusinessProblem e){return false;}};
   var one=executor.submit(verify);var two=executor.submit(verify);gate.countDown();
   assertNotEquals(one.get(10,TimeUnit.SECONDS),two.get(10,TimeUnit.SECONDS));
  }
 }
 @Test void repeatRegistrationDoesNotRenameAnExistingAccount() throws Exception {
  var first=start();var account=service.verify(first.challengeId(),code).account();
  try(var c=store.open()){update(c,"delete from business_private.send_events where phone=?",phone);}
  var second=service.start(phone,"Different Name","register",phone);
  assertEquals(account,service.verify(second.challengeId(),code).account());
 }
}
