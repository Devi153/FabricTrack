package com.voxelfashion.fabrictrack.business.config;
import com.voxelfashion.fabrictrack.business.service.BusinessService;
import com.voxelfashion.fabrictrack.business.repository.BusinessStore;
import com.voxelfashion.fabrictrack.business.sms.SmsSender;
import com.voxelfashion.fabrictrack.business.sms.ConfiguredSmsSender;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
@Configuration
@ConditionalOnProperty(name="business.enabled",havingValue="true")
public class BusinessConfiguration {
    @Bean(initMethod="initialize") BusinessStore businessStore(Environment e) { return new BusinessStore(e); }
    @Bean SmsSender smsSender(Environment e) { return new ConfiguredSmsSender(e); }
    @Bean BusinessService businessService(BusinessStore db, SmsSender sms, Environment e) {
        return new BusinessService(db,sms,e.getRequiredProperty("business.otp-pepper"));
    }
}
