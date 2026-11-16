package com.voxelfashion.fabrictrack.business.config;
import com.voxelfashion.fabrictrack.business.service.BusinessService;
import com.voxelfashion.fabrictrack.business.exception.BusinessProblem;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import com.voxelfashion.fabrictrack.common.exception.ApiErrorWriter;
import java.util.List;
@Configuration
@ConditionalOnProperty(name="business.enabled",havingValue="true")
public class BusinessSecurity {
    @Bean
    @Order(1)
    SecurityFilterChain businessSecurityFilterChain(HttpSecurity http, BusinessService service, ApiErrorWriter errors) throws Exception {
        var filter = new OncePerRequestFilter() {
            protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request,
                jakarta.servlet.http.HttpServletResponse response, jakarta.servlet.FilterChain chain)
                throws java.io.IOException, jakarta.servlet.ServletException {
                String path=request.getRequestURI().substring(request.getContextPath().length());
                if (path.equals("/api/business/auth/start") || path.equals("/api/business/auth/verify") || path.equals("/api/business/auth/config")) {
                    chain.doFilter(request,response); return;
                }
                String header=request.getHeader("Authorization");
                try {
                    var account=service.authenticate(header!=null && header.startsWith("Bearer ")?header.substring(7):null);
                    var context=SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken(account,null,List.of(new SimpleGrantedAuthority("ROLE_BUSINESS"))));
                    SecurityContextHolder.setContext(context);
                } catch (BusinessProblem e) { errors.write(response,e.status,"BUSINESS_AUTH",e.getMessage()); return; }
                catch (java.sql.SQLException e) { errors.write(response,503,"BUSINESS_UNAVAILABLE","Business service is temporarily unavailable."); return; }
                chain.doFilter(request,response);
            }
        };
        return http.securityMatcher("/api/business/**")
            .csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers("/api/business/auth/start","/api/business/auth/verify","/api/business/auth/config").permitAll()
                .anyRequest().hasRole("BUSINESS"))
            .addFilterBefore(filter,AnonymousAuthenticationFilter.class)
            .exceptionHandling(e->e.authenticationEntryPoint((q,r,x)->errors.write(r,401,"UNAUTHENTICATED","Please sign in.")))
            .build();
    }
}
