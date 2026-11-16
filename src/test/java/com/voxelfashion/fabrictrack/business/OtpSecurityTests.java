package com.voxelfashion.fabrictrack.business;
import com.voxelfashion.fabrictrack.business.exception.BusinessProblem;
import com.voxelfashion.fabrictrack.business.security.OtpSecurity;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class OtpSecurityTests {
 @Test void normalizesInternationalNumbers() { assertEquals("+919876543210",OtpSecurity.phone("+91 (98765) 43210")); }
 @Test void rejectsMissingCountryCode() { assertThrows(BusinessProblem.class,()->OtpSecurity.phone("9876543210")); }
 @Test void validatesNames() { assertEquals("Devi",OtpSecurity.name(" Devi ")); assertThrows(BusinessProblem.class,()->OtpSecurity.name(" ")); }
 @Test void codesAlwaysHaveFourDigits() { for(int i=0;i<1000;i++) assertTrue(OtpSecurity.code().matches("[0-9]{4}")); }
 @Test void digestIsBoundToChallengeAndSecret() {
  String a=OtpSecurity.digest("secret-a","challenge-a:0123");
  assertFalse(OtpSecurity.equal(a,OtpSecurity.digest("secret-a","challenge-b:0123")));
  assertFalse(OtpSecurity.equal(a,OtpSecurity.digest("secret-b","challenge-a:0123")));
  assertTrue(OtpSecurity.equal(a,OtpSecurity.digest("secret-a","challenge-a:0123")));
 }
 @Test void sessionTokensAreRandomAndUrlSafe() { String a=OtpSecurity.token(); assertTrue(a.matches("[A-Za-z0-9_-]{43}")); assertNotEquals(a,OtpSecurity.token()); }
}
